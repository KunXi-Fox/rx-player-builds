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
import { IManifestLoader, ILoadedManifestFormat } from "../../public_types";
import { CancellationSignal } from "../../utils/task_canceller";
import { IManifestLoaderOptions, IRequestedData } from "../types";
/**
 * Generate a manifest loader for the application
 * @param {Function} [customManifestLoader]
 * @returns {Function}
 */
export default function generateManifestLoader({ customManifestLoader }: {
    customManifestLoader?: IManifestLoader | undefined;
}, preferredType: "arraybuffer" | "text" | "document"): (url: string | undefined, loaderOptions: IManifestLoaderOptions, cancelSignal: CancellationSignal) => Promise<IRequestedData<ILoadedManifestFormat>>;