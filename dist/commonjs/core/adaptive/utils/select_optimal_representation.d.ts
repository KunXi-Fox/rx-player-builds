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
import { Representation } from "../../../manifest";
/**
 * From the given array of Representations (sorted by bitrate order ascending),
 * returns the one corresponding to the given optimal, minimum and maximum
 * bitrates.
 * @param {Array.<Representation>} representations - The representations array,
 * sorted in bitrate ascending order.
 * @param {Number} wantedBitrate - The optimal bitrate the Representation
 * should have under the current condition.
 * @returns {Representation|undefined}
 */
export default function selectOptimalRepresentation(representations: Representation[], wantedBitrate: number): Representation;
