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
exports.patchSegment = exports.parseTfxd = exports.parseTfrf = exports.createVideoInitSegment = exports.createAudioInitSegment = void 0;
var create_audio_init_segment_1 = require("./create_audio_init_segment");
exports.createAudioInitSegment = create_audio_init_segment_1.default;
var create_video_init_segment_1 = require("./create_video_init_segment");
exports.createVideoInitSegment = create_video_init_segment_1.default;
var parse_tfrf_1 = require("./parse_tfrf");
exports.parseTfrf = parse_tfrf_1.default;
var parse_tfxd_1 = require("./parse_tfxd");
exports.parseTfxd = parse_tfxd_1.default;
var patch_segment_1 = require("./patch_segment");
exports.patchSegment = patch_segment_1.default;
