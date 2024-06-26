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
/**
 * This file exports a Player class with a default feature set.
 * This is the class used from a regular build.
 */
var is_debug_mode_enabled_1 = require("./compat/is_debug_mode_enabled");
var api_1 = require("./core/api");
var list_1 = require("./features/list");
var log_1 = require("./log");
api_1.default.addFeatures([
    list_1.SMOOTH,
    list_1.DASH,
    list_1.DIRECTFILE,
    list_1.EME,
    list_1.NATIVE_TTML_PARSER,
    list_1.NATIVE_SAMI_PARSER,
    list_1.NATIVE_VTT_PARSER,
    list_1.NATIVE_SRT_PARSER,
    list_1.HTML_TTML_PARSER,
    list_1.HTML_SAMI_PARSER,
    list_1.HTML_VTT_PARSER,
    list_1.HTML_SRT_PARSER,
]);
if ((0, is_debug_mode_enabled_1.default)()) {
    log_1.default.setLevel("DEBUG");
}
else if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
    log_1.default.setLevel("NONE" /* __LOGGER_LEVEL__.CURRENT_LEVEL */);
}
exports.default = api_1.default;
