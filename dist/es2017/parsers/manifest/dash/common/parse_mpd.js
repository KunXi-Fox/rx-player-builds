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
import config from "../../../../config";
import log from "../../../../log";
import arrayFind from "../../../../utils/array_find";
import getMonotonicTimeStamp from "../../../../utils/monotonic_timestamp";
import { getFilenameIndexInUrl } from "../../../../utils/resolve_url";
// eslint-disable-next-line max-len
import getClockOffset from "./get_clock_offset";
import getHTTPUTCTimingURL from "./get_http_utc-timing_url";
import getMinimumAndMaximumPositions from "./get_minimum_and_maximum_positions";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import parseAvailabilityStartTime from "./parse_availability_start_time";
import parsePeriods from "./parse_periods";
import resolveBaseURLs from "./resolve_base_urls";
/**
 * Checks if xlinks needs to be loaded before actually parsing the manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @param {boolean} hasLoadedClock
 * @param {Array.<Object>} warnings
 * @returns {Object}
 */
export default function parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos = new WeakMap()) {
    const { children: rootChildren, attributes: rootAttributes } = mpdIR;
    if (args.externalClockOffset == null) {
        const isDynamic = rootAttributes.type === "dynamic";
        const directTiming = arrayFind(rootChildren.utcTimings, (utcTiming) => {
            return utcTiming.schemeIdUri === "urn:mpeg:dash:utc:direct:2014" &&
                utcTiming.value != null;
        });
        const clockOffsetFromDirectUTCTiming = directTiming != null &&
            directTiming.value != null ? getClockOffset(directTiming.value) :
            undefined;
        const clockOffset = clockOffsetFromDirectUTCTiming != null &&
            !isNaN(clockOffsetFromDirectUTCTiming) ?
            clockOffsetFromDirectUTCTiming :
            undefined;
        if (clockOffset != null && hasLoadedClock !== true) {
            args.externalClockOffset = clockOffset;
        }
        else if (isDynamic && hasLoadedClock !== true) {
            const UTCTimingHTTPURL = getHTTPUTCTimingURL(mpdIR);
            if (UTCTimingHTTPURL != null && UTCTimingHTTPURL.length > 0) {
                // TODO fetch UTCTiming and XLinks at the same time
                return {
                    type: "needs-clock",
                    value: {
                        url: UTCTimingHTTPURL,
                        continue: function continueParsingMPD(responseDataClock) {
                            if (!responseDataClock.success) {
                                warnings.push(responseDataClock.error);
                                log.warn("DASH Parser: Error on fetching the clock ressource", responseDataClock.error);
                                return parseMpdIr(mpdIR, args, warnings, true);
                            }
                            args.externalClockOffset = getClockOffset(responseDataClock.data);
                            return parseMpdIr(mpdIR, args, warnings, true);
                        },
                    },
                };
            }
        }
    }
    const xlinksToLoad = [];
    for (let i = 0; i < rootChildren.periods.length; i++) {
        const { xlinkHref, xlinkActuate } = rootChildren.periods[i].attributes;
        if (xlinkHref != null && xlinkActuate === "onLoad") {
            xlinksToLoad.push({ index: i, ressource: xlinkHref });
        }
    }
    if (xlinksToLoad.length === 0) {
        return parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos);
    }
    return {
        type: "needs-xlinks",
        value: {
            xlinksUrls: xlinksToLoad.map(({ ressource }) => ressource),
            continue: function continueParsingMPD(loadedRessources) {
                if (loadedRessources.length !== xlinksToLoad.length) {
                    throw new Error("DASH parser: wrong number of loaded ressources.");
                }
                // Note: It is important to go from the last index to the first index in
                // the resulting array, as we will potentially add elements to the array
                for (let i = loadedRessources.length - 1; i >= 0; i--) {
                    const index = xlinksToLoad[i].index;
                    const { parsed: periodsIR, warnings: parsingWarnings, receivedTime, sendingTime, url } = loadedRessources[i];
                    if (parsingWarnings.length > 0) {
                        warnings.push(...parsingWarnings);
                    }
                    for (const periodIR of periodsIR) {
                        xlinkInfos.set(periodIR, { receivedTime, sendingTime, url });
                    }
                    // replace original "xlinked" periods by the real deal
                    rootChildren.periods.splice(index, 1, ...periodsIR);
                }
                return parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos);
            },
        },
    };
}
/**
 * Parse the MPD intermediate representation into a regular Manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @param {Array.<Object>} warnings
 * @param {Object} xlinkInfos
 * @returns {Object}
 */
function parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos) {
    var _a, _b, _c;
    const { children: rootChildren, attributes: rootAttributes } = mpdIR;
    const isDynamic = rootAttributes.type === "dynamic";
    const initialBaseUrl = args.url !== undefined ?
        [{ url: args.url.substring(0, getFilenameIndexInUrl(args.url)) }] :
        [];
    const mpdBaseUrls = resolveBaseURLs(initialBaseUrl, rootChildren.baseURLs);
    const availabilityStartTime = parseAvailabilityStartTime(rootAttributes, args.referenceDateTime);
    const timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
    const { externalClockOffset: clockOffset, unsafelyBaseOnPreviousManifest } = args;
    const { externalClockOffset } = args;
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
        availabilityStartTime,
        isDynamic,
        timeShiftBufferDepth,
        serverTimestampOffset: externalClockOffset,
    });
    const manifestInfos = { availabilityStartTime,
        baseURLs: mpdBaseUrls,
        clockOffset,
        duration: rootAttributes.duration,
        isDynamic,
        manifestBoundsCalculator,
        manifestProfiles: mpdIR.attributes.profiles,
        receivedTime: args.manifestReceivedTime,
        timeShiftBufferDepth,
        unsafelyBaseOnPreviousManifest,
        xlinkInfos,
        xmlNamespaces: mpdIR.attributes.namespaces };
    const parsedPeriods = parsePeriods(rootChildren.periods, manifestInfos);
    const mediaPresentationDuration = rootAttributes.duration;
    let lifetime;
    let minimumTime;
    let timeshiftDepth = null;
    let maximumTimeData;
    if (rootAttributes.minimumUpdatePeriod !== undefined &&
        rootAttributes.minimumUpdatePeriod >= 0) {
        lifetime = rootAttributes.minimumUpdatePeriod === 0 ?
            config.getCurrent().DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0 :
            rootAttributes.minimumUpdatePeriod;
    }
    const { minimumSafePosition, maximumSafePosition, maximumUnsafePosition } = getMinimumAndMaximumPositions(parsedPeriods);
    const now = getMonotonicTimeStamp();
    if (!isDynamic) {
        minimumTime = minimumSafePosition !== undefined ? minimumSafePosition :
            ((_a = parsedPeriods[0]) === null || _a === void 0 ? void 0 : _a.start) !== undefined ? parsedPeriods[0].start :
                0;
        let finalMaximumSafePosition = mediaPresentationDuration !== null && mediaPresentationDuration !== void 0 ? mediaPresentationDuration : Infinity;
        if (parsedPeriods[parsedPeriods.length - 1] !== undefined) {
            const lastPeriod = parsedPeriods[parsedPeriods.length - 1];
            const lastPeriodEnd = (_b = lastPeriod.end) !== null && _b !== void 0 ? _b : (lastPeriod.duration !== undefined ?
                lastPeriod.start + lastPeriod.duration :
                undefined);
            if (lastPeriodEnd !== undefined && lastPeriodEnd < finalMaximumSafePosition) {
                finalMaximumSafePosition = lastPeriodEnd;
            }
        }
        if (maximumSafePosition !== undefined &&
            maximumSafePosition < finalMaximumSafePosition) {
            finalMaximumSafePosition = maximumSafePosition;
        }
        maximumTimeData = { isLinear: false,
            maximumSafePosition: finalMaximumSafePosition,
            livePosition: undefined,
            time: now };
    }
    else {
        // Determine the maximum seekable position
        let finalMaximumSafePosition;
        if (maximumSafePosition !== undefined) {
            finalMaximumSafePosition = maximumSafePosition;
        }
        else {
            if (externalClockOffset === undefined) {
                log.warn("DASH Parser: use system clock to define maximum position");
                finalMaximumSafePosition = (Date.now() / 1000) - availabilityStartTime;
            }
            else {
                const serverTime = getMonotonicTimeStamp() + externalClockOffset;
                finalMaximumSafePosition = (serverTime / 1000) - availabilityStartTime;
            }
        }
        // Determine live edge (what position corresponds to live content, can be
        // inferior or superior to the maximum anounced position in some specific
        // scenarios). However, the `timeShiftBufferDepth` should be based on it.
        let livePosition = manifestBoundsCalculator.getEstimatedLiveEdge();
        if (livePosition === undefined) {
            if (maximumUnsafePosition !== undefined) {
                livePosition = maximumUnsafePosition;
            }
            else {
                livePosition = finalMaximumSafePosition;
            }
            // manifestBoundsCalculator.forceLiveEdge(livePosition);
        }
        maximumTimeData = { isLinear: true,
            maximumSafePosition: finalMaximumSafePosition,
            livePosition,
            time: now };
        // if the minimum calculated time is even below the buffer depth, perhaps we
        // can go even lower in terms of depth
        minimumTime = minimumSafePosition;
        timeshiftDepth = timeShiftBufferDepth !== null && timeShiftBufferDepth !== void 0 ? timeShiftBufferDepth : null;
        if (timeshiftDepth !== null && minimumTime !== undefined &&
            livePosition - minimumTime > timeshiftDepth) {
            timeshiftDepth = livePosition - minimumTime;
        }
    }
    // `isLastPeriodKnown` should be `true` in two cases for DASH contents:
    //   1. When the content is static, because we know that no supplementary
    //      Period will be added.
    //   2. If the content is dynamic, only when both the duration is known and
    //      the `minimumUpdatePeriod` is not set. This corresponds to the case
    //      explained in "4.6.4. Transition Phase between Live and On-Demand" of
    //      the DASH-IF IOP v4.3 for live contents transitionning to on-demand.
    const isLastPeriodKnown = !isDynamic ||
        (mpdIR.attributes.minimumUpdatePeriod === undefined &&
            (((_c = parsedPeriods[parsedPeriods.length - 1]) === null || _c === void 0 ? void 0 : _c.end) !== undefined ||
                mpdIR.attributes.duration !== undefined));
    const parsedMPD = {
        availabilityStartTime,
        clockOffset: args.externalClockOffset,
        isDynamic,
        isLive: isDynamic,
        isLastPeriodKnown,
        periods: parsedPeriods,
        publishTime: rootAttributes.publishTime,
        suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay,
        transportType: "dash",
        timeBounds: { minimumSafePosition: minimumTime,
            timeshiftDepth,
            maximumTimeData },
        lifetime,
        uris: args.url == null ?
            rootChildren.locations : [args.url, ...rootChildren.locations],
    };
    return { type: "done", value: { parsed: parsedMPD, warnings } };
}
