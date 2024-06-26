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
 * Tweaked implementation of an exponential weighted Moving Average.
 * @class EWMA
 */
var EWMA = /** @class */ (function () {
    /**
     * @param {number} halfLife
     */
    function EWMA(halfLife) {
        // (half-life = log(1/2) / log(Decay Factor)
        this._alpha = Math.exp(Math.log(0.5) / halfLife);
        this._lastEstimate = 0;
        this._totalWeight = 0;
    }
    /**
     * @param {number} weight
     * @param {number} value
     */
    EWMA.prototype.addSample = function (weight, value) {
        var adjAlpha = Math.pow(this._alpha, weight);
        var newEstimate = value * (1 - adjAlpha) +
            adjAlpha * this._lastEstimate;
        if (!isNaN(newEstimate)) {
            this._lastEstimate = newEstimate;
            this._totalWeight += weight;
        }
    };
    /**
     * @returns {number} value
     */
    EWMA.prototype.getEstimate = function () {
        var zeroFactor = 1 - Math.pow(this._alpha, this._totalWeight);
        return this._lastEstimate / zeroFactor;
    };
    return EWMA;
}());
exports.default = EWMA;
