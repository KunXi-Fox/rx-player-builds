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
import log from "../log";
import arrayFindIndex from "../utils/array_find_index";
import { MANIFEST_UPDATE_TYPE, } from "./types";
/**
 * Update oldPeriod attributes with the one from newPeriod (e.g. when updating
 * the Manifest).
 * @param {Object} oldPeriod
 * @param {Object} newPeriod
 * @param {number} updateType
 * @returns {Object}
 */
export default function updatePeriodInPlace(oldPeriod, newPeriod, updateType) {
    const res = {
        updatedAdaptations: [],
        removedAdaptations: [],
        addedAdaptations: [],
    };
    oldPeriod.start = newPeriod.start;
    oldPeriod.end = newPeriod.end;
    oldPeriod.duration = newPeriod.duration;
    oldPeriod.streamEvents = newPeriod.streamEvents;
    const oldAdaptations = oldPeriod.getAdaptations();
    const newAdaptations = newPeriod.getAdaptations();
    for (let j = 0; j < oldAdaptations.length; j++) {
        const oldAdaptation = oldAdaptations[j];
        const newAdaptationIdx = arrayFindIndex(newAdaptations, a => a.id === oldAdaptation.id);
        if (newAdaptationIdx === -1) {
            log.warn("Manifest: Adaptation \"" +
                oldAdaptations[j].id +
                "\" not found when merging.");
            const [removed] = oldAdaptations.splice(j, 1);
            j--;
            res.removedAdaptations.push({
                id: removed.id,
                trackType: removed.type,
            });
        }
        else {
            const [newAdaptation] = newAdaptations.splice(newAdaptationIdx, 1);
            const updatedRepresentations = [];
            const addedRepresentations = [];
            const removedRepresentations = [];
            res.updatedAdaptations.push({ adaptation: oldAdaptation.id,
                trackType: oldAdaptation.type,
                updatedRepresentations,
                addedRepresentations,
                removedRepresentations });
            const oldRepresentations = oldAdaptation.representations;
            const newRepresentations = newAdaptation.representations.slice();
            for (let k = 0; k < oldRepresentations.length; k++) {
                const oldRepresentation = oldRepresentations[k];
                const newRepresentationIdx = arrayFindIndex(newRepresentations, representation => representation.id === oldRepresentation.id);
                if (newRepresentationIdx === -1) {
                    log.warn(`Manifest: Representation "${oldRepresentations[k].id}" ` +
                        "not found when merging.");
                    const [removed] = oldRepresentations.splice(k, 1);
                    k--;
                    removedRepresentations.push(removed.id);
                }
                else {
                    const [newRepresentation] = newRepresentations.splice(newRepresentationIdx, 1);
                    updatedRepresentations.push(oldRepresentation.getMetadataSnapshot());
                    oldRepresentation.cdnMetadata = newRepresentation.cdnMetadata;
                    if (updateType === MANIFEST_UPDATE_TYPE.Full) {
                        oldRepresentation.index._replace(newRepresentation.index);
                    }
                    else {
                        oldRepresentation.index._update(newRepresentation.index);
                    }
                }
            }
            if (newRepresentations.length > 0) {
                log.warn(`Manifest: ${newRepresentations.length} new Representations ` +
                    "found when merging.");
                oldAdaptation.representations.push(...newRepresentations);
                addedRepresentations.push(...newRepresentations.map(r => r.getMetadataSnapshot()));
            }
        }
    }
    if (newAdaptations.length > 0) {
        log.warn(`Manifest: ${newAdaptations.length} new Adaptations ` +
            "found when merging.");
        for (const adap of newAdaptations) {
            const prevAdaps = oldPeriod.adaptations[adap.type];
            if (prevAdaps === undefined) {
                oldPeriod.adaptations[adap.type] = [adap];
            }
            else {
                prevAdaps.push(adap);
            }
            res.addedAdaptations.push(adap.getMetadataSnapshot());
        }
    }
    return res;
}
