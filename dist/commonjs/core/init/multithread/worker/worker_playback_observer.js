"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var playback_observer_1 = require("../../../api/playback_observer");
var send_message_1 = require("./send_message");
var WorkerPlaybackObserver = /** @class */ (function () {
    function WorkerPlaybackObserver(src, contentId, cancellationSignal) {
        this._src = src;
        this._contentId = contentId;
        this._cancelSignal = cancellationSignal;
    }
    WorkerPlaybackObserver.prototype.getCurrentTime = function () {
        return undefined;
    };
    WorkerPlaybackObserver.prototype.getReadyState = function () {
        return undefined;
    };
    WorkerPlaybackObserver.prototype.getIsPaused = function () {
        return undefined;
    };
    WorkerPlaybackObserver.prototype.getReference = function () {
        return this._src;
    };
    WorkerPlaybackObserver.prototype.setPlaybackRate = function (playbackRate) {
        (0, send_message_1.default)({ type: "update-playback-rate" /* WorkerMessageType.UpdatePlaybackRate */,
            contentId: this._contentId,
            value: playbackRate });
    };
    WorkerPlaybackObserver.prototype.getPlaybackRate = function () {
        return undefined;
    };
    WorkerPlaybackObserver.prototype.listen = function (cb, options) {
        var _a;
        if (this._cancelSignal.isCancelled() ||
            ((_a = options === null || options === void 0 ? void 0 : options.clearSignal) === null || _a === void 0 ? void 0 : _a.isCancelled()) === true) {
            return;
        }
        this._src.onUpdate(cb, {
            clearSignal: options === null || options === void 0 ? void 0 : options.clearSignal,
            emitCurrentValue: options === null || options === void 0 ? void 0 : options.includeLastObservation,
        });
    };
    WorkerPlaybackObserver.prototype.deriveReadOnlyObserver = function (transform) {
        return (0, playback_observer_1.generateReadOnlyObserver)(this, transform, this._cancelSignal);
    };
    return WorkerPlaybackObserver;
}());
exports.default = WorkerPlaybackObserver;
