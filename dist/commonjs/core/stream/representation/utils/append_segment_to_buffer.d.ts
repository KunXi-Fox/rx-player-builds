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
import { IRange } from "../../../../utils/ranges";
import { IReadOnlySharedReference } from "../../../../utils/reference";
import { CancellationSignal } from "../../../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../../../api";
import { IInsertedChunkInfos, IPushChunkInfos, SegmentBuffer } from "../../../segment_buffers";
import { IRepresentationStreamPlaybackObservation } from "../types";
/**
 * Append a segment to the given segmentBuffer.
 * If it leads to an Error due to a full buffer, try to run our custom range
 * _garbage collector_ then retry.
 * @param {Object} playbackObserver
 * @param {Object} segmentBuffer
 * @param {Object} dataInfos
 * @param {number} bufferGoal
 * @param {Object} cancellationSignal
 * @returns {Promise}
 */
export default function appendSegmentToBuffer<T>(playbackObserver: IReadOnlyPlaybackObserver<IRepresentationStreamPlaybackObservation>, segmentBuffer: SegmentBuffer, dataInfos: IPushChunkInfos<T> & {
    inventoryInfos: IInsertedChunkInfos;
}, bufferGoal: IReadOnlySharedReference<number>, cancellationSignal: CancellationSignal): Promise<IRange[]>;
