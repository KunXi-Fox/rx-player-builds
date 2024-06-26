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
import isNonEmptyString from "../../../utils/is_non_empty_string";
/**
 * Returns the first line that is not apart of the given cue block.
 * The index given can be anywhere in a known cue block.
 *
 * This function is extra-resilient due to observed real-life malformed
 * subtitles.
 * Basically, it allows some deviation from the specification as long as the
 * intent is pretty clear.
 * @param {Array<string>} linified - Whole srt. Line by line.
 * @param {number} startIndex - Index in `linified` of the first line within the
 * block.
 * @returns {number}
 */
export default function findEndOfCueBlock(linified, startIndex) {
    let firstEmptyLineIndex = startIndex + 1;
    // continue incrementing i until either:
    //   - an empty line
    //   - the end
    while (isNonEmptyString(linified[firstEmptyLineIndex])) {
        firstEmptyLineIndex++;
    }
    return firstEmptyLineIndex;
}
