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
import { CustomLoaderError, isKnownError, NetworkErrorTypes, } from "../../../errors";
import log from "../../../log";
import cancellableSleep from "../../../utils/cancellable_sleep";
import getFuzzedDelay from "../../../utils/get_fuzzed_delay";
import getTimestamp from "../../../utils/monotonic_timestamp";
import noop from "../../../utils/noop";
import { RequestError } from "../../../utils/request";
import TaskCanceller from "../../../utils/task_canceller";
/**
 * Called on a loader error.
 * Returns whether the loader request should be retried.
 *
 * TODO the notion of retrying or not could be transport-specific (e.g. 412 are
 * mainly used for Smooth contents) and thus as part of the transport code (e.g.
 * by rejecting with an error always having a `canRetry` property?).
 * Or not, to ponder.
 *
 * @param {Error} error
 * @returns {Boolean} - If true, the request can be retried.
 */
function shouldRetry(error) {
    if (error instanceof RequestError) {
        if (error.type === NetworkErrorTypes.ERROR_HTTP_CODE) {
            return error.status >= 500 ||
                error.status === 404 ||
                error.status === 415 || // some CDN seems to use that code when
                // requesting low-latency segments too much
                // in advance
                error.status === 412;
        }
        return error.type === NetworkErrorTypes.TIMEOUT ||
            error.type === NetworkErrorTypes.ERROR_EVENT;
    }
    else if (error instanceof CustomLoaderError) {
        if (typeof error.canRetry === "boolean") {
            return error.canRetry;
        }
        if (error.xhr !== undefined) {
            return error.xhr.status >= 500 ||
                error.xhr.status === 404 ||
                error.xhr.status === 415 || // some CDN seems to use that code when
                // requesting low-latency segments too much
                // in advance
                error.xhr.status === 412;
        }
        return false;
    }
    return isKnownError(error) && error.code === "INTEGRITY_ERROR";
}
/**
 * Specific algorithm used to perform segment and manifest requests.
 *
 * Here how it works:
 *
 *   1. You give it one or multiple of the CDN available for the resource you
 *      want to request (from the most important one to the least important),
 *      a callback doing the request with the chosen CDN in argument, and some
 *      options.
 *
 *   2. it tries to call the request callback with the most prioritized CDN
 *      first:
 *        - if it works as expected, it resolves the returned Promise with that
 *          request's response.
 *        - if it fails, it calls ther `onRetry` callback given with the
 *          corresponding error, un-prioritize that CDN and try with the new
 *          most prioritized CDN.
 *
 *      Each CDN might be retried multiple times, depending on the nature of the
 *      error and the Configuration given.
 *
 *      Multiple retries of the same CDN are done after a delay to avoid
 *      overwhelming it, this is what we call a "backoff". That delay raises
 *      exponentially as multiple consecutive errors are encountered on this
 *      CDN.
 *
 * @param {Array.<string>|null} cdns - The different CDN on which the
 * wanted resource is available. `scheduleRequestWithCdns` will call the
 * `performRequest` callback with the right element from that array if different
 * from `null`.
 *
 * Can be set to `null` when that resource is not reachable through a CDN, in
 * which case the `performRequest` callback may be called with `null`.
 * @param {Object|null} cdnPrioritizer - Interface allowing to give the priority
 * between multiple CDNs.
 * @param {Function} performRequest - Callback implementing the request in
 * itself. Resolving when the resource request succeed and rejecting with the
 * corresponding error when the request failed.
 * @param {Object} options - Configuration allowing to tweak the number on which
 * the algorithm behind `scheduleRequestWithCdns` bases itself.
 * @param {Object} cancellationSignal - CancellationSignal allowing to cancel
 * the logic of `scheduleRequestWithCdns`.
 * To trigger if the resource is not needed anymore.
 * @returns {Promise} - Promise resolving, with the corresponding
 * `performRequest`'s data, when the resource request succeed and rejecting in
 * the following scenarios:
 *   - `scheduleRequestWithCdns` has been cancelled due to `cancellationSignal`
 *     being triggered. In that case a `CancellationError` is thrown.
 *
 *   - The resource request(s) failed and will not be retried anymore.
 */
