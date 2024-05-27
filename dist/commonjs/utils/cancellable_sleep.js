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
var create_cancellable_promise_1 = require("./create_cancellable_promise");
/**
 * Wait the given `delay`, resolving the Promise when finished.
 *
 * The `cancellationSignal` given allows to cancel that timeout. In the case it
 * is triggered before the timeout ended, this function will reject the
 * corresponding `CancellationError` through the returned Promise.
 *
 * @param {number} delay - Delay to wait, in milliseconds
 * @param {Object} cancellationSignal - `CancellationSignal` allowing to abort
 * the timeout.
 * @returns {Promise} - Resolve on timeout completion, rejects on timeout
 * cancellation with the corresponding `CancellationError`.
 */
function cancellableSleep(delay, cancellationSignal) {
    return (0, create_cancellable_promise_1.default)(cancellationSignal, function (res) {
        var timeout = setTimeout(function () { return res(); }, delay);
        return function () { return clearTimeout(timeout); };
    });
}
exports.default = cancellableSleep;
