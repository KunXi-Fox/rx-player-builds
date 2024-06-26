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
import { ISegment, Representation } from "../../manifest";
import { ICdnMetadata } from "../../parsers/manifest";
/**
 * Returns `true` if the given Representation refers to segments in an MP4
 * container
 * @param {Representation} representation
 * @returns {Boolean}
 */
declare function isMP4EmbeddedTrack(representation: Representation): boolean;
declare function constructSegmentUrl(wantedCdn: ICdnMetadata | null, segment: ISegment): string | null;
export { constructSegmentUrl, isMP4EmbeddedTrack, };
