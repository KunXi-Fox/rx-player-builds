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
 * Array.prototype.find ponyfill.
 * @param {Array} arr
 * @param {Function} predicate
 * @param {*} context
 * @returns {boolean}
 */
function arrayFindIndex(arr, predicate, thisArg) {
    if (typeof Array.prototype.findIndex === "function") {
        return arr.findIndex(predicate, thisArg);
    }
    var len = arr.length >>> 0;
    for (var i = 0; i < len; i++) {
        if (predicate.call(thisArg, arr[i], i, arr)) {
            return i;
        }
    }
    return -1;
}
exports.default = arrayFindIndex;
