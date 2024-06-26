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
import { MediaError } from "../errors";
import arrayFind from "../utils/array_find";
import Adaptation from "./adaptation";
import { getAdaptations, getSupportedAdaptations, periodContainsTime, } from "./utils";
/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
export default class Period {
    /**
     * @constructor
     * @param {Object} args
     * @param {Array.<Object>} unsupportedAdaptations - Array on which
     * `Adaptation`s objects which have no supported `Representation` will be
     * pushed.
     * This array might be useful for minor error reporting.
     * @param {function|undefined} [representationFilter]
     */
    constructor(args, unsupportedAdaptations, representationFilter) {
        this.id = args.id;
        this.adaptations = Object.keys(args.adaptations)
            .reduce((acc, type) => {
            const adaptationsForType = args.adaptations[type];
            if (adaptationsForType == null) {
                return acc;
            }
            const filteredAdaptations = adaptationsForType
                .map((adaptation) => {
                const newAdaptation = new Adaptation(adaptation, { representationFilter });
                if (newAdaptation.representations.length > 0
                    && newAdaptation.isSupported === false) {
                    unsupportedAdaptations.push(newAdaptation);
                }
                return newAdaptation;
            })
                .filter((adaptation) => adaptation.representations.length > 0);
            if (filteredAdaptations.every(adaptation => adaptation.isSupported === false) &&
                adaptationsForType.length > 0 &&
                (type === "video" || type === "audio")) {
                throw new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "No supported " + type + " adaptations", { tracks: undefined });
            }
            if (filteredAdaptations.length > 0) {
                acc[type] = filteredAdaptations;
            }
            return acc;
        }, {});
        if (!Array.isArray(this.adaptations.video) &&
            !Array.isArray(this.adaptations.audio)) {
            throw new MediaError("MANIFEST_PARSE_ERROR", "No supported audio and video tracks.");
        }
        this.duration = args.duration;
        this.start = args.start;
        if (this.duration != null && this.start != null) {
            this.end = this.start + this.duration;
        }
        this.streamEvents = args.streamEvents === undefined ?
            [] :
            args.streamEvents;
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually with a clear list of codecs supported
     * once it has been requested on a compatible environment (e.g. in the main
     * thread) allows to work-around this issue.
     *
     * @param {Array.<Object>} supportList
     * @param {Array.<Object>} unsupportedAdaptations - Array on which
     * `Adaptation`s objects which are now known to have no supported
     * `Representation` will be pushed.
     * This array might be useful for minor error reporting.
     */
    refreshCodecSupport(supportList, unsupportedAdaptations) {
        Object.keys(this.adaptations).forEach((ttype) => {
            const adaptationsForType = this.adaptations[ttype];
            if (adaptationsForType === undefined) {
                return;
            }
            let hasSupportedAdaptations = false;
            for (const adaptation of adaptationsForType) {
                const wasSupported = adaptation.isSupported;
                adaptation.refreshCodecSupport(supportList);
                if (wasSupported !== false && adaptation.isSupported === false) {
                    unsupportedAdaptations.push(adaptation);
                }
                if (hasSupportedAdaptations === false) {
                    hasSupportedAdaptations = adaptation.isSupported;
                }
                else if (hasSupportedAdaptations === undefined &&
                    adaptation.isSupported === true) {
                    hasSupportedAdaptations = true;
                }
            }
            if ((ttype === "video" || ttype === "audio") &&
                hasSupportedAdaptations === false) {
                throw new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "No supported " + ttype + " adaptations", { tracks: undefined });
            }
        }, {});
    }
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
     * Array.
     * @returns {Array.<Object>}
     */
    getAdaptations() {
        return getAdaptations(this);
    }
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period for a
     * given type.
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType) {
        const adaptationsForType = this.adaptations[adaptationType];
        return adaptationsForType == null ? [] :
            adaptationsForType;
    }
    /**
     * Returns the Adaptation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getAdaptation(wantedId) {
        return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    }
    /**
     * Returns Adaptations that contain Representations in supported codecs.
     * @param {string|undefined} type - If set filter on a specific Adaptation's
     * type. Will return for all types if `undefined`.
     * @returns {Array.<Adaptation>}
     */
    getSupportedAdaptations(type) {
        return getSupportedAdaptations(this, type);
    }
    /**
     * Returns true if the give time is in the time boundaries of this `Period`.
     * @param {number} time
     * @param {object|null} nextPeriod - Period coming chronologically just
     * after in the same Manifest. `null` if this instance is the last `Period`.
     * @returns {boolean}
     */
    containsTime(time, nextPeriod) {
        return periodContainsTime(this, time, nextPeriod);
    }
    /**
     * Format the current `Period`'s properties into a
     * `IPeriodMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Period` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Period`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot() {
        const adaptations = {};
        const baseAdaptations = this.getAdaptations();
        for (const adaptation of baseAdaptations) {
            let currentAdaps = adaptations[adaptation.type];
            if (currentAdaps === undefined) {
                currentAdaps = [];
                adaptations[adaptation.type] = currentAdaps;
            }
            currentAdaps.push(adaptation.getMetadataSnapshot());
        }
        return { start: this.start,
            end: this.end,
            id: this.id,
            streamEvents: this.streamEvents,
            adaptations };
    }
}
