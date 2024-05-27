"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBufferedDataPerMediaBuffer = exports.getPendingPaused = exports.updateWantedPositionIfAfterManifest = void 0;
var manifest_1 = require("../../../manifest");
var array_find_1 = require("../../../utils/array_find");
var reference_1 = require("../../../utils/reference");
var task_canceller_1 = require("../../../utils/task_canceller");
/**
 * Create PlaybackObserver for the core part of the code.
 * @param {Object} srcPlaybackObserver - Base `PlaybackObserver` from which we
 * will derive information.
 * @param {Object} context - Various information linked to the current content
 * being played.
 * @param {Object} fnCancelSignal - Abort the created PlaybackObserver.
 * @returns {Object}
 */
function createCorePlaybackObserver(srcPlaybackObserver, _a, fnCancelSignal) {
    var autoPlay = _a.autoPlay, initialPlayPerformed = _a.initialPlayPerformed, manifest = _a.manifest, mediaSource = _a.mediaSource, speed = _a.speed, textDisplayer = _a.textDisplayer;
    return srcPlaybackObserver.deriveReadOnlyObserver(function transform(observationRef, parentObserverCancelSignal) {
        var canceller = new task_canceller_1.default();
        canceller.linkToSignal(parentObserverCancelSignal);
        canceller.linkToSignal(fnCancelSignal);
        var newRef = new reference_1.default(constructCorePlaybackObservation(), canceller.signal);
        // TODO there might be subtle unexpected behavior here as updating the
        // speed will send observation which may be outdated at the time it is sent
        speed.onUpdate(emitCorePlaybackObservation, {
            clearSignal: canceller.signal,
            emitCurrentValue: false,
        });
        observationRef.onUpdate(emitCorePlaybackObservation, {
            clearSignal: canceller.signal,
            emitCurrentValue: false,
        });
        return newRef;
        function constructCorePlaybackObservation() {
            var observation = observationRef.getValue();
            var lastSpeed = speed.getValue();
            updateWantedPositionIfAfterManifest(observation, manifest);
            return {
                // TODO more exact according to the current Adaptation chosen?
                maximumPosition: (0, manifest_1.getMaximumSafePosition)(manifest),
                bufferGap: observation.bufferGap,
                position: observation.position,
                buffered: getBufferedDataPerMediaBuffer(mediaSource, textDisplayer),
                duration: observation.duration,
                rebuffering: observation.rebuffering,
                freezing: observation.freezing,
                paused: { last: observation.paused,
                    pending: getPendingPaused(initialPlayPerformed, autoPlay) },
                readyState: observation.readyState,
                speed: lastSpeed,
            };
        }
        function emitCorePlaybackObservation() {
            newRef.setValue(constructCorePlaybackObservation());
        }
    });
}
exports.default = createCorePlaybackObserver;
function updateWantedPositionIfAfterManifest(observation, manifest) {
    if (!manifest.isDynamic || manifest.isLastPeriodKnown) {
        // HACK: When the position is actually further than the maximum
        // position for a finished content, we actually want to be loading
        // the last segment before ending.
        // For now, this behavior is implicitely forced by making as if we
        // want to seek one second before the period's end (despite never
        // doing it).
        var lastPeriod = manifest.periods[manifest.periods.length - 1];
        if (lastPeriod !== undefined && lastPeriod.end !== undefined) {
            var wantedPosition = observation.position.getWanted();
            if (wantedPosition >= lastPeriod.start &&
                wantedPosition >= lastPeriod.end - 1) {
                // We're after the end of the last Period, check if `buffered`
                // indicates that the last segment is probably not loaded, in which
                // case act as if we want to load one second before the end.
                var buffered = observation.buffered;
                if (buffered.length === 0 ||
                    buffered.end(buffered.length - 1) < observation.duration - 1) {
                    observation.position.forceWantedPosition(lastPeriod.end - 1);
                }
            }
        }
    }
}
exports.updateWantedPositionIfAfterManifest = updateWantedPositionIfAfterManifest;
function getPendingPaused(initialPlayPerformed, autoPlay) {
    return initialPlayPerformed.getValue() ? undefined :
        !autoPlay;
}
exports.getPendingPaused = getPendingPaused;
function getBufferedDataPerMediaBuffer(mediaSourceInterface, textDisplayer) {
    var buffered = {
        audio: null,
        video: null,
        text: null,
    };
    if (textDisplayer !== null) {
        buffered.text = textDisplayer.getBufferedRanges();
    }
    if (mediaSourceInterface === null) {
        return buffered;
    }
    var audioBuffer = (0, array_find_1.default)(mediaSourceInterface.sourceBuffers, function (s) { return s.type === "audio" /* SourceBufferType.Audio */; });
    var videoBuffer = (0, array_find_1.default)(mediaSourceInterface.sourceBuffers, function (s) { return s.type === "video" /* SourceBufferType.Video */; });
    var audioBuffered = audioBuffer === null || audioBuffer === void 0 ? void 0 : audioBuffer.getBuffered();
    if (audioBuffered !== undefined) {
        buffered.audio = audioBuffered;
    }
    var videoBuffered = videoBuffer === null || videoBuffer === void 0 ? void 0 : videoBuffer.getBuffered();
    if (videoBuffered !== undefined) {
        buffered.video = videoBuffered;
    }
    return buffered;
}
exports.getBufferedDataPerMediaBuffer = getBufferedDataPerMediaBuffer;
