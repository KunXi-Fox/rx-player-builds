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
var hasClassList;
/**
 * Add className to an HTMLElement. Do nothing if the className was already
 * added.
 * @param {HTMLElement} elt
 * @param {string} className
 */
function addClassName(elt, className) {
    if (hasClassList === undefined) {
        hasClassList = elt.classList !== undefined &&
            /* eslint-disable @typescript-eslint/unbound-method */
            typeof elt.classList.add === "function";
        /* eslint-enable @typescript-eslint/unbound-method */
    }
    if (hasClassList) {
        elt.classList.add(className);
    }
    else {
        var classNamesWithSpaces = " " + elt.className + " ";
        if (classNamesWithSpaces.indexOf(" " + className + " ") < 0) {
            elt.className += " " + className;
        }
    }
}
exports.default = addClassName;
