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
exports.tryToChangeSourceBufferType = exports.shouldWaitForHaveEnoughData = exports.shouldWaitForDataBeforeLoaded = exports.shouldValidateMetadata = exports.shouldUnsetMediaKeys = exports.shouldRenewMediaKeySystemAccess = exports.shouldReloadMediaSourceOnDecipherabilityUpdate = exports.onHeightWidthChange = exports.MediaSource_ = exports.makeVTTCue = exports.isVTTCue = exports.isCodecSupported = exports.getStartDate = exports.events = exports.enableAudioTrack = exports.clearElementSrc = exports.canReuseMediaKeys = exports.canPatchISOBMFFSegment = exports.addTextTrack = exports.addClassName = void 0;
var add_class_name_1 = require("./add_class_name");
exports.addClassName = add_class_name_1.default;
var add_text_track_1 = require("./add_text_track");
exports.addTextTrack = add_text_track_1.default;
var browser_compatibility_types_1 = require("./browser_compatibility_types");
Object.defineProperty(exports, "MediaSource_", { enumerable: true, get: function () { return browser_compatibility_types_1.MediaSource_; } });
var can_patch_isobmff_1 = require("./can_patch_isobmff");
exports.canPatchISOBMFFSegment = can_patch_isobmff_1.default;
var can_reuse_media_keys_1 = require("./can_reuse_media_keys");
exports.canReuseMediaKeys = can_reuse_media_keys_1.default;
var change_source_buffer_type_1 = require("./change_source_buffer_type");
exports.tryToChangeSourceBufferType = change_source_buffer_type_1.default;
var clear_element_src_1 = require("./clear_element_src");
exports.clearElementSrc = clear_element_src_1.default;
var enable_audio_track_1 = require("./enable_audio_track");
exports.enableAudioTrack = enable_audio_track_1.default;
var events = require("./event_listeners");
exports.events = events;
var get_start_date_1 = require("./get_start_date");
exports.getStartDate = get_start_date_1.default;
var is_codec_supported_1 = require("./is_codec_supported");
exports.isCodecSupported = is_codec_supported_1.default;
var is_vtt_cue_1 = require("./is_vtt_cue");
exports.isVTTCue = is_vtt_cue_1.default;
var make_vtt_cue_1 = require("./make_vtt_cue");
exports.makeVTTCue = make_vtt_cue_1.default;
var on_height_width_change_1 = require("./on_height_width_change");
exports.onHeightWidthChange = on_height_width_change_1.default;
var patch_webkit_source_buffer_1 = require("./patch_webkit_source_buffer");
// eslint-disable-next-line max-len
var should_reload_media_source_on_decipherability_update_1 = require("./should_reload_media_source_on_decipherability_update");
exports.shouldReloadMediaSourceOnDecipherabilityUpdate = should_reload_media_source_on_decipherability_update_1.default;
var should_renew_media_key_system_access_1 = require("./should_renew_media_key_system_access");
exports.shouldRenewMediaKeySystemAccess = should_renew_media_key_system_access_1.default;
var should_unset_media_keys_1 = require("./should_unset_media_keys");
exports.shouldUnsetMediaKeys = should_unset_media_keys_1.default;
var should_validate_metadata_1 = require("./should_validate_metadata");
exports.shouldValidateMetadata = should_validate_metadata_1.default;
var should_wait_for_data_before_loaded_1 = require("./should_wait_for_data_before_loaded");
exports.shouldWaitForDataBeforeLoaded = should_wait_for_data_before_loaded_1.default;
var should_wait_for_have_enough_data_1 = require("./should_wait_for_have_enough_data");
exports.shouldWaitForHaveEnoughData = should_wait_for_have_enough_data_1.default;
// TODO To remove. This seems to be the only side-effect done on import, which
// we  would prefer to disallow (both for the understandability of the code and
// to better exploit tree shaking.
(0, patch_webkit_source_buffer_1.default)();