export async function scheduleRequestWithCdns(cdns, cdnPrioritizer, performRequest, options, cancellationSignal) {
    if (cancellationSignal.cancellationError !== null) {
        return Promise.reject(cancellationSignal.cancellationError);
    }
    const { baseDelay, maxDelay, maxRetry, onRetry } = options;
    if (cdns !== null && cdns.length === 0) {
        log.warn("Fetchers: no CDN given to `scheduleRequestWithCdns`.");
    }
    const missedAttempts = new Map();
    const initialCdnToRequest = getCdnToRequest();
    if (initialCdnToRequest === undefined) {
        throw new Error("No CDN to request");
    }
    return requestCdn(initialCdnToRequest);
    /**
     * Returns what is now the most prioritary CDN to request the wanted resource.
     *
     * A return value of `null` indicates that the resource can be requested
     * through another mean than by doing an HTTP request.
     *
     * A return value of `undefined` indicates that there's no CDN left to request
     * the resource.
     * @returns {Object|null|undefined}
     */
    function getCdnToRequest() {
        if (cdns === null) {
            const nullAttemptObject = missedAttempts.get(null);
            if (nullAttemptObject !== undefined && nullAttemptObject.isBlacklisted) {
                return undefined;
            }
            return null;
        }
        else if (cdnPrioritizer === null) {
            return getPrioritaryRequestableCdnFromSortedList(cdns);
        }
        else {
            const prioritized = cdnPrioritizer.getCdnPreferenceForResource(cdns);
            return getPrioritaryRequestableCdnFromSortedList(prioritized);
        }
    }
    /**
     * Perform immediately the request for the given CDN.
     *
     * If it fails, forbid the CDN from being used - optionally and in some
     * conditions, only temporarily, then try the next CDN according to
     * previously-set delays (with a potential sleep before to respect them).
     *
     * Reject if both the request fails and there's no CDN left to use.
     * @param {string|null} cdn
     * @returns {Promise}
     */
    async function requestCdn(cdn) {
        try {
            const res = await performRequest(cdn, cancellationSignal);
            return res;
        }
        catch (error) {
            if (TaskCanceller.isCancellationError(error)) {
                throw error;
            }
            if (cdn !== null && cdnPrioritizer !== null) {
                // We failed requesting the resource on this CDN.
                // Globally give priority to the next CDN through the CdnPrioritizer.
                cdnPrioritizer.downgradeCdn(cdn);
            }
            let missedAttemptsObj = missedAttempts.get(cdn);
            if (missedAttemptsObj === undefined) {
                missedAttemptsObj = { errorCounter: 1,
                    blockedUntil: undefined,
                    isBlacklisted: false };
                missedAttempts.set(cdn, missedAttemptsObj);
            }
            else {
                missedAttemptsObj.errorCounter++;
            }
            if (!shouldRetry(error)) {
                missedAttemptsObj.blockedUntil = undefined;
                missedAttemptsObj.isBlacklisted = true;
                return retryWithNextCdn(error);
            }
            if (missedAttemptsObj.errorCounter > maxRetry) {
                missedAttemptsObj.blockedUntil = undefined;
                missedAttemptsObj.isBlacklisted = true;
            }
            else {
                const errorCounter = missedAttemptsObj.errorCounter;
                const delay = Math.min(baseDelay * Math.pow(2, errorCounter - 1), maxDelay);
                const fuzzedDelay = getFuzzedDelay(delay);
                missedAttemptsObj.blockedUntil = getTimestamp() + fuzzedDelay;
            }
            return retryWithNextCdn(error);
        }
    }
    /**
     * After a request error, find the new most prioritary CDN and perform the
     * request with it, optionally after a delay.
     *
     * If there's no CDN left to test, reject the original request error.
     * @param {*} prevRequestError
     * @returns {Promise}
     */
    async function retryWithNextCdn(prevRequestError) {
        const nextCdn = getCdnToRequest();
        if (cancellationSignal.isCancelled()) {
            throw cancellationSignal.cancellationError;
        }
        if (nextCdn === undefined) {
            throw prevRequestError;
        }
        onRetry(prevRequestError);
        if (cancellationSignal.isCancelled()) {
            throw cancellationSignal.cancellationError;
        }
        return waitPotentialBackoffAndRequest(nextCdn, prevRequestError);
    }
    /**
     * Request the corresponding CDN after the optional backoff needed before
     * requesting it.
     *
     * If a new CDN become prioritary in the meantime, request it instead, again
     * awaiting its optional backoff delay if it exists.
     * @param {string|null} nextWantedCdn
     * @param {*} prevRequestError
     * @returns {Promise}
     */
    function waitPotentialBackoffAndRequest(nextWantedCdn, prevRequestError) {
        const nextCdnAttemptObj = missedAttempts.get(nextWantedCdn);
        if (nextCdnAttemptObj === undefined ||
            nextCdnAttemptObj.blockedUntil === undefined) {
            return requestCdn(nextWantedCdn);
        }
        const now = getTimestamp();
        const blockedFor = nextCdnAttemptObj.blockedUntil - now;
        if (blockedFor <= 0) {
            return requestCdn(nextWantedCdn);
        }
        const canceller = new TaskCanceller();
        const unlinkCanceller = canceller.linkToSignal(cancellationSignal);
        return new Promise((res, rej) => {
            /* eslint-disable-next-line @typescript-eslint/no-misused-promises */
            cdnPrioritizer === null || cdnPrioritizer === void 0 ? void 0 : cdnPrioritizer.addEventListener("priorityChange", () => {
                const updatedPrioritaryCdn = getCdnToRequest();
                if (cancellationSignal.isCancelled()) {
                    throw cancellationSignal.cancellationError;
                }
                if (updatedPrioritaryCdn === undefined) {
                    return cleanAndReject(prevRequestError);
                }
                if (updatedPrioritaryCdn !== nextWantedCdn) {
                    canceller.cancel();
                    waitPotentialBackoffAndRequest(updatedPrioritaryCdn, prevRequestError)
                        .then(cleanAndResolve, cleanAndReject);
                }
            }, canceller.signal);
            cancellableSleep(blockedFor, canceller.signal)
                .then(() => requestCdn(nextWantedCdn)
                .then(cleanAndResolve, cleanAndReject), noop);
            function cleanAndResolve(response) {
                unlinkCanceller();
                res(response);
            }
            function cleanAndReject(err) {
                unlinkCanceller();
                rej(err);
            }
        });
    }
    /**
     * Takes in input the list of CDN that can be used to request the resource, in
     * a general preference order.
     *
     * Returns the actual most prioritary Cdn to request, based on the current
     * attempts already done for that resource.
     *
     * Returns `undefined` if there's no Cdn left to request the resource.
     * @param {Array.<Object>} sortedCdns
     * @returns {Object|undefined}
     */
    function getPrioritaryRequestableCdnFromSortedList(sortedCdns) {
        var _a;
        if (missedAttempts.size === 0) {
            return sortedCdns[0];
        }
        const now = getTimestamp();
        return (_a = sortedCdns
            .filter(c => { var _a; return ((_a = missedAttempts.get(c)) === null || _a === void 0 ? void 0 : _a.isBlacklisted) !== true; })
            .reduce((acc, x) => {
            var _a;
            let blockedUntil = (_a = missedAttempts.get(x)) === null || _a === void 0 ? void 0 : _a.blockedUntil;
            if (blockedUntil !== undefined && blockedUntil <= now) {
                blockedUntil = undefined;
            }
            if (acc === undefined) {
                return [x, blockedUntil];
            }
            if (blockedUntil === undefined) {
                if (acc[1] === undefined) {
                    return acc;
                }
                return [x, undefined];
            }
            return acc[1] === undefined ? acc :
                blockedUntil < acc[1] ? [x, blockedUntil] :
                    acc;
        }, undefined)) === null || _a === void 0 ? void 0 : _a[0];
    }
}
/**
 * Lightweight version of the request algorithm, this time with only a simple
 * Promise given.
 * @param {Function} performRequest
 * @param {Object} options
 * @returns {Promise}
 */
export function scheduleRequestPromise(performRequest, options, cancellationSignal) {
    // same than for a single unknown CDN
    return scheduleRequestWithCdns(null, null, performRequest, options, cancellationSignal);
}
