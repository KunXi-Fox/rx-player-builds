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
import { IPeriodAttributes, IPeriodChildren } from "../../../node_parser_types";
import ParsersStack, { IAttributeParser, IChildrenParser } from "../parsers_stack";
/**
 * Generate a "children parser" once inside a `Perod` node.
 * @param {Object} periodChildren
 * @param {WebAssembly.Memory} linearMemory
 * @param {ParsersStack} parsersStack
 * @param {ArrayBuffer} fullMpd
 * @returns {Function}
 */
export declare function generatePeriodChildrenParser(periodChildren: IPeriodChildren, linearMemory: WebAssembly.Memory, parsersStack: ParsersStack, fullMpd: ArrayBuffer): IChildrenParser;
/**
 * @param {Object} periodAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export declare function generatePeriodAttrParser(periodAttrs: IPeriodAttributes, linearMemory: WebAssembly.Memory): IAttributeParser;
