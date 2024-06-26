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
import { MediaSource_ } from "../../../compat";
import { resetMediaElement } from "../../../core/init/utils/create_media_source";
import log from "../../../log";
import MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import createCancellablePromise from "../../../utils/create_cancellable_promise";
import idGenerator from "../../../utils/id_generator";
import isNonEmptyString from "../../../utils/is_non_empty_string";
const generateMediaSourceId = idGenerator();
/**
 * Open the media source and create the `MainMediaSourceInterface`.
 * @param {HTMLVideoElement} videoElement
 * @param {string} codec
 * @param {Object} cleanUpSignal
 * @returns {Promise.<Object>}
 */
export default function prepareSourceBuffer(videoElement, codec, cleanUpSignal) {
    return createCancellablePromise(cleanUpSignal, (resolve, reject) => {
        if (MediaSource_ == null) {
            throw new Error("No MediaSource Object was found in the current browser.");
        }
        // make sure the media has been correctly reset
        const oldSrc = isNonEmptyString(videoElement.src) ? videoElement.src :
            null;
        resetMediaElement(videoElement, oldSrc);
        log.info("Init: Creating MediaSource");
        const mediaSource = new MainMediaSourceInterface(generateMediaSourceId());
        if (mediaSource.handle.type === "handle") {
            videoElement.srcObject = mediaSource.handle.value;
            cleanUpSignal.register(() => {
                resetMediaElement(videoElement, null);
            });
        }
        else {
            const objectURL = URL.createObjectURL(mediaSource.handle.value);
            log.info("Init: Attaching MediaSource URL to the media element", objectURL);
            videoElement.src = objectURL;
            cleanUpSignal.register(() => {
                resetMediaElement(videoElement, objectURL);
            });
        }
        mediaSource.addEventListener("mediaSourceOpen", onSourceOpen);
        return () => {
            mediaSource.removeEventListener("mediaSourceOpen", onSourceOpen);
        };
        function onSourceOpen() {
            try {
                mediaSource.removeEventListener("mediaSourceOpen", onSourceOpen);
                resolve(mediaSource.addSourceBuffer("video" /* SourceBufferType.Video */, codec));
            }
            catch (err) {
                reject(err);
            }
        }
    });
}
