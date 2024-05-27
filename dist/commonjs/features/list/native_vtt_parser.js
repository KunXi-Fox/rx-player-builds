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
exports.NATIVE_VTT_PARSER = void 0;
var native_1 = require("../../parsers/texttracks/webvtt/native");
var native_2 = require("../../text_displayer/native");
/**
 * Add ability to parse WebVTT text tracks in a native textrack mode.
 * @param {Object} features
 */
function addNativeVTTFeature(features) {
    features.nativeTextTracksParsers.vtt = native_1.default;
    features.nativeTextDisplayer = native_2.default;
}
exports.NATIVE_VTT_PARSER = addNativeVTTFeature;
exports.default = addNativeVTTFeature;
