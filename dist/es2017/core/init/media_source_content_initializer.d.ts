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
import { IKeySystemOption } from "../../public_types";
import { ITransportPipelines } from "../../transports";
import { IReadOnlySharedReference } from "../../utils/reference";
import { IAdaptiveRepresentationSelectorArguments } from "../adaptive";
import { PlaybackObserver } from "../api";
import { IManifestFetcherSettings } from "../fetchers/manifest/manifest_fetcher";
import { ContentInitializer, ITextDisplayerOptions } from "./types";
import { IInitialTimeOptions } from "./utils/get_initial_time";
/**
 * Allows to load a new content thanks to the MediaSource Extensions (a.k.a. MSE)
 * Web APIs.
 *
 * Through this `ContentInitializer`, a Manifest will be fetched (and depending
 * on the situation, refreshed), a `MediaSource` instance will be linked to the
 * wanted `HTMLMediaElement` and chunks of media data, called segments, will be
 * pushed on buffers associated to this `MediaSource` instance.
 *
 * @class MediaSourceContentInitializer
 */
export default class MediaSourceContentInitializer extends ContentInitializer {
    /** Constructor settings associated to this `MediaSourceContentInitializer`. */
    private _settings;
    /**
     * `TaskCanceller` allowing to abort everything that the
     * `MediaSourceContentInitializer` is doing.
     */
    private _initCanceller;
    /** Interface allowing to fetch and refresh the Manifest. */
    private _manifestFetcher;
    /**
     * Reference to the `Manifest` Object:
     *   - as an asynchronous value if it is still in the process of being loaded.
     *   - as an synchronous value if it has been loaded
     *   - `null` if the load task has not started yet.
     */
    private _manifest;
    /**
     * Create a new `MediaSourceContentInitializer`, associated to the given
     * settings.
     * @param {Object} settings
     */
    constructor(settings: IInitializeArguments);
    /**
     * Perform non-destructive preparation steps, to prepare a future content.
     * For now, this mainly mean loading the Manifest document.
     */
    prepare(): void;
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    start(mediaElement: HTMLMediaElement, playbackObserver: PlaybackObserver): void;
    /**
     * Update URL of the Manifest.
     * @param {Array.<string>|undefined} urls - URLs to reach that Manifest from
     * the most prioritized URL to the least prioritized URL.
     * @param {boolean} refreshNow - If `true` the resource in question (e.g.
     * DASH's MPD) will be refreshed immediately.
     */
    updateContentUrls(urls: string[] | undefined, refreshNow: boolean): void;
    dispose(): void;
    private _onFatalError;
    private _initializeMediaSourceAndDecryption;
    private _onInitialMediaSourceReady;
    /**
     * Buffer the content on the given MediaSource.
     * @param {Object} args
     * @param {function} onReloadOrder
     * @param {Object} cancelSignal
     */
    private _startBufferingOnMediaSource;
    /**
     * Creates a `RebufferingController`, a class trying to avoid various stalling
     * situations (such as rebuffering periods), and returns it.
     *
     * Various methods from that class need then to be called at various events
     * (see `RebufferingController` definition).
     *
     * This function also handles the `RebufferingController`'s events:
     *   - emit "stalled" events when stalling situations cannot be prevented,
     *   - emit "unstalled" events when we could get out of one,
     *   - emit "warning" on various rebuffering-related minor issues
     *     like discontinuity skipping.
     * @param {Object} playbackObserver
     * @param {Object} manifest
     * @param {Object} speed
     * @param {Object} cancelSignal
     * @returns {Object}
     */
    private _createRebufferingController;
}
/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
    /** Options concerning the ABR logic. */
    adaptiveOptions: IAdaptiveRepresentationSelectorArguments;
    /** `true` if we should play when loaded. */
    autoPlay: boolean;
    /** Options concerning the media buffers. */
    bufferOptions: {
        /** Buffer "goal" at which we stop downloading new segments. */
        wantedBufferAhead: IReadOnlySharedReference<number>;
        /** Buffer maximum size in kiloBytes at which we stop downloading */
        maxVideoBufferSize: IReadOnlySharedReference<number>;
        /** Max buffer size after the current position, in seconds (we GC further up). */
        maxBufferAhead: IReadOnlySharedReference<number>;
        /** Max buffer size before the current position, in seconds (we GC further down). */
        maxBufferBehind: IReadOnlySharedReference<number>;
        /**
         * Enable/Disable fastSwitching: allow to replace lower-quality segments by
         * higher-quality ones to have a faster transition.
         */
        enableFastSwitching: boolean;
        /** Behavior when a new video and/or audio codec is encountered. */
        onCodecSwitch: "continue" | "reload";
    };
    /** Every encryption configuration set. */
    keySystems: IKeySystemOption[];
    /** `true` to play low-latency contents optimally. */
    lowLatencyMode: boolean;
    /** Settings linked to Manifest requests. */
    manifestRequestSettings: IManifestFetcherSettings;
    /** Logic linked Manifest and segment loading and parsing. */
    transport: ITransportPipelines;
    /** Configuration for the segment requesting logic. */
    segmentRequestOptions: {
        lowLatencyMode: boolean;
        /**
         * Amount of time after which a request should be aborted.
         * `undefined` indicates that a default value is wanted.
         * `-1` indicates no timeout.
         */
        requestTimeout: number | undefined;
        /**
         * Amount of time, in milliseconds, after which a request that hasn't receive
         * the headers and status code should be aborted and optionnaly retried,
         * depending on the maxRetry configuration.
         */
        connectionTimeout: number | undefined;
        /** Maximum number of time a request on error will be retried. */
        maxRetry: number | undefined;
    };
    /** Emit the playback rate (speed) set by the user. */
    speed: IReadOnlySharedReference<number>;
    /** The configured starting position. */
    startAt?: IInitialTimeOptions | undefined;
    /** Configuration specific to the text track. */
    textTrackOptions: ITextDisplayerOptions;
    /** URL of the Manifest. `undefined` if unknown or not pertinent. */
    url: string | undefined;
}
