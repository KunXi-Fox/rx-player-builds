"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyDefaultTTMLStyle = exports.shouldApplyDefaultTTMLStyle = void 0;
/**
 * Return true if no style has been already declared and no conflict is
 * detected with current cue style.
 *
 * No position, orientation and dimension style should have been set to
 * avoid any conflict.
 * @param {object} paragraphStyle
 * @returns {boolean}
 */
function shouldApplyDefaultTTMLStyle(paragraphStyle) {
    return paragraphStyle.extent === undefined &&
        paragraphStyle.origin === undefined &&
        paragraphStyle.displayAlign === undefined &&
        paragraphStyle.display === undefined &&
        paragraphStyle.textAlign === undefined &&
        paragraphStyle.fontSize === undefined;
}
exports.shouldApplyDefaultTTMLStyle = shouldApplyDefaultTTMLStyle;
/**
 * Apply a default style to TTML cue.
 *
 * The default style propose to set the cue at the bottom, centered
 * and lightly spaced apart from the edges :
 *
 *        -----------------------------------------------
 *        |                                             |
 *        |                                             |
 *        |                                             |
 *        |                                             |
 *        |                                             |
 *        |                                             |
 *        |            subtitle is displayed            |
 *        |                    here                     |
 *        -----------------------------------------------
 *
 * @param {Object} cue
 * TODO This code can be seen as risky because we might not predict every
 * possible styles that can enter in conflict.
 * A better solution should be found in the future
 */
function applyDefaultTTMLStyle(paragraphStyle) {
    paragraphStyle.extent = "70% 20%";
    paragraphStyle.fontSize = "1c";
    paragraphStyle.origin = "15% 80%";
    paragraphStyle.displayAlign = "before";
    paragraphStyle.textAlign = "center";
}
exports.applyDefaultTTMLStyle = applyDefaultTTMLStyle;
