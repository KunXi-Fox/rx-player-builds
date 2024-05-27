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
import config from "../../../config";
import arrayIncludes from "../../../utils/array_includes";
import { excludeFromRanges, insertInto, } from "../../../utils/ranges";
import { getFirstSegmentAfterPeriod, getLastSegmentBeforePeriod, SegmentBufferOperation, } from "../../segment_buffers";
export default function getRepresentationsSwitchingStrategy(period, adaptation, settings, segmentBuffer, playbackObserver) {
    var _a, _b;
    if (settings.switchingMode === "lazy") {
        return { type: "continue", value: undefined };
    }
    const inventory = segmentBuffer.getLastKnownInventory();
    const unwantedRange = [];
    for (const elt of inventory) {
        if (elt.infos.period.id === period.id && (elt.infos.adaptation.id !== adaptation.id ||
            !arrayIncludes(settings.representationIds, elt.infos.representation.id))) {
            insertInto(unwantedRange, { start: (_a = elt.bufferedStart) !== null && _a !== void 0 ? _a : elt.start,
                end: (_b = elt.bufferedEnd) !== null && _b !== void 0 ? _b : elt.end });
        }
    }
    const pendingOperations = segmentBuffer.getPendingOperations();
    for (const operation of pendingOperations) {
        if (operation.type === SegmentBufferOperation.Push) {
            const info = operation.value.inventoryInfos;
            if (info.period.id === period.id && (info.adaptation.id !== adaptation.id ||
                !arrayIncludes(settings.representationIds, info.representation.id))) {
                const start = info.segment.time;
                const end = start + info.segment.duration;
                insertInto(unwantedRange, { start, end });
            }
        }
    }
    // Continue if we have no other Adaptation buffered in the current Period
    if (unwantedRange.length === 0) {
        return { type: "continue", value: undefined };
    }
    if (settings.switchingMode === "reload") {
        const readyState = playbackObserver.getReadyState();
        if (readyState === undefined || readyState > 1) {
            return { type: "needs-reload", value: undefined };
        }
    }
    // From here, clean-up data from the previous Adaptation, if one
    const shouldFlush = settings.switchingMode === "direct";
    const rangesToExclude = [];
    // First, we don't want to accidentally remove some segments from the previous
    // Period (which overlap a little with this one)
    /** Last segment before one for the current period. */
    const lastSegmentBefore = getLastSegmentBeforePeriod(inventory, period);
    if (lastSegmentBefore !== null &&
        (lastSegmentBefore.bufferedEnd === undefined ||
            period.start - lastSegmentBefore.bufferedEnd < 1)) // Close to Period's start
     {
        // Exclude data close to the period's start to avoid cleaning
        // to much
        rangesToExclude.push({ start: 0,
            end: period.start + 1 });
    }
    if (!shouldFlush) {
        // exclude data around current position to avoid decoding issues
        const { ADAP_REP_SWITCH_BUFFER_PADDINGS } = config.getCurrent();
        const bufferType = adaptation.type;
        /** Ranges that won't be cleaned from the current buffer. */
        let paddingBefore = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].before;
        if (paddingBefore == null) {
            paddingBefore = 0;
        }
        let paddingAfter = ADAP_REP_SWITCH_BUFFER_PADDINGS[bufferType].after;
        if (paddingAfter == null) {
            paddingAfter = 0;
        }
        let currentTime = playbackObserver.getCurrentTime();
        if (currentTime === undefined) {
            // TODO current position might be old. A better solution should be found.
            const lastObservation = playbackObserver.getReference().getValue();
            currentTime = lastObservation.position.getPolled();
        }
        rangesToExclude.push({ start: currentTime - paddingBefore,
            end: currentTime + paddingAfter });
    }
    // Now remove possible small range from the end if there is a segment from the
    // next Period
    if (period.end !== undefined) {
        /** first segment after for the current period. */
        const firstSegmentAfter = getFirstSegmentAfterPeriod(inventory, period);
        if (firstSegmentAfter !== null &&
            (firstSegmentAfter.bufferedStart === undefined ||
                // Close to Period's end
                (firstSegmentAfter.bufferedStart - period.end) < 1)) {
            rangesToExclude.push({ start: period.end - 1,
                end: Number.MAX_VALUE });
        }
    }
    const toRemove = excludeFromRanges(unwantedRange, rangesToExclude);
    if (toRemove.length === 0) {
        return { type: "continue", value: undefined };
    }
    return shouldFlush ? { type: "flush-buffer", value: toRemove } :
        { type: "clean-buffer", value: toRemove };
}
