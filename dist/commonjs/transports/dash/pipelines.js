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
var features_1 = require("../../features");
var generate_manifest_loader_1 = require("../utils/generate_manifest_loader");
var manifest_parser_1 = require("./manifest_parser");
var segment_loader_1 = require("./segment_loader");
var segment_parser_1 = require("./segment_parser");
var text_loader_1 = require("./text_loader");
var text_parser_1 = require("./text_parser");
/**
 * Returns pipelines used for DASH streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @returns {Object}
 */
function default_1(options) {
    var manifestLoader = (0, generate_manifest_loader_1.default)({ customManifestLoader: options.manifestLoader }, mightUseDashWasmFeature() ? "text" :
        "arraybuffer");
    var manifestParser = (0, manifest_parser_1.default)(options);
    var segmentLoader = (0, segment_loader_1.default)(options);
    var audioVideoSegmentParser = (0, segment_parser_1.default)(options);
    var textTrackLoader = (0, text_loader_1.default)(options);
    var textTrackParser = (0, text_parser_1.default)(options);
    return { manifest: { loadManifest: manifestLoader,
            parseManifest: manifestParser },
        audio: { loadSegment: segmentLoader,
            parseSegment: audioVideoSegmentParser },
        video: { loadSegment: segmentLoader,
            parseSegment: audioVideoSegmentParser },
        text: { loadSegment: textTrackLoader,
            parseSegment: textTrackParser } };
}
exports.default = default_1;
/**
 * Returns true if the DASH-WASM parser is either initialized or being
 * initialized.
 * @returns {boolean}
 */
function mightUseDashWasmFeature() {
    return features_1.default.dashParsers.wasm !== null &&
        (features_1.default.dashParsers.wasm.status === "initialized" ||
            features_1.default.dashParsers.wasm.status === "initializing");
}
