/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import config from "../../../config";
import { MediaError } from "../../../errors";
import log from "../../../log";
import queueMicrotask from "../../../utils/queue_microtask";
import { createMappedReference, } from "../../../utils/reference";
import SortedList from "../../../utils/sorted_list";
import TaskCanceller from "../../../utils/task_canceller";
import WeakMapMemory from "../../../utils/weak_map_memory";
import { BufferGarbageCollector, } from "../../segment_buffers";
import PeriodStream from "../period";
import getTimeRangesForContent from "./get_time_ranges_for_content";
/**
 * Create and manage the various "Streams" needed for the content to
 * play:
 *
 *   - Create or dispose SegmentBuffers depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SegmentBuffers depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Streams for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Call various callbacks to notify of its health and issues
 *
 * @param {Object} content
 * @param {Object} playbackObserver - Emit position information
 * @param {Object} representationEstimator - Emit bitrate estimates and best
 * Representation to play.
 * @param {Object} segmentBuffersStore - Will be used to lazily create
 * SegmentBuffer instances associated with the current content.
 * @param {Object} segmentFetcherCreator - Allow to download segments.
 * @param {Object} options
 * @param {Object} callbacks - The `StreamOrchestrator` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `StreamOrchestrator` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `StreamOrchestrator`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, or until the `error` callback is called, whichever comes first.
 * @param {Object} orchestratorCancelSignal - `CancellationSignal` allowing,
 * when triggered, to immediately stop all operations the `PeriodStream` is
 * doing.
 */
