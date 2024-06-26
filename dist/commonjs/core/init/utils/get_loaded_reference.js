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
var compat_1 = require("../../../compat");
var reference_1 = require("../../../utils/reference");
var task_canceller_1 = require("../../../utils/task_canceller");
/**
 * Returns an `IReadOnlySharedReference` that switches to `true` once the
 * content is considered loaded (i.e. once it can begin to be played).
 * @param {Object} playbackObserver
 * @param {HTMLMediaElement} mediaElement
 * @param {boolean} isDirectfile - `true` if this is a directfile content
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function getLoadedReference(playbackObserver, mediaElement, isDirectfile, cancelSignal) {
    var listenCanceller = new task_canceller_1.default();
    listenCanceller.linkToSignal(cancelSignal);
    var isLoaded = new reference_1.default(false, listenCanceller.signal);
    playbackObserver.listen(function (observation) {
        if (observation.rebuffering !== null ||
            observation.freezing !== null ||
            observation.readyState === 0) {
            return;
        }
        if (!(0, compat_1.shouldWaitForDataBeforeLoaded)(isDirectfile, mediaElement.hasAttribute("playsinline"))) {
            if (mediaElement.duration > 0) {
                isLoaded.setValue(true);
                listenCanceller.cancel();
                return;
            }
        }
        var minReadyState = (0, compat_1.shouldWaitForHaveEnoughData)() ? 4 :
            3;
        if (observation.readyState >= minReadyState) {
            if (observation.currentRange !== null || observation.ended) {
                if (!(0, compat_1.shouldValidateMetadata)() || mediaElement.duration > 0) {
                    isLoaded.setValue(true);
                    listenCanceller.cancel();
                    return;
                }
            }
        }
    }, { includeLastObservation: true, clearSignal: listenCanceller.signal });
    return isLoaded;
}
exports.default = getLoadedReference;
