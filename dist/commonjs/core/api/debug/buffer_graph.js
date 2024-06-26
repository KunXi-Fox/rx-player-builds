"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BUFFER_WIDTH_IN_SECONDS = 30 * 60;
var COLORS = [
    "#2ab7ca",
    "#fed766",
    "#4dd248",
    "#a22c28",
    "#556b2f", // darkolivegreen
    "#add8e6", // lightblue
    "#90ee90", // lightgreen
    "#444444",
    "#40bfc1",
    "#57557e",
    "#fbe555",
];
var SegmentBufferGraph = /** @class */ (function () {
    function SegmentBufferGraph(canvasElt) {
        this._colorMap = new WeakMap();
        this._currNbColors = 0;
        this._canvasElt = canvasElt;
        this._canvasCtxt = this._canvasElt.getContext("2d");
        this.clear();
    }
    SegmentBufferGraph.prototype.clear = function () {
        if (this._canvasCtxt !== null) {
            this._canvasCtxt.clearRect(0, 0, this._canvasElt.width, this._canvasElt.height);
        }
    };
    SegmentBufferGraph.prototype.update = function (data) {
        var _a, _b, _c, _d;
        if (this._canvasCtxt === null) {
            return;
        }
        var inventory = data.inventory, currentTime = data.currentTime, width = data.width, height = data.height;
        this._canvasElt.style.width = "".concat(width, "px");
        this._canvasElt.style.height = "".concat(height, "px");
        this._canvasElt.width = width;
        this._canvasElt.height = height;
        this.clear();
        var minimumPoint;
        if (data.minimumPosition !== undefined) {
            if (inventory.length > 0) {
                minimumPoint = Math.min(data.minimumPosition, inventory[0].start);
            }
            else {
                minimumPoint = data.minimumPosition;
            }
        }
        else {
            minimumPoint = (_b = (_a = inventory[0]) === null || _a === void 0 ? void 0 : _a.start) !== null && _b !== void 0 ? _b : 0;
        }
        var maximumPoint;
        if (data.maximumPosition !== undefined) {
            if (inventory.length > 0) {
                maximumPoint = Math.max(data.maximumPosition, inventory[inventory.length - 1].end);
            }
            else {
                maximumPoint = data.maximumPosition;
            }
        }
        else {
            maximumPoint = (_d = (_c = inventory[inventory.length - 1]) === null || _c === void 0 ? void 0 : _c.end) !== null && _d !== void 0 ? _d : 1000;
        }
        minimumPoint = Math.min(currentTime, minimumPoint);
        maximumPoint = Math.max(currentTime, maximumPoint);
        var minimumPosition;
        var maximumPosition;
        if (maximumPoint - minimumPoint > BUFFER_WIDTH_IN_SECONDS) {
            if (maximumPoint - currentTime < BUFFER_WIDTH_IN_SECONDS / 2) {
                maximumPosition = maximumPoint;
                minimumPosition = maximumPoint - BUFFER_WIDTH_IN_SECONDS;
            }
            else if (currentTime - minimumPoint < BUFFER_WIDTH_IN_SECONDS / 2) {
                minimumPosition = minimumPoint;
                maximumPosition = minimumPoint + BUFFER_WIDTH_IN_SECONDS;
            }
            else {
                minimumPosition = currentTime - BUFFER_WIDTH_IN_SECONDS / 2;
                maximumPosition = currentTime + BUFFER_WIDTH_IN_SECONDS / 2;
            }
        }
        else {
            minimumPosition = minimumPoint;
            maximumPosition = maximumPoint;
        }
        if (minimumPosition >= maximumPosition) {
            this.clear();
            return;
        }
        var currentRangesScaled = scaleSegments(inventory, minimumPosition, maximumPosition);
        for (var i = 0; i < currentRangesScaled.length; i++) {
            this._paintRange(currentRangesScaled[i], width, height);
        }
        if (currentTime !== undefined) {
            paintCurrentPosition(currentTime, minimumPosition, maximumPosition, this._canvasCtxt, width, height);
        }
    };
    /**
     * Paint a given range in the canvas
     * @param {Object} rangeScaled - Buffered segment information with added
     * "scaling" information to know where it fits in the canvas.
     */
    SegmentBufferGraph.prototype._paintRange = function (rangeScaled, width, height) {
        if (this._canvasCtxt === null) {
            return;
        }
        var startX = rangeScaled.scaledStart * width;
        var endX = rangeScaled.scaledEnd * width;
        this._canvasCtxt.fillStyle = this._getColorForRepresentation(rangeScaled.info.infos.representation);
        this._canvasCtxt.fillRect(Math.ceil(startX), 0, Math.ceil(endX - startX), height);
    };
    SegmentBufferGraph.prototype._getColorForRepresentation = function (representation) {
        var color = this._colorMap.get(representation);
        if (color !== undefined) {
            return color;
        }
        var newColor = COLORS[this._currNbColors % COLORS.length];
        this._currNbColors++;
        this._colorMap.set(representation, newColor);
        return newColor;
    };
    return SegmentBufferGraph;
}());
exports.default = SegmentBufferGraph;
/**
 * Represent the current position in the canvas.
 * @param {number|undefined} position - The current position
 * @param {number} minimumPosition - minimum possible position represented in
 * the canvas.
 * @param {number} maximumPosition - maximum possible position represented in
 * the canvas.
 * @param {Object} canvasCtx - The canvas' 2D context
 */
function paintCurrentPosition(position, minimumPosition, maximumPosition, canvasCtx, width, height) {
    if (typeof position === "number" &&
        position >= minimumPosition &&
        position < maximumPosition) {
        var lengthCanvas = maximumPosition - minimumPosition;
        canvasCtx.fillStyle = "#FF0000";
        canvasCtx.fillRect(Math.ceil((position - minimumPosition) /
            lengthCanvas * width) - 1, 5, 5, height);
    }
}
/**
 * Scale given bufferedData in terms of percentage between the minimum and
 * maximum position. Filter out ranges which are not part of it.
 * @param {Array.<Object>} bufferedData
 * @param {number} minimumPosition
 * @param {number} maximumPosition
 * @returns {Array.<Object>}
 */
function scaleSegments(bufferedData, minimumPosition, maximumPosition) {
    var scaledSegments = [];
    var wholeDuration = maximumPosition - minimumPosition;
    for (var i = 0; i < bufferedData.length; i++) {
        var info = bufferedData[i];
        var start = info.bufferedStart === undefined ?
            info.start :
            info.bufferedStart;
        var end = info.bufferedEnd === undefined ?
            info.end :
            info.bufferedEnd;
        if (end > minimumPosition && start < maximumPosition) {
            var startPoint = Math.max(start - minimumPosition, 0);
            var endPoint = Math.min(end - minimumPosition, maximumPosition);
            var scaledStart = startPoint / wholeDuration;
            var scaledEnd = endPoint / wholeDuration;
            scaledSegments.push({ scaledStart: scaledStart, scaledEnd: scaledEnd, info: info });
        }
    }
    return scaledSegments;
}
