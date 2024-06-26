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
import TaskCanceller from "../../utils/task_canceller";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import inferSegmentContainer from "../utils/infer_segment_container";
/**
 * Add multiple checks on the response given by the `segmentLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} segmentLoader
 * @returns {Function}
 */
export default function addSegmentIntegrityChecks(segmentLoader) {
    return (url, context, loaderOptions, initialCancelSignal, callbacks) => {
        return new Promise((resolve, reject) => {
            const requestCanceller = new TaskCanceller();
            const unlinkCanceller = requestCanceller.linkToSignal(initialCancelSignal);
            requestCanceller.signal.register(reject);
            segmentLoader(url, context, loaderOptions, requestCanceller.signal, Object.assign(Object.assign({}, callbacks), { onNewChunk(data) {
                    try {
                        trowOnIntegrityError(data);
                        callbacks.onNewChunk(data);
                    }
                    catch (err) {
                        // Do not reject with a `CancellationError` after cancelling the request
                        cleanUpCancellers();
                        // Cancel the request
                        requestCanceller.cancel();
                        // Reject with thrown error
                        reject(err);
                    }
                } }))
                .then((info) => {
                cleanUpCancellers();
                if (requestCanceller.isUsed()) {
                    return;
                }
                if (info.resultType === "segment-loaded") {
                    try {
                        trowOnIntegrityError(info.resultData.responseData);
                    }
                    catch (err) {
                        reject(err);
                        return;
                    }
                }
                resolve(info);
            }, (err) => {
                cleanUpCancellers();
                reject(err);
            });
            function cleanUpCancellers() {
                requestCanceller.signal.deregister(reject);
                unlinkCanceller();
            }
        });
        /**
         * If the data's seems to be corrupted, throws an `INTEGRITY_ERROR` error.
         * @param {*} data
         */
        function trowOnIntegrityError(data) {
            if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array) ||
                inferSegmentContainer(context.type, context.mimeType) !== "mp4") {
                return;
            }
            checkISOBMFFIntegrity(new Uint8Array(data), context.segment.isInit);
        }
    };
}
