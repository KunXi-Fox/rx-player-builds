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
import { formatError, NetworkError, } from "../../../errors";
import { RequestError } from "../../../utils/request";
/**
 * Generate a new error from the infos given.
 * @param {string} code
 * @param {Error} error
 * @returns {Error}
 */
export default function errorSelector(error) {
    if (error instanceof RequestError) {
        return new NetworkError("PIPELINE_LOAD_ERROR", error);
    }
    return formatError(error, {
        defaultCode: "PIPELINE_LOAD_ERROR",
        defaultReason: "Unknown error when fetching the Manifest",
    });
}
