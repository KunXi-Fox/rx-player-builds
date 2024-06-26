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
import { IMetaPlaylist } from "../../../parsers/manifest/metaplaylist";
interface IMetaplaylistContentInfos {
    url: string;
    transport: "dash" | "smooth";
    duration?: number;
}
/**
 * From given information about wanted metaplaylist and contents,
 * get needed supplementary infos and build a standard metaplaylist.
 * @param {Array.<Object>} contentsInfos
 * @param {number|undefined} timeOffset
 * @returns {Promise<Object>} - metaplaylist
 */
declare function createMetaplaylist(contentsInfos: IMetaplaylistContentInfos[], timeOffset?: number): Promise<IMetaPlaylist>;
export default createMetaplaylist;
