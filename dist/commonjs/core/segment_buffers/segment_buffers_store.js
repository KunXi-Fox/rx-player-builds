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
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var create_cancellable_promise_1 = require("../../utils/create_cancellable_promise");
var implementations_1 = require("./implementations");
var text_1 = require("./implementations/text");
var POSSIBLE_BUFFER_TYPES = ["audio",
    "video",
    "text"];
/**
 * Allows to easily create and dispose SegmentBuffers, which are interfaces to
 * push and remove segments.
 *
 * Only one SegmentBuffer per type is allowed at the same time:
 *
 *   - SegmentBuffers linked to a "native" media buffer (relying on a
 *     SourceBuffer: "audio" and "video" here) are reused if one is
 *     re-created.
 *
 *   - SegmentBuffers for custom types (the other types of media) are aborted
 *     each time a new one of the same type is created.
 *
 * To be able to use a SegmentBuffer linked to a native media buffer, you
 * will first need to create it, but also wait until the other one is either
 * created or explicitely disabled through the `disableSegmentBuffer` method.
 * The Promise returned by `waitForUsableBuffers` will emit when
 * that is the case.
 *
 * @class SegmentBuffersStore
 */
var SegmentBuffersStore = /** @class */ (function () {
    /**
     * @param {MediaSource} mediaSource
     * @constructor
     */
    function SegmentBuffersStore(mediaSource, hasVideo, textDisplayerInterface) {
        this._mediaSource = mediaSource;
        this._textInterface = textDisplayerInterface;
        this._hasVideo = hasVideo;
        this._initializedSegmentBuffers = {};
        this._onNativeBufferAddedOrDisabled = [];
    }
    /**
     * Returns true if the type is linked to a "native" media buffer (i.e. relying
     * on a SourceBuffer object, native to the browser).
     * Native media buffers needed for the current content must all be created
     * before the content begins to be played and cannot be disposed during
     * playback.
     * @param {string} bufferType
     * @returns {Boolean}
     */
    SegmentBuffersStore.isNative = function (bufferType) {
        return shouldHaveNativeBuffer(bufferType);
    };
    /**
     * Get all currently available buffer types.
     * /!\ This list can evolve at runtime depending on feature switching.
     * @returns {Array.<string>}
     */
    SegmentBuffersStore.prototype.getBufferTypes = function () {
        var bufferTypes = this.getNativeBufferTypes();
        if (this._textInterface !== null) {
            bufferTypes.push("text");
        }
        return bufferTypes;
    };
    /**
     * Get all "native" buffer types that should be created before beginning to
     * push contents.
     * @returns {Array.<string>}
     */
    SegmentBuffersStore.prototype.getNativeBufferTypes = function () {
        return this._hasVideo ? ["video", "audio"] : ["audio"];
    };
    /**
     * Returns the current "status" of the SegmentBuffer linked to the buffer
     * type given.
     *
     * This function will return  an object containing a key named `type` which
     * can be equal to either one of those three value:
     *
     *   - "initialized": A SegmentBuffer has been created for that type.
     *     You will in this case also have a second key, `value`, which will
     *     contain the related SegmentBuffer instance.
     *     Please note that you will need to wait until
     *     `this.waitForUsableBuffers()` has emitted before pushing segment
     *     data to a SegmentBuffer relying on a SourceBuffer.
     *
     *   - "disabled": The SegmentBuffer has been explicitely disabled for this
     *     type.
     *
     *   - "uninitialized": No action has yet been yet for that SegmentBuffer.
     *
     * @param {string} bufferType
     * @returns {Object|null}
     */
    SegmentBuffersStore.prototype.getStatus = function (bufferType) {
        var initializedBuffer = this._initializedSegmentBuffers[bufferType];
        return initializedBuffer === undefined ? { type: "uninitialized" } :
            initializedBuffer === null ? { type: "disabled" } :
                { type: "initialized",
                    value: initializedBuffer };
    };
    /**
     * Native media buffers (audio and video) needed for playing the current
     * content need to all be created (by creating SegmentBuffers linked to them)
     * before any one can be used.
     *
     * This function will return a Promise resolving when any and all native
     * SourceBuffers can be used.
     *
     * From https://w3c.github.io/media-source/#methods
     *   For example, a user agent may throw a QuotaExceededError
     *   exception if the media element has reached the HAVE_METADATA
     *   readyState. This can occur if the user agent's media engine
     *   does not support adding more tracks during playback.
     * @param {Object} cancelWaitSignal
     * @return {Promise}
     */
    SegmentBuffersStore.prototype.waitForUsableBuffers = function (cancelWaitSignal) {
        var _this = this;
        if (this._areNativeBuffersUsable()) {
            return Promise.resolve();
        }
        return (0, create_cancellable_promise_1.default)(cancelWaitSignal, function (res) {
            /* eslint-disable-next-line prefer-const */
            var onAddedOrDisabled;
            var removeCallback = function () {
                var indexOf = _this._onNativeBufferAddedOrDisabled.indexOf(onAddedOrDisabled);
                if (indexOf >= 0) {
                    _this._onNativeBufferAddedOrDisabled.splice(indexOf, 1);
                }
            };
            onAddedOrDisabled = function () {
                if (_this._areNativeBuffersUsable()) {
                    removeCallback();
                    res();
                }
            };
            _this._onNativeBufferAddedOrDisabled.push(onAddedOrDisabled);
            return removeCallback;
        });
    };
    /**
     * Explicitely disable the SegmentBuffer for a given buffer type.
     * A call to this function is needed at least for unused native buffer types
     * (usually "audio" and "video"), to be able to emit through
     * `waitForUsableBuffers` when conditions are met.
     * @param {string} bufferType
     */
    SegmentBuffersStore.prototype.disableSegmentBuffer = function (bufferType) {
        var currentValue = this._initializedSegmentBuffers[bufferType];
        if (currentValue === null) {
            log_1.default.warn("SBS: The ".concat(bufferType, " SegmentBuffer was already disabled."));
            return;
        }
        if (currentValue !== undefined) {
            throw new Error("Cannot disable an active SegmentBuffer.");
        }
        this._initializedSegmentBuffers[bufferType] = null;
        if (SegmentBuffersStore.isNative(bufferType)) {
            this._onNativeBufferAddedOrDisabled.forEach(function (cb) { return cb(); });
        }
    };
    /**
     * Creates a new SegmentBuffer associated to a type.
     * Reuse an already created one if a SegmentBuffer for the given type
     * already exists.
     *
     * Please note that you will need to wait until `this.waitForUsableBuffers()`
     * has emitted before pushing segment data to a SegmentBuffer of a native
     * type.
     * @param {string} bufferType
     * @param {string} codec
     * @returns {Object}
     */
    SegmentBuffersStore.prototype.createSegmentBuffer = function (bufferType, codec) {
        var memorizedSegmentBuffer = this._initializedSegmentBuffers[bufferType];
        if (shouldHaveNativeBuffer(bufferType)) {
            if (memorizedSegmentBuffer != null) {
                if (memorizedSegmentBuffer instanceof implementations_1.AudioVideoSegmentBuffer &&
                    memorizedSegmentBuffer.codec !== codec) {
                    log_1.default.warn("SB: Reusing native SegmentBuffer with codec", memorizedSegmentBuffer.codec, "for codec", codec);
                }
                else {
                    log_1.default.info("SB: Reusing native SegmentBuffer with codec", codec);
                }
                return memorizedSegmentBuffer;
            }
            log_1.default.info("SB: Adding native SegmentBuffer with codec", codec);
            var sourceBufferType = bufferType === "audio" ? "audio" /* SourceBufferType.Audio */ :
                "video" /* SourceBufferType.Video */;
            var nativeSegmentBuffer = new implementations_1.AudioVideoSegmentBuffer(sourceBufferType, codec, this._mediaSource);
            this._initializedSegmentBuffers[bufferType] = nativeSegmentBuffer;
            this._onNativeBufferAddedOrDisabled.forEach(function (cb) { return cb(); });
            return nativeSegmentBuffer;
        }
        if (memorizedSegmentBuffer != null) {
            log_1.default.info("SB: Reusing a previous custom SegmentBuffer for the type", bufferType);
            return memorizedSegmentBuffer;
        }
        var segmentBuffer;
        if (bufferType === "text") {
            log_1.default.info("SB: Creating a new text SegmentBuffer");
            if (this._textInterface === null) {
                throw new Error("HTML Text track feature not activated");
            }
            segmentBuffer = new text_1.default(this._textInterface);
            this._initializedSegmentBuffers.text = segmentBuffer;
            return segmentBuffer;
        }
        log_1.default.error("SB: Unknown buffer type:", bufferType);
        throw new errors_1.MediaError("BUFFER_TYPE_UNKNOWN", "The player wants to create a SegmentBuffer " +
            "of an unknown type.");
    };
    /**
     * Dispose of the active SegmentBuffer for the given type.
     * @param {string} bufferType
     */
    SegmentBuffersStore.prototype.disposeSegmentBuffer = function (bufferType) {
        var memorizedSegmentBuffer = this._initializedSegmentBuffers[bufferType];
        if (memorizedSegmentBuffer == null) {
            log_1.default.warn("SB: Trying to dispose a SegmentBuffer that does not exist");
            return;
        }
        log_1.default.info("SB: Aborting SegmentBuffer", bufferType);
        memorizedSegmentBuffer.dispose();
        delete this._initializedSegmentBuffers[bufferType];
    };
    /**
     * Dispose of all SegmentBuffer created on this SegmentBuffersStore.
     */
    SegmentBuffersStore.prototype.disposeAll = function () {
        var _this = this;
        POSSIBLE_BUFFER_TYPES.forEach(function (bufferType) {
            if (_this.getStatus(bufferType).type === "initialized") {
                _this.disposeSegmentBuffer(bufferType);
            }
        });
    };
    /**
     * Returns `true` when we're ready to push and decode contents to
     * SourceBuffers created by SegmentBuffers of a native buffer type.
     */
    SegmentBuffersStore.prototype._areNativeBuffersUsable = function () {
        var _this = this;
        var nativeBufferTypes = this.getNativeBufferTypes();
        var hasUnitializedBuffers = nativeBufferTypes.some(function (sbType) {
            return _this._initializedSegmentBuffers[sbType] === undefined;
        });
        if (hasUnitializedBuffers) {
            // one is not yet initialized/disabled
            return false;
        }
        var areAllDisabled = nativeBufferTypes.every(function (sbType) {
            return _this._initializedSegmentBuffers[sbType] === null;
        });
        if (areAllDisabled) {
            // they all are disabled: we can't play the content
            return false;
        }
        return true;
    };
    return SegmentBuffersStore;
}());
exports.default = SegmentBuffersStore;
/**
 * Returns true if the given buffeType has a linked SourceBuffer implementation,
 * false otherwise.
 * SourceBuffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeBuffer(bufferType) {
    return bufferType === "audio" || bufferType === "video";
}
