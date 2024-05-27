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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_ADAPTATIONS_TYPE = exports.StaticRepresentationIndex = exports.Representation = exports.Adaptation = exports.Period = exports.updateDecipherabilityFromProtectionData = exports.updateDecipherabilityFromKeyIds = exports.toTaggedTrack = exports.toTextTrack = exports.toVideoTrack = exports.toAudioTrack = exports.replicateUpdatesOnManifestMetadata = exports.getAdaptations = exports.getSupportedAdaptations = exports.getMaximumSafePosition = exports.getMinimumSafePosition = exports.getLivePosition = exports.getPeriodAfter = exports.getPeriodForTime = exports.getLoggableSegmentId = exports.createRepresentationFilterFromFnString = exports.areSameContent = void 0;
var adaptation_1 = require("./adaptation");
exports.Adaptation = adaptation_1.default;
Object.defineProperty(exports, "SUPPORTED_ADAPTATIONS_TYPE", { enumerable: true, get: function () { return adaptation_1.SUPPORTED_ADAPTATIONS_TYPE; } });
var manifest_1 = require("./manifest");
var period_1 = require("./period");
exports.Period = period_1.default;
var representation_1 = require("./representation");
exports.Representation = representation_1.default;
var representation_index_1 = require("./representation_index");
Object.defineProperty(exports, "StaticRepresentationIndex", { enumerable: true, get: function () { return representation_index_1.StaticRepresentationIndex; } });
var utils_1 = require("./utils");
Object.defineProperty(exports, "areSameContent", { enumerable: true, get: function () { return utils_1.areSameContent; } });
Object.defineProperty(exports, "createRepresentationFilterFromFnString", { enumerable: true, get: function () { return utils_1.createRepresentationFilterFromFnString; } });
Object.defineProperty(exports, "getLoggableSegmentId", { enumerable: true, get: function () { return utils_1.getLoggableSegmentId; } });
Object.defineProperty(exports, "getLivePosition", { enumerable: true, get: function () { return utils_1.getLivePosition; } });
Object.defineProperty(exports, "getMinimumSafePosition", { enumerable: true, get: function () { return utils_1.getMinimumSafePosition; } });
Object.defineProperty(exports, "getMaximumSafePosition", { enumerable: true, get: function () { return utils_1.getMaximumSafePosition; } });
Object.defineProperty(exports, "getSupportedAdaptations", { enumerable: true, get: function () { return utils_1.getSupportedAdaptations; } });
Object.defineProperty(exports, "getAdaptations", { enumerable: true, get: function () { return utils_1.getAdaptations; } });
Object.defineProperty(exports, "getPeriodForTime", { enumerable: true, get: function () { return utils_1.getPeriodForTime; } });
Object.defineProperty(exports, "getPeriodAfter", { enumerable: true, get: function () { return utils_1.getPeriodAfter; } });
Object.defineProperty(exports, "toAudioTrack", { enumerable: true, get: function () { return utils_1.toAudioTrack; } });
Object.defineProperty(exports, "toVideoTrack", { enumerable: true, get: function () { return utils_1.toVideoTrack; } });
Object.defineProperty(exports, "toTextTrack", { enumerable: true, get: function () { return utils_1.toTextTrack; } });
Object.defineProperty(exports, "toTaggedTrack", { enumerable: true, get: function () { return utils_1.toTaggedTrack; } });
Object.defineProperty(exports, "updateDecipherabilityFromKeyIds", { enumerable: true, get: function () { return utils_1.updateDecipherabilityFromKeyIds; } });
Object.defineProperty(exports, "updateDecipherabilityFromProtectionData", { enumerable: true, get: function () { return utils_1.updateDecipherabilityFromProtectionData; } });
Object.defineProperty(exports, "replicateUpdatesOnManifestMetadata", { enumerable: true, get: function () { return utils_1.replicateUpdatesOnManifestMetadata; } });
exports.default = manifest_1.default;
__exportStar(require("./types"), exports);
