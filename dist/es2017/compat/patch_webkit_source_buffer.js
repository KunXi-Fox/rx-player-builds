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
import EventEmitter from "../utils/event_emitter";
import globalScope from "../utils/global_scope";
import isNode from "../utils/is_node";
import queueMicrotask from "../utils/queue_microtask";
// TODO This is the last ugly side-effect here.
// Either remove it or find the best way to implement that
export default function patchWebkitSourceBuffer() {
    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-explicit-any */
    // old WebKit SourceBuffer implementation,
    // where a synchronous append is used instead of appendBuffer
    if (!isNode && globalScope.WebKitSourceBuffer != null &&
        globalScope.WebKitSourceBuffer.prototype.addEventListener === undefined) {
        /* eslint-enable @typescript-eslint/no-explicit-any */
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        const sourceBufferWebkitRef = globalScope.WebKitSourceBuffer;
        const sourceBufferWebkitProto = sourceBufferWebkitRef.prototype;
        for (const fnName in EventEmitter.prototype) {
            if (EventEmitter.prototype.hasOwnProperty(fnName)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sourceBufferWebkitProto[fnName] = EventEmitter.prototype[fnName];
            }
        }
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        sourceBufferWebkitProto._listeners = [];
        sourceBufferWebkitProto._emitUpdate =
            function (eventName, val) {
                queueMicrotask(() => {
                    /* eslint-disable no-invalid-this */
                    this.trigger(eventName, val);
                    this.updating = false;
                    this.trigger("updateend");
                    /* eslint-enable no-invalid-this */
                });
            };
        sourceBufferWebkitProto.appendBuffer =
            function (data) {
                /* eslint-disable no-invalid-this */
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                if (this.updating) {
                    throw new Error("updating");
                }
                this.trigger("updatestart");
                this.updating = true;
                try {
                    this.append(data);
                }
                catch (error) {
                    this._emitUpdate("error", error);
                    return;
                }
                this._emitUpdate("update");
                /* eslint-enable no-invalid-this */
            };
    }
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    /* eslint-enable @typescript-eslint/no-unsafe-call */
}
