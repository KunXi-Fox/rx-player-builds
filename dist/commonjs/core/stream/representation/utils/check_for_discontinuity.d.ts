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
import Manifest, { Adaptation, Period, Representation } from "../../../../manifest";
import { IBufferedChunk } from "../../../segment_buffers";
import { IBufferDiscontinuity } from "../types";
/**
 * Check if there is a soon-to-be-encountered discontinuity in the buffer that
 * won't be filled by any future segment.
 * This function will only check discontinuities for the given `checkedRange`.
 *
 * @param {Object} content - The content we are currently loading.
 * @param {Object} checkedRange - The time range that will be checked for
 * discontinuities.
 * Both `nextSegmentStart` and `bufferedSegments` arguments can only refer to
 * that range.
 * @param {number|null} nextSegmentStart - The start time in seconds of the next
 * not-yet-pushed segment that can be pushed, in the limits of `checkedRange`.
 * This includes segments which have not been loaded or pushed yet, but also
 * segments which might be re-downloaded because currently incomplete in the
 * buffer, the point being to know what is the earliest time in the buffer where
 * a segment might be pushed in the future.
 * `null` if no segment in `checkedRange` will be pushed under current buffer's
 * conditions.
 * @param {boolean} hasFinishedLoading - if `true`, all segments for the current
 * Period have been loaded and none will be loaded in the future under the
 * current buffer's state.
 * @param {Array.<Object>} bufferedSegments - Information about every segments
 * currently in the buffer, in chronological order.
 * Only segments overlapping with the given `checkedRange` will be looked at,
 * though the array given can be larger.
 */
export default function checkForDiscontinuity(content: {
    adaptation: Adaptation;
    manifest: Manifest;
    period: Period;
    representation: Representation;
}, checkedRange: {
    start: number;
    end: number;
}, nextSegmentStart: number | null, hasFinishedLoading: boolean, bufferedSegments: IBufferedChunk[]): IBufferDiscontinuity | null;
