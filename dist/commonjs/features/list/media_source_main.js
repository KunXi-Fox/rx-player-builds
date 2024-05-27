"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDIA_SOURCE_MAIN = void 0;
// eslint-disable-next-line max-len
var media_source_content_initializer_1 = require("../../core/init/media_source_content_initializer");
/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMediaSourceMainFeature(features) {
    features.mainThreadMediaSourceInit = media_source_content_initializer_1.default;
}
exports.MEDIA_SOURCE_MAIN = addMediaSourceMainFeature;
exports.default = addMediaSourceMainFeature;
