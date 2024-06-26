import config from "../../../../config";
import { MediaError, OtherError, } from "../../../../errors";
import features from "../../../../features";
import log from "../../../../log";
import Manifest, { Adaptation, Period, Representation, } from "../../../../manifest";
import MainCodecSupportProber from "../../../../mse/main_codec_support_prober";
import WorkerCodecSupportProber from "../../../../mse/worker_codec_support_prober";
import DashWasmParser from "../../../../parsers/manifest/dash/wasm-parser";
import createDashPipelines from "../../../../transports/dash";
import arrayFind from "../../../../utils/array_find";
import assert, { assertUnreachable, } from "../../../../utils/assert";
import { mainThreadTimestampDiff } from "../../../../utils/monotonic_timestamp";
import objectAssign from "../../../../utils/object_assign";
import SharedReference from "../../../../utils/reference";
import TaskCanceller from "../../../../utils/task_canceller";
import { ObservationPosition } from "../../../api/playback_observer";
import StreamOrchestrator from "../../../stream";
/* eslint-disable-next-line max-len */
import createContentTimeBoundariesObserver from "../../utils/create_content_time_boundaries_observer";
import { getBufferedDataPerMediaBuffer, } from "../../utils/create_core_playback_observer";
import ContentPreparer from "./content_preparer";
import { limitVideoResolution, maxBufferAhead, maxBufferBehind, maxVideoBufferSize, throttleVideoBitrate, wantedBufferAhead, } from "./globals";
import sendMessage, { formatErrorForSender, } from "./send_message";
import WorkerPlaybackObserver from "./worker_playback_observer";
export default function initializeWorkerPortal() {
    /**
     * `true` once the worker has been initialized.
     * Allow to enforce the fact that it is only initialized once.
     */
    let isInitialized = false;
    /**
     * Abstraction allowing to load contents (fetching its manifest as
     * well as creating and reloading its MediaSource).
     *
     * Creating a default one which may change on initialization.
     */
    let contentPreparer = new ContentPreparer({
        hasMseInWorker: false,
        hasVideo: true,
    });
    /**
     * Abort all operations relative to the currently loaded content.
     * `null` when there's no loaded content currently or when it is reloaidng.
     */
    let currentLoadedContentTaskCanceller = null;
    // Initialize Manually a `DashWasmParser` and add the feature.
    // TODO allow worker-side feature-switching? Not sure how
    const dashWasmParser = new DashWasmParser();
    features.dashParsers.wasm = dashWasmParser;
    features.transports.dash = createDashPipelines;
    /**
     * When set, emit playback observation made on the main thread.
     */
    let playbackObservationRef = null;
    onmessage = function (e) {
        var _a, _b, _c;
        log.debug("Worker: received message", e.data.type);
        const msg = e.data;
        switch (msg.type) {
            case "init" /* MainThreadMessageType.Init */:
                assert(!isInitialized);
                isInitialized = true;
                const diffMain = msg.value.date - msg.value.timestamp;
                /* eslint-disable-next-line no-restricted-properties */
                const diffWorker = Date.now() - performance.now();
                mainThreadTimestampDiff.setValueIfChanged(diffWorker - diffMain);
                updateLoggerLevel(msg.value.logLevel, msg.value.sendBackLogs);
                dashWasmParser.initialize({ wasmUrl: msg.value.dashWasmUrl }).then(() => {
                    sendMessage({ type: "init-success" /* WorkerMessageType.InitSuccess */,
                        value: null });
                }, (err) => {
                    const error = err instanceof Error ?
                        err.toString() :
                        "Unknown Error";
                    log.error("Worker: Could not initialize DASH_WASM parser", error);
                    sendMessage({ type: "init-error" /* WorkerMessageType.InitError */,
                        value: { errorMessage: error,
                            kind: "dashWasmInitialization" } });
                });
                if (!msg.value.hasVideo || msg.value.hasMseInWorker) {
                    contentPreparer.disposeCurrentContent();
                    contentPreparer = new ContentPreparer({
                        hasMseInWorker: msg.value.hasMseInWorker,
                        hasVideo: msg.value.hasVideo,
                    });
                }
                features.codecSupportProber = msg.value.hasMseInWorker ?
                    MainCodecSupportProber :
                    WorkerCodecSupportProber;
                break;
            case "log-level-update" /* MainThreadMessageType.LogLevelUpdate */:
                updateLoggerLevel(msg.value.logLevel, msg.value.sendBackLogs);
                break;
            case "prepare" /* MainThreadMessageType.PrepareContent */:
                prepareNewContent(contentPreparer, msg.value);
                break;
            case "start" /* MainThreadMessageType.StartPreparedContent */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (msg.contentId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.contentId)) {
                    return;
                }
                if (currentLoadedContentTaskCanceller !== null) {
                    currentLoadedContentTaskCanceller.cancel();
                    currentLoadedContentTaskCanceller = null;
                }
                const currentCanceller = new TaskCanceller();
                const currentContentObservationRef = new SharedReference(objectAssign(msg.value.initialObservation, {
                    position: new ObservationPosition(...msg.value.initialObservation.position),
                }));
                playbackObservationRef = currentContentObservationRef;
                currentLoadedContentTaskCanceller = currentCanceller;
                currentLoadedContentTaskCanceller.signal.register(() => {
                    currentContentObservationRef.finish();
                });
                loadOrReloadPreparedContent(msg.value, contentPreparer, currentContentObservationRef, currentCanceller.signal);
                break;
            }
            case "observation" /* MainThreadMessageType.PlaybackObservation */: {
                const currentContent = contentPreparer.getCurrentContent();
                if (msg.contentId !== (currentContent === null || currentContent === void 0 ? void 0 : currentContent.contentId)) {
                    return;
                }
                const observation = msg.value;
                const { buffered } = observation;
                const newBuffered = getBufferedDataPerMediaBuffer(currentContent.mediaSource, null);
                if (newBuffered.audio !== null) {
                    buffered.audio = newBuffered.audio;
                }
                if (newBuffered.video !== null) {
                    buffered.video = newBuffered.video;
                }
                playbackObservationRef === null || playbackObservationRef === void 0 ? void 0 : playbackObservationRef.setValue(objectAssign(observation, {
                    position: new ObservationPosition(...msg.value.position),
                }));
                break;
            }
            case "ref-update" /* MainThreadMessageType.ReferenceUpdate */:
                updateGlobalReference(msg);
                break;
            case "stop" /* MainThreadMessageType.StopContent */:
                if (msg.contentId !== ((_a = contentPreparer.getCurrentContent()) === null || _a === void 0 ? void 0 : _a.contentId)) {
                    return;
                }
                contentPreparer.disposeCurrentContent();
                if (currentLoadedContentTaskCanceller !== null) {
                    currentLoadedContentTaskCanceller.cancel();
                    currentLoadedContentTaskCanceller = null;
                }
                break;
            case "sb-success" /* MainThreadMessageType.SourceBufferSuccess */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                const { sourceBuffers } = preparedContent.mediaSource;
                const sourceBuffer = arrayFind(sourceBuffers, (s) => s.type === msg.sourceBufferType);
                if (sourceBuffer === undefined) {
                    log.info("WP: Success for an unknown SourceBuffer", msg.sourceBufferType);
                    return;
                }
                if (sourceBuffer.onOperationSuccess === undefined) {
                    log.warn("WP: A SourceBufferInterface with MSE performed a cross-thread operation", msg.sourceBufferType);
                    return;
                }
                sourceBuffer.onOperationSuccess(msg.operationId, msg.value.buffered);
                break;
            }
            case "sb-error" /* MainThreadMessageType.SourceBufferError */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                const { sourceBuffers } = preparedContent.mediaSource;
                const sourceBuffer = arrayFind(sourceBuffers, (s) => s.type === msg.sourceBufferType);
                if (sourceBuffer === undefined) {
                    log.info("WP: Error for an unknown SourceBuffer", msg.sourceBufferType);
                    return;
                }
                if (sourceBuffer.onOperationFailure === undefined) {
                    log.warn("WP: A SourceBufferInterface with MSE performed a cross-thread operation", msg.sourceBufferType);
                    return;
                }
                sourceBuffer.onOperationFailure(msg.operationId, msg.value);
                break;
            }
            case "media-source-ready-state-change" /* MainThreadMessageType.MediaSourceReadyStateChange */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (msg.mediaSourceId !== (preparedContent === null || preparedContent === void 0 ? void 0 : preparedContent.mediaSource.id)) {
                    return;
                }
                if (preparedContent.mediaSource.onMediaSourceReadyStateChanged === undefined) {
                    log.warn("WP: A MediaSourceInterface with MSE performed a cross-thread operation");
                    return;
                }
                preparedContent.mediaSource.onMediaSourceReadyStateChanged(msg.value);
                break;
            }
            case "decipherability-update" /* MainThreadMessageType.DecipherabilityStatusUpdate */: {
                if (msg.contentId !== ((_b = contentPreparer.getCurrentContent()) === null || _b === void 0 ? void 0 : _b.contentId)) {
                    return;
                }
                const currentContent = contentPreparer.getCurrentContent();
                if (currentContent === null || currentContent.manifest === null) {
                    return;
                }
                const updates = msg.value;
                currentContent.manifest.updateRepresentationsDeciperability((content) => {
                    for (const update of updates) {
                        if (content.representation.uniqueId === update.representationUniqueId) {
                            return update.decipherable;
                        }
                    }
                    return content.representation.decipherable;
                });
                break;
            }
            case "codec-support-update" /* MainThreadMessageType.CodecSupportUpdate */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.manifest === null) {
                    return;
                }
                if (typeof ((_c = features.codecSupportProber) === null || _c === void 0 ? void 0 : _c.updateCache) === "function") {
                    for (const { mimeType, codec, result } of msg.value) {
                        features.codecSupportProber.updateCache(mimeType, codec, result);
                    }
                }
                try {
                    const warning = preparedContent.manifest.refreshCodecSupport(msg.value);
                    if (warning !== null) {
                        sendMessage({ type: "warning" /* WorkerMessageType.Warning */,
                            contentId: preparedContent.contentId,
                            value: formatErrorForSender(warning) });
                    }
                }
                catch (err) {
                    sendMessage({ type: "error" /* WorkerMessageType.Error */,
                        contentId: preparedContent.contentId,
                        value: formatErrorForSender(err) });
                }
                break;
            }
            case "urls-update" /* MainThreadMessageType.ContentUrlsUpdate */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.manifestFetcher.updateContentUrls(msg.value.urls, msg.value.refreshNow);
                break;
            }
            case "track-update" /* MainThreadMessageType.TrackUpdate */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.trackChoiceSetter.setTrack(msg.value.periodId, msg.value.bufferType, msg.value.choice);
                break;
            }
            case "rep-update" /* MainThreadMessageType.RepresentationUpdate */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                preparedContent.trackChoiceSetter.updateRepresentations(msg.value.periodId, msg.value.adaptationId, msg.value.bufferType, msg.value.choice);
                break;
            }
            case "add-text-success" /* MainThreadMessageType.PushTextDataSuccess */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log.error("WP: Added text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onPushedTrackSuccess(msg.value.ranges);
                break;
            }
            case "push-text-error" /* MainThreadMessageType.PushTextDataError */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log.error("WP: Added text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onPushedTrackError(new Error(msg.value.message));
                break;
            }
            case "remove-text-success" /* MainThreadMessageType.RemoveTextDataSuccess */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log.error("WP: Removed text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onRemoveSuccess(msg.value.ranges);
                break;
            }
            case "remove-text-error" /* MainThreadMessageType.RemoveTextDataError */: {
                const preparedContent = contentPreparer.getCurrentContent();
                if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
                    return;
                }
                if (preparedContent.workerTextSender === null) {
                    log.error("WP: Removed text track but text track aren't enabled");
                    return;
                }
                preparedContent.workerTextSender.onRemoveError(new Error(msg.value.message));
                break;
            }
            default: assertUnreachable(msg);
        }
    };
}
function prepareNewContent(contentPreparer, contentInitData) {
    contentPreparer.initializeNewContent(contentInitData).then((manifest) => {
        sendMessage({ type: "manifest-ready" /* WorkerMessageType.ManifestReady */,
            contentId: contentInitData.contentId,
            value: { manifest } });
    }, (err) => {
        sendMessage({ type: "error" /* WorkerMessageType.Error */,
            contentId: contentInitData.contentId,
            value: formatErrorForSender(err) });
    });
}
function updateGlobalReference(msg) {
    switch (msg.value.name) {
        case "wantedBufferAhead":
            wantedBufferAhead.setValueIfChanged(msg.value.newVal);
            break;
        case "maxVideoBufferSize":
            maxVideoBufferSize.setValueIfChanged(msg.value.newVal);
            break;
        case "maxBufferBehind":
            maxBufferBehind.setValueIfChanged(msg.value.newVal);
            break;
        case "maxBufferAhead":
            maxBufferAhead.setValueIfChanged(msg.value.newVal);
            break;
        case "limitVideoResolution":
            limitVideoResolution.setValueIfChanged(msg.value.newVal);
            break;
        case "throttleVideoBitrate":
            throttleVideoBitrate.setValueIfChanged(msg.value.newVal);
            break;
        default:
            assertUnreachable(msg.value);
    }
}
function loadOrReloadPreparedContent(val, contentPreparer, playbackObservationRef, parentCancelSignal) {
    var _a;
    const currentLoadCanceller = new TaskCanceller();
    currentLoadCanceller.linkToSignal(parentCancelSignal);
    /**
     * Stores last discontinuity update sent to the worker for each Period and type
     * combinations, at least until the corresponding `PeriodStreamCleared`
     * message.
     *
     * This is an optimization to avoid sending too much discontinuity messages to
     * the main thread when it is not needed because nothing changed.
     */
    const lastSentDiscontinuitiesStore = new Map();
    const preparedContent = contentPreparer.getCurrentContent();
    if (preparedContent === null || preparedContent.manifest === null) {
        const error = new OtherError("NONE", "Loading content when none is prepared");
        sendMessage({ type: "error" /* WorkerMessageType.Error */,
            contentId: undefined,
            value: formatErrorForSender(error) });
        return;
    }
    const { contentId, manifest, mediaSource, representationEstimator, segmentBuffersStore, segmentFetcherCreator } = preparedContent;
    const { drmSystemId, enableFastSwitching, initialTime, onCodecSwitch } = val;
    playbackObservationRef.onUpdate((observation) => {
        if (preparedContent.decipherabilityFreezeDetector.needToReload(observation)) {
            handleMediaSourceReload({ timeOffset: 0,
                minimumPosition: 0,
                maximumPosition: Infinity });
        }
        // Synchronize SegmentBuffers with what has been buffered.
        ["video", "audio", "text"].forEach(tType => {
            var _a;
            const segmentBufferStatus = segmentBuffersStore.getStatus(tType);
            if (segmentBufferStatus.type === "initialized") {
                segmentBufferStatus.value.synchronizeInventory((_a = observation.buffered[tType]) !== null && _a !== void 0 ? _a : []);
            }
        });
    });
    const initialPeriod = (_a = manifest.getPeriodForTime(initialTime)) !== null && _a !== void 0 ? _a : manifest.getNextPeriod(initialTime);
    if (initialPeriod === undefined) {
        const error = new MediaError("MEDIA_STARTING_TIME_NOT_FOUND", "Wanted starting time not found in the Manifest.");
        sendMessage({ type: "error" /* WorkerMessageType.Error */,
            contentId,
            value: formatErrorForSender(error) });
        return;
    }
    const playbackObserver = new WorkerPlaybackObserver(playbackObservationRef, contentId, currentLoadCanceller.signal);
    const contentTimeBoundariesObserver = createContentTimeBoundariesObserver(manifest, mediaSource, playbackObserver, segmentBuffersStore, {
        onWarning: (err) => sendMessage({ type: "warning" /* WorkerMessageType.Warning */,
            contentId,
            value: formatErrorForSender(err) }),
        onPeriodChanged: (period) => {
            sendMessage({
                type: "active-period-changed" /* WorkerMessageType.ActivePeriodChanged */,
                contentId,
                value: { periodId: period.id },
            });
        },
    }, currentLoadCanceller.signal);
    StreamOrchestrator({ initialPeriod: manifest.periods[0],
        manifest }, playbackObserver, representationEstimator, segmentBuffersStore, segmentFetcherCreator, { wantedBufferAhead,
        maxVideoBufferSize,
        maxBufferAhead,
        maxBufferBehind,
        drmSystemId,
        enableFastSwitching,
        onCodecSwitch }, handleStreamOrchestratorCallbacks(), currentLoadCanceller.signal);
    /**
     * Returns Object handling the callbacks from a `StreamOrchestrator`, which
     * are basically how it communicates about events.
     * @returns {Object}
     */
    function handleStreamOrchestratorCallbacks() {
        return {
            needsBufferFlush(payload) {
                sendMessage({
                    type: "needs-buffer-flush" /* WorkerMessageType.NeedsBufferFlush */,
                    contentId,
                    value: payload,
                });
            },
            streamStatusUpdate(value) {
                sendDiscontinuityUpdateIfNeeded(value);
                // If the status for the last Period indicates that segments are all loaded
                // or on the contrary that the loading resumed, announce it to the
                // ContentTimeBoundariesObserver.
                if (manifest.isLastPeriodKnown &&
                    value.period.id === manifest.periods[manifest.periods.length - 1].id) {
                    const hasFinishedLoadingLastPeriod = value.hasFinishedLoading ||
                        value.isEmptyStream;
                    if (hasFinishedLoadingLastPeriod) {
                        contentTimeBoundariesObserver
                            .onLastSegmentFinishedLoading(value.bufferType);
                    }
                    else {
                        contentTimeBoundariesObserver
                            .onLastSegmentLoadingResume(value.bufferType);
                    }
                }
            },
            needsManifestRefresh() {
                contentPreparer.scheduleManifestRefresh({
                    enablePartialRefresh: true,
                    canUseUnsafeMode: true,
                });
            },
            manifestMightBeOufOfSync() {
                const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config.getCurrent();
                contentPreparer.scheduleManifestRefresh({
                    enablePartialRefresh: false,
                    canUseUnsafeMode: false,
                    delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
                });
            },
            lockedStream(payload) {
                sendMessage({
                    type: "locked-stream" /* WorkerMessageType.LockedStream */,
                    contentId,
                    value: {
                        periodId: payload.period.id,
                        bufferType: payload.bufferType,
                    },
                });
            },
            adaptationChange(value) {
                var _a, _b;
                contentTimeBoundariesObserver.onAdaptationChange(value.type, value.period, value.adaptation);
                if (currentLoadCanceller.signal.isCancelled()) {
                    return;
                }
                sendMessage({
                    type: "adaptation-changed" /* WorkerMessageType.AdaptationChanged */,
                    contentId,
                    value: {
                        adaptationId: (_b = (_a = value.adaptation) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
                        periodId: value.period.id,
                        type: value.type,
                    },
                });
            },
            representationChange(value) {
                var _a, _b;
                contentTimeBoundariesObserver.onRepresentationChange(value.type, value.period);
                if (currentLoadCanceller.signal.isCancelled()) {
                    return;
                }
                sendMessage({
                    type: "representation-changed" /* WorkerMessageType.RepresentationChanged */,
                    contentId,
                    value: {
                        adaptationId: value.adaptation.id,
                        representationId: (_b = (_a = value.representation) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
                        periodId: value.period.id,
                        type: value.type,
                    },
                });
            },
            inbandEvent(value) {
                sendMessage({
                    type: "inband-event" /* WorkerMessageType.InbandEvent */,
                    contentId,
                    value,
                });
            },
            warning(value) {
                sendMessage({ type: "warning" /* WorkerMessageType.Warning */,
                    contentId,
                    value: formatErrorForSender(value) });
            },
            periodStreamReady(value) {
                if (preparedContent === null) {
                    return;
                }
                preparedContent.trackChoiceSetter.addTrackSetter(value.period.id, value.type, value.adaptationRef);
                sendMessage({ type: "period-stream-ready" /* WorkerMessageType.PeriodStreamReady */,
                    contentId,
                    value: { periodId: value.period.id,
                        bufferType: value.type } });
            },
            periodStreamCleared(value) {
                if (preparedContent === null) {
                    return;
                }
                const periodDiscontinuitiesStore = lastSentDiscontinuitiesStore.get(value.period);
                if (periodDiscontinuitiesStore !== undefined) {
                    periodDiscontinuitiesStore.delete(value.type);
                    if (periodDiscontinuitiesStore.size === 0) {
                        lastSentDiscontinuitiesStore.delete(value.period);
                    }
                }
                preparedContent.trackChoiceSetter.removeTrackSetter(value.period.id, value.type);
                sendMessage({ type: "period-stream-cleared" /* WorkerMessageType.PeriodStreamCleared */,
                    contentId,
                    value: { periodId: value.period.id,
                        bufferType: value.type } });
            },
            bitrateEstimateChange(payload) {
                // TODO for low-latency contents it is __VERY__ frequent.
                // Considering this is only for an unimportant undocumented API, we may
                // throttle such messages. (e.g. max one per 2 seconds for each type?).
                sendMessage({
                    type: "bitrate-estimate-change" /* WorkerMessageType.BitrateEstimateChange */,
                    contentId,
                    value: {
                        bitrate: payload.bitrate,
                        bufferType: payload.type,
                    },
                });
            },
            needsMediaSourceReload(payload) {
                handleMediaSourceReload(payload);
            },
            needsDecipherabilityFlush() {
                sendMessage({ type: "needs-decipherability-flush" /* WorkerMessageType.NeedsDecipherabilityFlush */,
                    contentId,
                    value: null });
            },
            encryptionDataEncountered(values) {
                for (const value of values) {
                    const originalContent = value.content;
                    const content = Object.assign({}, originalContent);
                    if (content.manifest instanceof Manifest) {
                        content.manifest = content.manifest.getMetadataSnapshot();
                    }
                    if (content.period instanceof Period) {
                        content.period = content.period.getMetadataSnapshot();
                    }
                    if (content.adaptation instanceof Adaptation) {
                        content.adaptation = content.adaptation.getMetadataSnapshot();
                    }
                    if (content.representation instanceof Representation) {
                        content.representation = content.representation.getMetadataSnapshot();
                    }
                    sendMessage({ type: "encryption-data-encountered" /* WorkerMessageType.EncryptionDataEncountered */,
                        contentId,
                        value: { keyIds: value.keyIds,
                            values: value.values,
                            content,
                            type: value.type } });
                }
            },
            error(error) {
                sendMessage({ type: "error" /* WorkerMessageType.Error */,
                    contentId,
                    value: formatErrorForSender(error) });
            },
        };
    }
    function sendDiscontinuityUpdateIfNeeded(value) {
        const { imminentDiscontinuity } = value;
        let periodMap = lastSentDiscontinuitiesStore.get(value.period);
        const sentObjInfo = periodMap === null || periodMap === void 0 ? void 0 : periodMap.get(value.bufferType);
        if (sentObjInfo !== undefined) {
            if (sentObjInfo.discontinuity === null) {
                if (imminentDiscontinuity === null) {
                    return;
                }
            }
            else if (imminentDiscontinuity !== null &&
                sentObjInfo.discontinuity.start === imminentDiscontinuity.start &&
                sentObjInfo.discontinuity.end === imminentDiscontinuity.end) {
                return;
            }
        }
        if (periodMap === undefined) {
            periodMap = new Map();
            lastSentDiscontinuitiesStore.set(value.period, periodMap);
        }
        const msgObj = { periodId: value.period.id,
            bufferType: value.bufferType,
            discontinuity: value.imminentDiscontinuity,
            position: value.position };
        periodMap.set(value.bufferType, msgObj);
        sendMessage({ type: "discontinuity-update" /* WorkerMessageType.DiscontinuityUpdate */,
            contentId,
            value: msgObj });
    }
    function handleMediaSourceReload(payload) {
        // TODO more precize one day?
        const lastObservation = playbackObservationRef.getValue();
        const newInitialTime = lastObservation.position.getWanted();
        if (currentLoadCanceller !== null) {
            currentLoadCanceller.cancel();
        }
        contentPreparer.reloadMediaSource(payload).then(() => {
            loadOrReloadPreparedContent({ initialTime: newInitialTime,
                drmSystemId: val.drmSystemId,
                enableFastSwitching: val.enableFastSwitching,
                onCodecSwitch: val.onCodecSwitch }, contentPreparer, playbackObservationRef, parentCancelSignal);
        }, (err) => {
            sendMessage({ type: "error" /* WorkerMessageType.Error */,
                contentId,
                value: formatErrorForSender(err) });
        });
    }
}
function updateLoggerLevel(logLevel, sendBackLogs) {
    if (!sendBackLogs) {
        log.setLevel(logLevel);
    }
    else {
        log.setLevel(logLevel, (levelStr, logs) => {
            const sentLogs = logs.map((e) => {
                if (e instanceof Error) {
                    return formatErrorForSender(e);
                }
                return e;
            });
            // Not relying on `sendMessage` as it also logs
            postMessage({
                type: "log" /* WorkerMessageType.LogMessage */,
                value: {
                    logLevel: levelStr,
                    logs: sentLogs,
                },
            });
        });
    }
}
