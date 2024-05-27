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
import Manifest, { Adaptation, ISegment, Period, Representation } from "../../../../manifest";
import { ISegmentParserParsedMediaChunk } from "../../../../transports";
import { IReadOnlySharedReference } from "../../../../utils/reference";
import { CancellationSignal } from "../../../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../../../api";
import { SegmentBuffer } from "../../../segment_buffers";
import { IRepresentationStreamPlaybackObservation, IStreamEventAddedSegmentPayload } from "../types";
/**
 * Push a given media segment (non-init segment) to a SegmentBuffer.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export default function pushMediaSegment<T>({ playbackObserver, bufferGoal, content, initSegmentUniqueId, parsedSegment, segment, segmentBuffer }: {
    playbackObserver: IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>;
    content: {
        adaptation: Adaptation;
        manifest: Manifest;
        period: Period;
        representation: Representation;
    };
    bufferGoal: IReadOnlySharedReference<number>;
    initSegmentUniqueId: string | null;
    parsedSegment: ISegmentParserParsedMediaChunk<T>;
    segment: ISegment;
    segmentBuffer: SegmentBuffer;
}, cancelSignal: CancellationSignal): Promise<IStreamEventAddedSegmentPayload | null>;
