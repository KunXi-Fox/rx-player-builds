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
import { IFeature } from "../../features";
/** Argument for the `setTextTrack` method. */
export interface ISetTextTrackArguments {
    /** The text track content. Should be a string in the format indicated by `type`. */
    data: string;
    /** The format the text track is in (e.g. "ttml" or "vtt") */
    type: string;
    /** Offset, in seconds, that will be added to each subtitle's start and end time. */
    timeOffset?: number;
    /**
     * Language the text track is in. This is sometimes needed to properly parse
     * the text track. For example for tracks in the "sami" format.
     */
    language?: string;
}
/**
 * Display custom text tracks in the given `textTrackElement`, synchronized
 * with the given `videoElement`.
 * @class TextTrackRenderer
 */
export default class TextTrackRenderer {
    /**
     * Add a given parser from the list of features.
     * @param {Array.<Function>} parsersList
     */
    static addParsers(parsersList: IFeature[]): void;
    private _displayer;
    /**
     * @param {Object} opts
     * @param {HTMLMediaElement} opts.videoElement - The media element the text
     * track has to be synchronized to.
     * @param {HTMLElement} opt.textTrackElement - The HTML element which will
     * contain the text tracks.
     */
    constructor({ videoElement, textTrackElement }: {
        videoElement: HTMLMediaElement;
        textTrackElement: HTMLElement;
    });
    /**
     * Set the currently displayed text track.
     * Replace previous one if one was already set.
     * @param {Object} args
     */
    setTextTrack(args: ISetTextTrackArguments): void;
    /**
     * Completely remove the current text track.
     */
    removeTextTrack(): void;
    /**
     * Dispose of most ressources taken by the TextTrackRenderer.
     * /!\ The TextTrackRenderer will be unusable after this method has been
     * called.
     */
    dispose(): void;
}
