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
import { getMDHDTimescale, takePSSHOut, } from "../../parsers/containers/isobmff";
import { getKeyIdFromInitSegment } from "../../parsers/containers/isobmff/utils";
import { getTimeCodeScale } from "../../parsers/containers/matroska";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import inferSegmentContainer from "../utils/infer_segment_container";
export default function segmentParser(loadedSegment, context, initTimescale) {
    var _a, _b;
    const { segment, periodStart, periodEnd } = context;
    const { data } = loadedSegment;
    const appendWindow = [periodStart, periodEnd];
    if (data === null) {
        if (segment.isInit) {
            return { segmentType: "init",
                initializationData: null,
                initializationDataSize: 0,
                protectionData: [],
                initTimescale: undefined };
        }
        return { segmentType: "media",
            chunkData: null,
            chunkSize: 0,
            chunkInfos: null,
            chunkOffset: 0,
            protectionData: [],
            appendWindow };
    }
    const chunkData = new Uint8Array(data);
    const containerType = inferSegmentContainer(context.type, context.mimeType);
    // TODO take a look to check if this is an ISOBMFF/webm?
    const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
    const protectionData = [];
    if (seemsToBeMP4) {
        const psshInfo = takePSSHOut(chunkData);
        let keyId;
        if (segment.isInit) {
            keyId = (_a = getKeyIdFromInitSegment(chunkData)) !== null && _a !== void 0 ? _a : undefined;
        }
        if (psshInfo.length > 0 || keyId !== undefined) {
            protectionData.push({ initDataType: "cenc", keyId, initData: psshInfo });
        }
    }
    if (segment.isInit) {
        const timescale = containerType === "webm" ? getTimeCodeScale(chunkData, 0) :
            // assume ISOBMFF-compliance
            getMDHDTimescale(chunkData);
        return { segmentType: "init",
            initializationData: chunkData,
            initializationDataSize: 0,
            initTimescale: timescale !== null && timescale !== void 0 ? timescale : undefined,
            protectionData };
    }
    const chunkInfos = seemsToBeMP4 ? getISOBMFFTimingInfos(chunkData, false, segment, initTimescale) :
        null; // TODO extract time info from webm
    const chunkOffset = (_b = segment.timestampOffset) !== null && _b !== void 0 ? _b : 0;
    return { segmentType: "media",
        chunkData,
        chunkSize: chunkData.length,
        chunkInfos,
        chunkOffset,
        protectionData,
        appendWindow };
}
