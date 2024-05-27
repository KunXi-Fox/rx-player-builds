"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MULTI_THREAD = void 0;
// eslint-disable-next-line max-len
var multi_thread_content_initializer_1 = require("../../core/init/multithread/main_thread/multi_thread_content_initializer");
/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMultiThreadFeature(features) {
    features.multithread = { init: multi_thread_content_initializer_1.default };
}
exports.MULTI_THREAD = addMultiThreadFeature;
exports.default = addMultiThreadFeature;
