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
import srtParser from "../../parsers/texttracks/srt/native";
import NativeTextDisplayer from "../../text_displayer/native";
/**
 * Add ability to parse SRT text tracks in a native textrack mode.
 * @param {Object} features
 */
function addNativeSRTFeature(features) {
    features.nativeTextTracksParsers.srt = srtParser;
    features.nativeTextDisplayer = NativeTextDisplayer;
}
export { addNativeSRTFeature as NATIVE_SRT_PARSER };
export default addNativeSRTFeature;