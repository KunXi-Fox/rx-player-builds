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
import { CustomLoaderError } from "../../errors";
import createCancellablePromise from "../../utils/create_cancellable_promise";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
/**
 * @param {Function} customSegmentLoader
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function loadInitSegment(customSegmentLoader, cancelSignal) {
    return createCancellablePromise(cancelSignal, (res, rej) => {
        /** `true` when the custom segmentLoader should not be active anymore. */
        let hasFinished = false;
        /**
         * Callback triggered when the custom segment loader has a response.
         * @param {Object} _args
         */
        const resolve = (_args) => {
            if (hasFinished || cancelSignal.isCancelled()) {
                return;
            }
            hasFinished = true;
            res({ resultType: "segment-loaded",
                resultData: { responseData: _args.data,
                    size: _args.size,
                    requestDuration: _args.duration } });
        };
        /**
         * Callback triggered when the custom segment loader fails
         * @param {*} err - The corresponding error encountered
         */
        const reject = (err) => {
            if (hasFinished || cancelSignal.isCancelled()) {
                return;
            }
            hasFinished = true;
            rej(err);
        };
        const abort = customSegmentLoader({ resolve, reject });
        /** The logic to run when this loader is cancelled while pending. */
        return () => {
            if (hasFinished) {
                return;
            }
            hasFinished = true;
            if (typeof abort === "function") {
                abort();
            }
        };
    });
}
/**
 * @param {Object} segment
 * @param {Function} customSegmentLoader
 * @param {Object} cancelSignal
 * @returns {Promise.<Object>}
 */
function loadSegment(segment, customSegmentLoader, cancelSignal) {
    return createCancellablePromise(cancelSignal, (res, rej) => {
        /** `true` when the custom segmentLoader should not be active anymore. */
        let hasFinished = false;
        /**
         * Callback triggered when the custom segment loader has a response.
         * @param {Object} _args
         */
        const resolve = (_args) => {
            if (hasFinished || cancelSignal.isCancelled()) {
                return;
            }
            hasFinished = true;
            res({ resultType: "segment-loaded",
                resultData: { responseData: _args.data,
                    size: _args.size,
                    requestDuration: _args.duration } });
        };
        /**
         * Callback triggered when the custom segment loader fails
         * @param {*} err - The corresponding error encountered
         */
        const reject = (err) => {
            var _a, _b;
            if (hasFinished || cancelSignal.isCancelled()) {
                return;
            }
            hasFinished = true;
            // Format error and send it
            const castedErr = err;
            const message = (_a = castedErr === null || castedErr === void 0 ? void 0 : castedErr.message) !== null && _a !== void 0 ? _a : "Unknown error when fetching a local segment through a " +
                "custom segmentLoader.";
            const emittedErr = new CustomLoaderError(message, (_b = castedErr === null || castedErr === void 0 ? void 0 : castedErr.canRetry) !== null && _b !== void 0 ? _b : false, castedErr === null || castedErr === void 0 ? void 0 : castedErr.xhr);
            rej(emittedErr);
        };
        const abort = customSegmentLoader(segment, { resolve, reject });
        /** The logic to run when this loader is cancelled while pending. */
        return () => {
            if (hasFinished) {
                return;
            }
            hasFinished = true;
            if (typeof abort === "function") {
                abort();
            }
        };
    });
}
/**
 * Generic segment loader for the local Manifest.
 * @param {string | null} _wantedCdn
 * @param {Object} content
 * @param {Object} cancelSignal
 * @param {Object} _callbacks
 * @returns {Promise}
 */
export default function segmentLoader(_wantedCdn, content, _loaderOptions, // TODO use timeout?
cancelSignal, _callbacks) {
    const { segment } = content;
    const privateInfos = segment.privateInfos;
    if (segment.isInit) {
        if (privateInfos === undefined ||
            isNullOrUndefined(privateInfos.localManifestInitSegment)) {
            throw new Error("Segment is not a local Manifest segment");
        }
        return loadInitSegment(privateInfos.localManifestInitSegment.load, cancelSignal);
    }
    if (privateInfos === undefined ||
        isNullOrUndefined(privateInfos.localManifestSegment)) {
        throw new Error("Segment is not an local Manifest segment");
    }
    return loadSegment(privateInfos.localManifestSegment.segment, privateInfos.localManifestSegment.load, cancelSignal);
}
