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
import areSameStreamEvents from "./are_same_stream_events";
/**
 * Refresh local scheduled events list
 * @param {Array.<Object>} oldScheduledEvents
 * @param {Object} manifest
 * @returns {Array.<Object>}
 */
function refreshScheduledEventsList(oldScheduledEvents, manifest) {
    const scheduledEvents = [];
    const { periods } = manifest;
    for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const { streamEvents } = period;
        streamEvents.forEach(({ start, end, id, data }) => {
            for (let j = 0; j < oldScheduledEvents.length; j++) {
                const currentScheduledEvent = oldScheduledEvents[j];
                if (areSameStreamEvents(currentScheduledEvent, { id, start, end })) {
                    scheduledEvents.push(currentScheduledEvent);
                    return;
                }
            }
            let element;
            if (data.value.element !== undefined) {
                element = data.value.element;
            }
            else if (data.value.xmlData !== undefined) {
                // First, we will create a parent Element defining all namespaces that
                // should have been encountered until know.
                // This is needed because the DOMParser API might throw when
                // encountering unknown namespaced attributes or elements in the given
                // `<Event>` xml subset.
                let parentNode = data.value.xmlData.namespaces.reduce((acc, ns) => {
                    return acc + "xmlns:" + ns.key + "=\"" + ns.value + "\" ";
                }, "<toremove ");
                parentNode += ">";
                const parsedDom = new DOMParser()
                    .parseFromString(parentNode + data.value.xmlData.data + "</toremove>", "application/xml")
                    .documentElement;
                element = parsedDom.children.length > 0 ?
                    parsedDom.children[0] :
                    parsedDom.childNodes[0];
            }
            else {
                return;
            }
            const actualData = { type: data.type,
                value: Object.assign(Object.assign({}, data.value), { element }) };
            if (end === undefined) {
                const newScheduledEvent = { start,
                    id,
                    data: actualData,
                    publicEvent: { start,
                        data: actualData } };
                scheduledEvents.push(newScheduledEvent);
            }
            else {
                const newScheduledEvent = { start,
                    end,
                    id,
                    data: actualData,
                    publicEvent: { start,
                        end,
                        data: actualData } };
                scheduledEvents.push(newScheduledEvent);
            }
        });
    }
    return scheduledEvents;
}
export default refreshScheduledEventsList;