export default function StreamOrchestrator(content, playbackObserver, representationEstimator, segmentBuffersStore, segmentFetcherCreator, options, callbacks, orchestratorCancelSignal) {
    const { manifest, initialPeriod } = content;
    const { maxBufferAhead, maxBufferBehind, wantedBufferAhead, maxVideoBufferSize } = options;
    const { MINIMUM_MAX_BUFFER_AHEAD, MAXIMUM_MAX_BUFFER_AHEAD, MAXIMUM_MAX_BUFFER_BEHIND } = config.getCurrent();
    // Keep track of a unique BufferGarbageCollector created per
    // SegmentBuffer.
    const garbageCollectors = new WeakMapMemory((segmentBuffer) => {
        var _a, _b;
        const { bufferType } = segmentBuffer;
        const defaultMaxBehind = (_a = MAXIMUM_MAX_BUFFER_BEHIND[bufferType]) !== null && _a !== void 0 ? _a : Infinity;
        const maxAheadHigherBound = (_b = MAXIMUM_MAX_BUFFER_AHEAD[bufferType]) !== null && _b !== void 0 ? _b : Infinity;
        return (gcCancelSignal) => {
            BufferGarbageCollector({ segmentBuffer,
                playbackObserver,
                maxBufferBehind: createMappedReference(maxBufferBehind, (val) => Math.min(val, defaultMaxBehind), gcCancelSignal),
                maxBufferAhead: createMappedReference(maxBufferAhead, (val) => {
                    var _a;
                    const lowerBound = Math.max(val, (_a = MINIMUM_MAX_BUFFER_AHEAD[bufferType]) !== null && _a !== void 0 ? _a : 0);
                    return Math.min(lowerBound, maxAheadHigherBound);
                }, gcCancelSignal) }, gcCancelSignal);
        };
    });
    // Create automatically the right `PeriodStream` for every possible types
    for (const bufferType of segmentBuffersStore.getBufferTypes()) {
        manageEveryStreams(bufferType, initialPeriod);
    }
    /**
     * Manage creation and removal of Streams for every Periods for a given type.
     *
     * Works by creating consecutive Streams through the
     * `manageConsecutivePeriodStreams` function, and restarting it when the
     * current position goes out of the bounds of these Streams.
     * @param {string} bufferType - e.g. "audio" or "video"
     * @param {Period} basePeriod - Initial Period downloaded.
     */
    function manageEveryStreams(bufferType, basePeriod) {
        /** Each Period for which there is currently a Stream, chronologically */
        const periodList = new SortedList((a, b) => a.start - b.start);
        /**
         * When set to `true`, all the currently active PeriodStream will be destroyed
         * and re-created from the new current position if we detect it to be out of
         * their bounds.
         * This is set to false when we're in the process of creating the first
         * PeriodStream, to avoid interferences while no PeriodStream is available.
         */
        let enableOutOfBoundsCheck = false;
        /** Cancels currently created `PeriodStream`s. */
        let currentCanceller = new TaskCanceller();
        currentCanceller.linkToSignal(orchestratorCancelSignal);
        // Restart the current Stream when the wanted time is in another period
        // than the ones already considered
        playbackObserver.listen(({ position }) => {
            var _a;
            const time = position.getWanted();
            if (!enableOutOfBoundsCheck || !isOutOfPeriodList(time)) {
                return;
            }
            log.info("Stream: Destroying all PeriodStreams due to out of bounds situation", bufferType, time);
            enableOutOfBoundsCheck = false;
            while (periodList.length() > 0) {
                const period = periodList.get(periodList.length() - 1);
                periodList.removeElement(period);
                callbacks.periodStreamCleared({ type: bufferType, manifest, period });
            }
            currentCanceller.cancel();
            currentCanceller = new TaskCanceller();
            currentCanceller.linkToSignal(orchestratorCancelSignal);
            const nextPeriod = (_a = manifest.getPeriodForTime(time)) !== null && _a !== void 0 ? _a : manifest.getNextPeriod(time);
            if (nextPeriod === undefined) {
                log.warn("Stream: The wanted position is not found in the Manifest.");
                enableOutOfBoundsCheck = true;
                return;
            }
            launchConsecutiveStreamsForPeriod(nextPeriod);
        }, { clearSignal: orchestratorCancelSignal, includeLastObservation: true });
        manifest.addEventListener("decipherabilityUpdate", (evt) => {
            if (orchestratorCancelSignal.isCancelled()) {
                return;
            }
            onDecipherabilityUpdates(evt).catch(err => {
                if (orchestratorCancelSignal.isCancelled()) {
                    return;
                }
                currentCanceller.cancel();
                callbacks.error(err);
            });
        }, orchestratorCancelSignal);
        return launchConsecutiveStreamsForPeriod(basePeriod);
        /**
         * @param {Object} period
         */
        function launchConsecutiveStreamsForPeriod(period) {
            const consecutivePeriodStreamCb = Object.assign(Object.assign({}, callbacks), { waitingMediaSourceReload(payload) {
                    // Only reload the MediaSource when the more immediately required
                    // Period is the one it is asked for
                    const firstPeriod = periodList.head();
                    if (firstPeriod === undefined ||
                        firstPeriod.id !== payload.period.id) {
                        callbacks.lockedStream({ bufferType: payload.bufferType,
                            period: payload.period });
                    }
                    else {
                        callbacks.needsMediaSourceReload({
                            timeOffset: payload.timeOffset,
                            minimumPosition: payload.stayInPeriod ? payload.period.start : undefined,
                            maximumPosition: payload.stayInPeriod ? payload.period.end : undefined,
                        });
                    }
                },
                periodStreamReady(payload) {
                    enableOutOfBoundsCheck = true;
                    periodList.add(payload.period);
                    callbacks.periodStreamReady(payload);
                },
                periodStreamCleared(payload) {
                    periodList.removeElement(payload.period);
                    callbacks.periodStreamCleared(payload);
                },
                error(err) {
                    currentCanceller.cancel();
                    callbacks.error(err);
                } });
            manageConsecutivePeriodStreams(bufferType, period, consecutivePeriodStreamCb, currentCanceller.signal);
        }
        /**
         * Returns true if the given time is either:
         *   - less than the start of the chronologically first Period
         *   - more than the end of the chronologically last Period
         * @param {number} time
         * @returns {boolean}
         */
        function isOutOfPeriodList(time) {
            const head = periodList.head();
            const last = periodList.last();
            if (head == null || last == null) { // if no period
                return true;
            }
            return head.start > time ||
                (last.end == null ? Infinity :
                    last.end) < time;
        }
        /**
         * React to a Manifest's decipherability updates.
         * @param {Array.<Object>} updates
         * @returns {Promise}
         */
        async function onDecipherabilityUpdates(updates) {
            const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
            const ofCurrentType = updates
                .filter(update => update.adaptation.type === bufferType);
            if (
            // No update concerns the current type of data
            ofCurrentType.length === 0 ||
                segmentBufferStatus.type !== "initialized" ||
                // The update only notifies of now-decipherable streams
                ofCurrentType.every(x => x.representation.decipherable === true)) {
                // Data won't have to be removed from the buffers, no need to stop the
                // current Streams.
                return;
            }
            const segmentBuffer = segmentBufferStatus.value;
            const resettedContent = ofCurrentType.filter(update => update.representation.decipherable === undefined);
            const undecipherableContent = ofCurrentType.filter(update => update.representation.decipherable === false);
            /**
             * Time ranges now containing undecipherable content.
             * Those should first be removed and, depending on the platform, may
             * need Supplementary actions as playback issues may remain even after
             * removal.
             */
            const undecipherableRanges = getTimeRangesForContent(segmentBuffer, undecipherableContent);
            /**
             * Time ranges now containing content whose decipherability status came
             * back to being unknown.
             * To simplify its handling, those are just removed from the buffer.
             * Less considerations have to be taken than for the `undecipherableRanges`.
             */
            const rangesToRemove = getTimeRangesForContent(segmentBuffer, resettedContent);
            // First close all Stream currently active so they don't continue to
            // load and push segments.
            enableOutOfBoundsCheck = false;
            log.info("Stream: Destroying all PeriodStreams for decipherability matters", bufferType);
            while (periodList.length() > 0) {
                const period = periodList.get(periodList.length() - 1);
                periodList.removeElement(period);
                callbacks.periodStreamCleared({ type: bufferType, manifest, period });
            }
            currentCanceller.cancel();
            currentCanceller = new TaskCanceller();
            currentCanceller.linkToSignal(orchestratorCancelSignal);
            /** Remove from the `SegmentBuffer` all the concerned time ranges. */
            for (const { start, end } of [...undecipherableRanges, ...rangesToRemove]) {
                if (orchestratorCancelSignal.isCancelled()) {
                    return;
                }
                if (start < end) {
                    if (orchestratorCancelSignal.isCancelled()) {
                        return;
                    }
                    await segmentBuffer.removeBuffer(start, end);
                }
            }
            // Schedule micro task before checking the last playback observation
            // to reduce the risk of race conditions where the next observation
            // was going to be emitted synchronously.
            queueMicrotask(() => {
                if (orchestratorCancelSignal.isCancelled()) {
                    return;
                }
                const observation = playbackObserver.getReference().getValue();
                if (needsFlushingAfterClean(observation, undecipherableRanges)) {
                    // Bind to Period start and end
                    callbacks.needsDecipherabilityFlush();
                    if (orchestratorCancelSignal.isCancelled()) {
                        return;
                    }
                }
                else if (needsFlushingAfterClean(observation, rangesToRemove)) {
                    callbacks.needsBufferFlush();
                    if (orchestratorCancelSignal.isCancelled()) {
                        return;
                    }
                }
                const lastPosition = observation.position.getWanted();
                const newInitialPeriod = manifest.getPeriodForTime(lastPosition);
                if (newInitialPeriod == null) {
                    callbacks.error(new MediaError("MEDIA_TIME_NOT_FOUND", "The wanted position is not found in the Manifest."));
                    return;
                }
                launchConsecutiveStreamsForPeriod(newInitialPeriod);
            });
        }
    }
    /**
     * Create lazily consecutive PeriodStreams:
     *
     * It first creates the `PeriodStream` for `basePeriod` and - once it becomes
     * full - automatically creates the next chronological one.
     * This process repeats until the `PeriodStream` linked to the last Period is
     * full.
     *
     * If an "old" `PeriodStream` becomes active again, it destroys all
     * `PeriodStream` coming after it (from the last chronological one to the
     * first).
     *
     * To clean-up PeriodStreams, each one of them are also automatically
     * destroyed once the current position is superior or equal to the end of
     * the concerned Period.
     *
     * The "periodStreamReady" callback is alled each times a new `PeriodStream`
     * is created.
     *
     * The "periodStreamCleared" callback is called each times a PeriodStream is
     * destroyed (this callback is though not called if it was destroyed due to
     * the given `cancelSignal` emitting or due to a fatal error).
     * @param {string} bufferType - e.g. "audio" or "video"
     * @param {Period} basePeriod - Initial Period downloaded.
     * @param {Object} consecutivePeriodStreamCb - Callbacks called on various
     * events. See type for more information.
     * @param {Object} cancelSignal - `CancellationSignal` allowing to stop
     * everything that this function was doing. Callbacks in
     * `consecutivePeriodStreamCb` might still be sent as a consequence of this
     * signal emitting.
     */
    function manageConsecutivePeriodStreams(bufferType, basePeriod, consecutivePeriodStreamCb, cancelSignal) {
        log.info("Stream: Creating new Stream for", bufferType, basePeriod.start);
        /**
         * Contains properties linnked to the next chronological `PeriodStream` that
         * may be created here.
         */
        let nextStreamInfo = null;
        /** Emits when the `PeriodStream` linked to `basePeriod` should be destroyed. */
        const currentStreamCanceller = new TaskCanceller();
        currentStreamCanceller.linkToSignal(cancelSignal);
        // Stop current PeriodStream when the current position goes over the end of
        // that Period.
        playbackObserver.listen(({ position }, stopListeningObservations) => {
            if (basePeriod.end !== undefined && position.getWanted() >= basePeriod.end) {
                const nextPeriod = manifest.getPeriodAfter(basePeriod);
                // Handle special wantedPosition === basePeriod.end cases
                if (basePeriod.containsTime(position.getWanted(), nextPeriod)) {
                    return;
                }
                log.info("Stream: Destroying PeriodStream as the current playhead moved above it", bufferType, basePeriod.start, position.getWanted(), basePeriod.end);
                stopListeningObservations();
                consecutivePeriodStreamCb.periodStreamCleared({ type: bufferType,
                    manifest,
                    period: basePeriod });
                currentStreamCanceller.cancel();
            }
        }, { clearSignal: cancelSignal, includeLastObservation: true });
        const periodStreamArgs = { bufferType,
            content: { manifest, period: basePeriod },
            garbageCollectors,
            maxVideoBufferSize,
            segmentFetcherCreator,
            segmentBuffersStore,
            options,
            playbackObserver,
            representationEstimator,
            wantedBufferAhead };
        const periodStreamCallbacks = Object.assign(Object.assign({}, consecutivePeriodStreamCb), { streamStatusUpdate(value) {
                if (value.hasFinishedLoading) {
                    const nextPeriod = manifest.getPeriodAfter(basePeriod);
                    if (nextPeriod !== null) {
                        // current Stream is full, create the next one if not
                        checkOrCreateNextPeriodStream(nextPeriod);
                    }
                }
                else if (nextStreamInfo !== null) {
                    // current Stream is active, destroy next Stream if created
                    log.info("Stream: Destroying next PeriodStream due to current one being active", bufferType, nextStreamInfo.period.start);
                    consecutivePeriodStreamCb
                        .periodStreamCleared({ type: bufferType,
                        manifest,
                        period: nextStreamInfo.period });
                    nextStreamInfo.canceller.cancel();
                    nextStreamInfo = null;
                }
                consecutivePeriodStreamCb.streamStatusUpdate(value);
            },
            error(err) {
                if (nextStreamInfo !== null) {
                    nextStreamInfo.canceller.cancel();
                    nextStreamInfo = null;
                }
                currentStreamCanceller.cancel();
                consecutivePeriodStreamCb.error(err);
            } });
        PeriodStream(periodStreamArgs, periodStreamCallbacks, currentStreamCanceller.signal);
        handleUnexpectedManifestUpdates(currentStreamCanceller.signal);
        /**
         * Create `PeriodStream` for the next Period, specified under `nextPeriod`.
         * @param {Object} nextPeriod
         */
        function checkOrCreateNextPeriodStream(nextPeriod) {
            if (nextStreamInfo !== null) {
                if (nextStreamInfo.period.id === nextPeriod.id) {
                    return;
                }
                log.warn("Stream: Creating next `PeriodStream` while one was already created.", bufferType, nextPeriod.id, nextStreamInfo.period.id);
                consecutivePeriodStreamCb.periodStreamCleared({ type: bufferType,
                    manifest,
                    period: nextStreamInfo.period });
                nextStreamInfo.canceller.cancel();
            }
            const nextStreamCanceller = new TaskCanceller();
            nextStreamCanceller.linkToSignal(cancelSignal);
            nextStreamInfo = { canceller: nextStreamCanceller,
                period: nextPeriod };
            manageConsecutivePeriodStreams(bufferType, nextPeriod, consecutivePeriodStreamCb, nextStreamInfo.canceller.signal);
        }
        /**
         * Check on Manifest updates that the Manifest still appears coherent
         * regarding its internal Period structure to what we created for now,
         * handling cases where it does not.
         * @param {Object} innerCancelSignal - When that cancel signal emits, stop
         * performing checks.
         */
        function handleUnexpectedManifestUpdates(innerCancelSignal) {
            manifest.addEventListener("manifestUpdate", updates => {
                // If current period has been unexpectedly removed, ask to reload
                for (const period of updates.removedPeriods) {
                    if (period.id === basePeriod.id) {
                        // Check that this was not just one  of the earliests Periods that
                        // was removed, in which case this is a normal cleanup scenario
                        if (manifest.periods.length > 0 &&
                            manifest.periods[0].start <= period.start) {
                            // We begin by scheduling a micro-task to reduce the possibility of race
                            // conditions where the inner logic would be called synchronously before
                            // the next observation (which may reflect very different playback
                            // conditions) is actually received.
                            return queueMicrotask(() => {
                                if (innerCancelSignal.isCancelled()) {
                                    return;
                                }
                                return callbacks.needsMediaSourceReload({ timeOffset: 0,
                                    minimumPosition: undefined,
                                    maximumPosition: undefined });
                            });
                        }
                    }
                    else if (period.start > basePeriod.start) {
                        break;
                    }
                }
                if (updates.addedPeriods.length > 0) {
                    // If the next period changed, cancel the next created one if one
                    if (nextStreamInfo !== null) {
                        const newNextPeriod = manifest.getPeriodAfter(basePeriod);
                        if (newNextPeriod === null ||
                            nextStreamInfo.period.id !== newNextPeriod.id) {
                            log.warn("Stream: Destroying next PeriodStream due to new one being added", bufferType, nextStreamInfo.period.start);
                            consecutivePeriodStreamCb
                                .periodStreamCleared({ type: bufferType,
                                manifest,
                                period: nextStreamInfo.period });
                            nextStreamInfo.canceller.cancel();
                            nextStreamInfo = null;
                        }
                    }
                }
            }, innerCancelSignal);
        }
    }
}
/**
 * Returns `true` if low-level buffers have to be "flushed" after the given
 * `cleanedRanges` time ranges have been removed from an audio or video
 * SourceBuffer, to prevent playback issues.
 * @param {Object} observation
 * @param {Array.<Object>} cleanedRanges
 * @returns {boolean}
 */
function needsFlushingAfterClean(observation, cleanedRanges) {
    if (cleanedRanges.length === 0) {
        return false;
    }
    const curPos = observation.position.getPolled();
    // Based on the playback direction, we just check whether we may encounter
    // the corresponding ranges, without seeking or re-switching playback
    // direction which is expected to lead to a low-level flush anyway.
    // There's a 5 seconds security, just to be sure.
    return observation.speed >= 0 ?
        cleanedRanges[cleanedRanges.length - 1].end >= curPos - 5 :
        cleanedRanges[0].start <= curPos + 5;
}
