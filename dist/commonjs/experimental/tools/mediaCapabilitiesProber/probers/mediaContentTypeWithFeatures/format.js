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
var defaultCodecsFinder_1 = require("../defaultCodecsFinder");
/**
 * @param {Object} config
 * @returns {string|null}
 */
function formatTypeSupportedWithFeaturesConfigForAPI(config) {
    var video = config.video, audio = config.audio, outputHdcp = config.hdcp, display = config.display;
    var defaultVideoCodec = (0, defaultCodecsFinder_1.findDefaultVideoCodec)();
    var str = (function () {
        if (video === undefined ||
            video.contentType === undefined ||
            video.contentType.length === 0) {
            return defaultVideoCodec;
        }
        return video.contentType;
    })();
    if (audio !== undefined &&
        audio.contentType !== undefined &&
        audio.contentType.length > 0) {
        var regex = /codecs="(.*?)"/;
        var match = regex.exec(audio.contentType);
        if (match != null) {
            var codec = match[1];
            str = str.substring(0, str.length - 2) + "," + codec;
        }
    }
    var feat = [];
    if (video !== undefined &&
        video.width !== undefined &&
        video.width > 0) {
        feat.push("decode-res-x=" + video.width.toString() + "");
    }
    if (video !== undefined &&
        video.height !== undefined &&
        video.height > 0) {
        feat.push("decode-res-y=" + video.height.toString() + "");
    }
    if (video !== undefined &&
        video.bitsPerComponent !== undefined &&
        video.bitsPerComponent > 0) {
        feat.push("decode-bpc=" + video.bitsPerComponent.toString() + "");
    }
    if (video !== undefined &&
        video.bitrate !== undefined &&
        video.bitrate > 0) {
        feat.push("decode-bitrate=" + video.bitrate.toString() + "");
    }
    if (video !== undefined &&
        video.framerate !== undefined &&
        video.framerate.length > 0) {
        feat.push("decode-fps=" + video.framerate + "");
    }
    if (display !== undefined) {
        if (display.width !== undefined && display.width > 0) {
            feat.push("display-res-x=" + display.width.toString() + "");
        }
        if (display.height !== undefined && display.height > 0) {
            feat.push("display-res-y=" + display.height.toString() + "");
        }
        if (display.bitsPerComponent !== undefined && display.bitsPerComponent > 0) {
            feat.push("display-bpc=" + display.bitsPerComponent.toString() + "");
        }
    }
    if (outputHdcp !== undefined && outputHdcp.length > 0) {
        var specifiedHDCPinConfig = parseFloat(outputHdcp);
        var hdcp = specifiedHDCPinConfig >= 2.2 ? 2 : 1;
        feat.push("hdcp=" + hdcp.toString());
    }
    if (feat.length > 0) {
        str += ";" + "features=";
        str += "\"" + feat.join(",") + "\"";
    }
    return str;
}
exports.default = formatTypeSupportedWithFeaturesConfigForAPI;
