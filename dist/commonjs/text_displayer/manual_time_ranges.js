"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var assert_1 = require("../utils/assert");
var ranges_1 = require("../utils/ranges");
/**
 * Simulate TimeRanges as returned by SourceBuffer.prototype.buffered.
 * Add an "insert" and "remove" methods to manually update it.
 * @class ManualTimeRanges
 */
var ManualTimeRanges = /** @class */ (function () {
    function ManualTimeRanges() {
        this._ranges = [];
        this.length = 0;
    }
    ManualTimeRanges.prototype.insert = function (start, end) {
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            (0, assert_1.default)(start >= 0, "invalid start time");
            (0, assert_1.default)(end - start > 0, "invalid end time");
        }
        (0, ranges_1.insertInto)(this._ranges, { start: start, end: end });
        this.length = this._ranges.length;
    };
    ManualTimeRanges.prototype.remove = function (start, end) {
        if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
            (0, assert_1.default)(start >= 0, "invalid start time");
            (0, assert_1.default)(end - start > 0, "invalid end time");
        }
        var rangesToIntersect = [];
        if (start > 0) {
            rangesToIntersect.push({ start: 0, end: start });
        }
        if (end < Infinity) {
            rangesToIntersect.push({ start: end, end: Infinity });
        }
        this._ranges = (0, ranges_1.keepRangeIntersection)(this._ranges, rangesToIntersect);
        this.length = this._ranges.length;
    };
    ManualTimeRanges.prototype.start = function (index) {
        if (index >= this._ranges.length) {
            throw new Error("INDEX_SIZE_ERROR");
        }
        return this._ranges[index].start;
    };
    ManualTimeRanges.prototype.end = function (index) {
        if (index >= this._ranges.length) {
            throw new Error("INDEX_SIZE_ERROR");
        }
        return this._ranges[index].end;
    };
    return ManualTimeRanges;
}());
exports.default = ManualTimeRanges;
