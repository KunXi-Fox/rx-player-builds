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
/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
import { ICompatVTTCue } from "../../../../compat/index";
/**
 * Parse whole WEBVTT file into an array of cues, to be inserted in a video's
 * TrackElement.
 * @param {string} vttStr
 * @param {Number} timeOffset
 * @returns {Array.<ICompatVTTCue|TextTrackCue>}
 */
export default function parseVTTStringToVTTCues(vttStr: string, timeOffset: number): Array<TextTrackCue | ICompatVTTCue>;
