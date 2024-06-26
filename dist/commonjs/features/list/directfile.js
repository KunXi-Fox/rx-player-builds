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
exports.DIRECTFILE = void 0;
// eslint-disable-next-line max-len
var media_element_tracks_store_1 = require("../../core/api/track_management/media_element_tracks_store");
var directfile_content_initializer_1 = require("../../core/init/directfile_content_initializer");
/**
 * Add ability to play file natively played by the browser
 * (`directfile` transport)
 * @param {Object} features
 */
function addDirectfileFeature(features) {
    features.directfile = { initDirectFile: directfile_content_initializer_1.default, mediaElementTracksStore: media_element_tracks_store_1.default };
}
exports.DIRECTFILE = addDirectfileFeature;
exports.default = addDirectfileFeature;
