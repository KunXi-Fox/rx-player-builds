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
import objectAssign from "../../../../utils/object_assign";
import appendSegmentToBuffer from "./append_segment_to_buffer";
/**
 * Push a given media segment (non-init segment) to a SegmentBuffer.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default async function pushMediaSegment({ playbackObserver, bufferGoal, content, initSegmentUniqueId, parsedSegment, segment, segmentBuffer }, cancelSignal) {
    var _a, _b;
    if (parsedSegment.chunkData === null) {
        return null;
    }
    if (cancelSignal.cancellationError !== null) {
        throw cancelSignal.cancellationError;
    }
    const { chunkData, chunkInfos, chunkOffset, chunkSize, appendWindow } = parsedSegment;
    const codec = content.representation.getMimeTypeString();
    const { APPEND_WINDOW_SECURITIES } = config.getCurrent();
    // Cutting exactly at the start or end of the appendWindow can lead to
    // cases of infinite rebuffering due to how browser handle such windows.
    // To work-around that, we add a small offset before and after those.
    const safeAppendWindow = [
        appendWindow[0] !== undefined ?
            Math.max(0, appendWindow[0] - APPEND_WINDOW_SECURITIES.START) :
            undefined,
        appendWindow[1] !== undefined ?
            appendWindow[1] + APPEND_WINDOW_SECURITIES.END :
            undefined,
    ];
    const data = { initSegmentUniqueId,
        chunk: chunkData,
        timestampOffset: chunkOffset,
        appendWindow: safeAppendWindow,
        codec };
    let estimatedStart = (_a = chunkInfos === null || chunkInfos === void 0 ? void 0 : chunkInfos.time) !== null && _a !== void 0 ? _a : segment.time;
    const estimatedDuration = (_b = chunkInfos === null || chunkInfos === void 0 ? void 0 : chunkInfos.duration) !== null && _b !== void 0 ? _b : segment.duration;
    let estimatedEnd = estimatedStart + estimatedDuration;
    if (safeAppendWindow[0] !== undefined) {
        estimatedStart = Math.max(estimatedStart, safeAppendWindow[0]);
    }
    if (safeAppendWindow[1] !== undefined) {
        estimatedEnd = Math.min(estimatedEnd, safeAppendWindow[1]);
    }
    const inventoryInfos = objectAssign({ segment,
        chunkSize,
        start: estimatedStart,
        end: estimatedEnd }, content);
    const buffered = await appendSegmentToBuffer(playbackObserver, segmentBuffer, { data, inventoryInfos }, bufferGoal, cancelSignal);
    return { content, segment, buffered };
}
