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
import request, { fetchIsSupported, } from "../../utils/request";
import warnOnce from "../../utils/warn_once";
import byteRange from "../utils/byte_range";
import inferSegmentContainer from "../utils/infer_segment_container";
import addSegmentIntegrityChecks from "./add_segment_integrity_checks_to_loader";
import constructSegmentUrl from "./construct_segment_url";
import initSegmentLoader from "./init_segment_loader";
import lowLatencySegmentLoader from "./low_latency_segment_loader";
/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @param {Object} context
 * @param {boolean} lowLatencyMode
 * @param {Object} options
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export function regularSegmentLoader(url, context, lowLatencyMode, options, callbacks, cancelSignal) {
    if (context.segment.isInit) {
        return initSegmentLoader(url, context.segment, options, cancelSignal, callbacks);
    }
    const containerType = inferSegmentContainer(context.type, context.mimeType);
    if (lowLatencyMode && (containerType === "mp4" || containerType === undefined)) {
        if (fetchIsSupported()) {
            return lowLatencySegmentLoader(url, context, options, callbacks, cancelSignal);
        }
        else {
            warnOnce("DASH: Your browser does not have the fetch API. You will have " +
                "a higher chance of rebuffering when playing close to the live edge");
        }
    }
    const { segment } = context;
    return request({ url,
        responseType: "arraybuffer",
        headers: segment.range !== undefined ?
            { Range: byteRange(segment.range) } :
            undefined,
        timeout: options.timeout,
        connectionTimeout: options.connectionTimeout,
        cancelSignal,
        onProgress: callbacks.onProgress })
        .then((data) => ({ resultType: "segment-loaded",
        resultData: data }));
}
/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateSegmentLoader({ lowLatencyMode, segmentLoader: customSegmentLoader, checkMediaSegmentIntegrity }) {
    return checkMediaSegmentIntegrity !== true ? segmentLoader :
        addSegmentIntegrityChecks(segmentLoader);
    /**
     * @param {Object|null} wantedCdn
     * @param {Object} context
     * @param {Object} options
     * @param {Object} cancelSignal
     * @param {Object} callbacks
     * @returns {Promise.<Object>}
     */
    function segmentLoader(wantedCdn, context, options, cancelSignal, callbacks) {
        const url = constructSegmentUrl(wantedCdn, context.segment);
        if (url == null) {
            return Promise.resolve({ resultType: "segment-created",
                resultData: null });
        }
        if (lowLatencyMode || customSegmentLoader === undefined) {
            return regularSegmentLoader(url, context, lowLatencyMode, options, callbacks, cancelSignal);
        }
        return new Promise((res, rej) => {
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
                cancelSignal.deregister(abortCustomLoader);
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
                cancelSignal.deregister(abortCustomLoader);
                // Format error and send it
                const castedErr = err;
                const message = (_a = castedErr === null || castedErr === void 0 ? void 0 : castedErr.message) !== null && _a !== void 0 ? _a : "Unknown error when fetching a DASH segment through a " +
                    "custom segmentLoader.";
                const emittedErr = new CustomLoaderError(message, (_b = castedErr === null || castedErr === void 0 ? void 0 : castedErr.canRetry) !== null && _b !== void 0 ? _b : false, castedErr === null || castedErr === void 0 ? void 0 : castedErr.xhr);
                rej(emittedErr);
            };
            const progress = (_args) => {
                if (hasFinished || cancelSignal.isCancelled()) {
                    return;
                }
                callbacks.onProgress({ duration: _args.duration,
                    size: _args.size,
                    totalSize: _args.totalSize });
            };
            /**
             * Callback triggered when the custom segment loader wants to fallback to
             * the "regular" implementation
             */
            const fallback = () => {
                if (hasFinished || cancelSignal.isCancelled()) {
                    return;
                }
                hasFinished = true;
                cancelSignal.deregister(abortCustomLoader);
                regularSegmentLoader(url, context, lowLatencyMode, options, callbacks, cancelSignal)
                    .then(res, rej);
            };
            const customCallbacks = { reject, resolve, progress, fallback };
            let byteRanges;
            if (context.segment.range !== undefined) {
                byteRanges = [context.segment.range];
                if (context.segment.indexRange !== undefined) {
                    byteRanges.push(context.segment.indexRange);
                }
            }
            const args = { isInit: context.segment.isInit,
                timeout: options.timeout,
                byteRanges,
                trackType: context.type,
                url };
            const abort = customSegmentLoader(args, customCallbacks);
            cancelSignal.register(abortCustomLoader);
            /**
             * The logic to run when the custom loader is cancelled while pending.
             * @param {Error} err
             */
            function abortCustomLoader(err) {
                if (hasFinished) {
                    return;
                }
                hasFinished = true;
                if (typeof abort === "function") {
                    abort();
                }
                rej(err);
            }
        });
    }
}
