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
exports.isLoadedState = exports.getLoadedContentState = exports.constructPlayerStateReference = exports.emitPlayPauseEvents = exports.emitSeekEvents = void 0;
var config_1 = require("../../config");
var array_includes_1 = require("../../utils/array_includes");
var reference_1 = require("../../utils/reference");
/**
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} playbackObserver - Observes playback conditions on
 * `mediaElement`.
 * @param {function} onSeeking - Callback called when a seeking operation starts
 * on `mediaElement`.
 * @param {function} onSeeked - Callback called when a seeking operation ends
 * on `mediaElement`.
 * @param {Object} cancelSignal - When triggered, stop calling callbacks and
 * remove all listeners this function has registered.
 */
function emitSeekEvents(mediaElement, playbackObserver, onSeeking, onSeeked, cancelSignal) {
    if (cancelSignal.isCancelled() || mediaElement === null) {
        return;
    }
    var wasSeeking = playbackObserver.getReference().getValue().seeking === 2 /* SeekingState.External */;
    if (wasSeeking) {
        onSeeking();
        if (cancelSignal.isCancelled()) {
            return;
        }
    }
    playbackObserver.listen(function (obs) {
        if (obs.event === "seeking") {
            wasSeeking = true;
            onSeeking();
        }
        else if (wasSeeking && obs.event === "seeked") {
            wasSeeking = false;
            onSeeked();
        }
    }, { includeLastObservation: true, clearSignal: cancelSignal });
}
exports.emitSeekEvents = emitSeekEvents;
/**
 * @param {HTMLMediaElement} mediaElement
 * @param {function} onPlay - Callback called when a play operation has started
 * on `mediaElement`.
 * @param {function} onPause - Callback called when a pause operation has
 * started on `mediaElement`.
 * @param {Object} cancelSignal - When triggered, stop calling callbacks and
 * remove all listeners this function has registered.
 */
function emitPlayPauseEvents(mediaElement, onPlay, onPause, cancelSignal) {
    if (cancelSignal.isCancelled() || mediaElement === null) {
        return;
    }
    mediaElement.addEventListener("play", onPlay);
    mediaElement.addEventListener("pause", onPause);
    cancelSignal.register(function () {
        mediaElement.removeEventListener("play", onPlay);
        mediaElement.removeEventListener("pause", onPause);
    });
}
exports.emitPlayPauseEvents = emitPlayPauseEvents;
function constructPlayerStateReference(initializer, mediaElement, playbackObserver, cancelSignal) {
    var playerStateRef = new reference_1.default("LOADING" /* PLAYER_STATES.LOADING */, cancelSignal);
    initializer.addEventListener("loaded", function () {
        if (playerStateRef.getValue() === "LOADING" /* PLAYER_STATES.LOADING */) {
            playerStateRef.setValue("LOADED" /* PLAYER_STATES.LOADED */);
            if (!cancelSignal.isCancelled()) {
                var newState = getLoadedContentState(mediaElement, null);
                if (newState !== "PAUSED" /* PLAYER_STATES.PAUSED */) {
                    playerStateRef.setValue(newState);
                }
            }
        }
        else if (playerStateRef.getValue() === "RELOADING" /* PLAYER_STATES.RELOADING */) {
            playerStateRef.setValue(getLoadedContentState(mediaElement, null));
        }
        else {
            updateStateIfLoaded(null);
        }
    }, cancelSignal);
    initializer.addEventListener("reloadingMediaSource", function () {
        if (isLoadedState(playerStateRef.getValue())) {
            playerStateRef.setValueIfChanged("RELOADING" /* PLAYER_STATES.RELOADING */);
        }
    }, cancelSignal);
    /**
     * Keep track of the last known stalling situation.
     * `null` if playback is not stalled.
     */
    var prevStallReason = null;
    initializer.addEventListener("stalled", function (s) {
        if (s !== prevStallReason) {
            updateStateIfLoaded(s);
            prevStallReason = s;
        }
    }, cancelSignal);
    initializer.addEventListener("unstalled", function () {
        if (prevStallReason !== null) {
            updateStateIfLoaded(null);
            prevStallReason = null;
        }
    }, cancelSignal);
    playbackObserver.listen(function (observation) {
        if ((0, array_includes_1.default)(["seeking", "ended", "play", "pause"], observation.event)) {
            updateStateIfLoaded(prevStallReason);
        }
    }, { clearSignal: cancelSignal });
    return playerStateRef;
    function updateStateIfLoaded(stallRes) {
        if (!isLoadedState(playerStateRef.getValue())) {
            return;
        }
        var newState = getLoadedContentState(mediaElement, stallRes);
        var prevState = playerStateRef.getValue();
        // Some safety checks to avoid having nonsense state switches
        if (prevState === "LOADED" /* PLAYER_STATES.LOADED */ && newState === "PAUSED" /* PLAYER_STATES.PAUSED */) {
            return;
        }
        playerStateRef.setValueIfChanged(newState);
    }
}
exports.constructPlayerStateReference = constructPlayerStateReference;
/**
 * Get state string for a _loaded_ content.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} stalledStatus - Current stalled state:
 *   - null when not stalled
 *   - a description of the situation if stalled.
 * @returns {string}
 */
function getLoadedContentState(mediaElement, stalledStatus) {
    var FORCED_ENDED_THRESHOLD = config_1.default.getCurrent().FORCED_ENDED_THRESHOLD;
    if (mediaElement.ended) {
        return "ENDED" /* PLAYER_STATES.ENDED */;
    }
    if (stalledStatus !== null) {
        // On some old browsers (e.g. Chrome 54), the browser does not
        // emit an 'ended' event in some conditions. Detect if we
        // reached the end by comparing the current position and the
        // duration instead.
        var gapBetweenDurationAndCurrentTime = Math.abs(mediaElement.duration -
            mediaElement.currentTime);
        if (FORCED_ENDED_THRESHOLD != null &&
            gapBetweenDurationAndCurrentTime < FORCED_ENDED_THRESHOLD) {
            return "ENDED" /* PLAYER_STATES.ENDED */;
        }
        return stalledStatus === "seeking" ? "SEEKING" /* PLAYER_STATES.SEEKING */ :
            stalledStatus === "freezing" ? "FREEZING" /* PLAYER_STATES.FREEZING */ :
                "BUFFERING" /* PLAYER_STATES.BUFFERING */;
    }
    return mediaElement.paused ? "PAUSED" /* PLAYER_STATES.PAUSED */ :
        "PLAYING" /* PLAYER_STATES.PLAYING */;
}
exports.getLoadedContentState = getLoadedContentState;
function isLoadedState(state) {
    return state !== "LOADING" /* PLAYER_STATES.LOADING */ &&
        state !== "RELOADING" /* PLAYER_STATES.RELOADING */ &&
        state !== "STOPPED" /* PLAYER_STATES.STOPPED */;
}
exports.isLoadedState = isLoadedState;
