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
exports.getFilenameIndexInUrl = void 0;
// Scheme part of an url (e.g. "http://").
var schemeRe = /^(?:[a-z]+:)?\/\//i;
// Captures "/../" or "/./".
var selfDirRe = /\/\.{1,2}\//;
/**
 * Resolve self directory and previous directory references to obtain a
 * "normalized" url.
 * @example "https://foo.bar/baz/booz/../biz" => "https://foo.bar/baz/biz"
 * @param {string} url
 * @returns {string}
 */
function _normalizeUrl(url) {
    // fast path if no ./ or ../ are present in the url
    if (!selfDirRe.test(url)) {
        return url;
    }
    var newUrl = [];
    var oldUrl = url.split("/");
    for (var i = 0, l = oldUrl.length; i < l; i++) {
        if (oldUrl[i] === "..") {
            newUrl.pop();
        }
        else if (oldUrl[i] === ".") {
            continue;
        }
        else {
            newUrl.push(oldUrl[i]);
        }
    }
    return newUrl.join("/");
}
/**
 * Construct an url from the arguments given.
 * Basically:
 *   - The last arguments that contains a scheme (e.g. "http://") is the base
 *     of the url.
 *   - every subsequent string arguments are concatened to it.
 * @param {...string|undefined} args
 * @returns {string}
 */
function resolveURL() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var len = args.length;
    if (len === 0) {
        return "";
    }
    var base = "";
    for (var i = 0; i < len; i++) {
        var part = args[i];
        if (typeof part !== "string" || part === "") {
            continue;
        }
        if (schemeRe.test(part)) {
            base = part;
        }
        else {
            try {
                // try use window.URL first
                if (base) {
                    var baseUrl = new URL(base);
                    if (!baseUrl.pathname.endsWith("/")) {
                        baseUrl.pathname += "/";
                    }
                    base = baseUrl.toString();
                }
                base = new URL(part, base).toString();
            }
            catch (_a) {
                // trim if begins with "/"
                if (part[0] === "/") {
                    part = part.substring(1);
                }
                // trim if ends with "/"
                if (base[base.length - 1] === "/") {
                    base = base.substring(0, base.length - 1);
                }
                base = base + "/" + part;
            }
        }
    }
    return _normalizeUrl(base);
}
exports.default = resolveURL;
/**
 * In a given URL, find the index at which the filename begins.
 * That is, this function finds the index of the last `/` character and returns
 * the index after it, returning the length of the whole URL if no `/` was found
 * after the scheme (i.e. in `http://`, the slashes are not considered).
 * @param {string} url
 * @returns {number}
 */
function getFilenameIndexInUrl(url) {
    var indexOfLastSlash = url.lastIndexOf("/");
    if (indexOfLastSlash < 0) {
        return url.length;
    }
    if (schemeRe.test(url)) {
        var firstSlashIndex = url.indexOf("/");
        if (firstSlashIndex >= 0 && indexOfLastSlash === firstSlashIndex + 1) {
            // The "/" detected is actually the one from the protocol part of the URL
            // ("https://")
            return url.length;
        }
    }
    var indexOfQuestionMark = url.indexOf("?");
    if (indexOfQuestionMark >= 0 && indexOfQuestionMark < indexOfLastSlash) {
        // There are query parameters. Let's ignore them and re-run the logic
        // without
        return getFilenameIndexInUrl(url.substring(0, indexOfQuestionMark));
    }
    return indexOfLastSlash + 1;
}
exports.getFilenameIndexInUrl = getFilenameIndexInUrl;
