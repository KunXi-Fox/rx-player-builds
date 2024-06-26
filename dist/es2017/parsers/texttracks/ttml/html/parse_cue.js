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
import getTimeDelimiters from "../get_time_delimiters";
import createElement from "./create_element";
/**
 * @param {Object} parsedCue
 * @returns {Object|null}
 */
export default function parseCue(parsedCue) {
    const { paragraph, ttParams, body, regionStyles, idStyles, paragraphStyle, timeOffset, shouldTrimWhiteSpace, } = parsedCue;
    // Disregard empty elements:
    // TTML allows for empty elements like <div></div>.
    // If paragraph has neither time attributes, nor
    // non-whitespace text, don't try to make a cue out of it.
    if (!paragraph.hasAttribute("begin") &&
        !paragraph.hasAttribute("end") &&
        /^\s*$/.test(paragraph.textContent === null ? "" : paragraph.textContent)) {
        return null;
    }
    const { cellResolution } = ttParams;
    const { start, end } = getTimeDelimiters(paragraph, ttParams);
    const element = createElement(paragraph, body, regionStyles, idStyles, paragraphStyle, { cellResolution, shouldTrimWhiteSpace });
    return { start: start + timeOffset,
        end: end + timeOffset,
        element };
}
