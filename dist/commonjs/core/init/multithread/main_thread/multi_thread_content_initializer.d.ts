import { IKeySystemOption } from "../../../../public_types";
import { ITransportOptions } from "../../../../transports";
import { IReadOnlySharedReference } from "../../../../utils/reference";
import { IAdaptiveRepresentationSelectorArguments } from "../../../adaptive";
import { PlaybackObserver } from "../../../api";
import { IManifestFetcherSettings } from "../../../fetchers";
import { ContentInitializer, ITextDisplayerOptions } from "../../types";
import { IInitialTimeOptions } from "../../utils/get_initial_time";
/**
 * @class MultiThreadContentInitializer
 */
export default class MultiThreadContentInitializer extends ContentInitializer {
    /** Constructor settings associated to this `MultiThreadContentInitializer`. */
    private _settings;
    /**
     * Information relative to the current loaded content.
     *
     * `null` when no content is prepared yet.
     */
    private _currentContentInfo;
    /**
     * `TaskCanceller` allowing to abort everything that the
     * `MultiThreadContentInitializer` is doing.
     */
    private _initCanceller;
    /**
     * `TaskCanceller` allowing to abort and clean-up every task and resource
     * linked to the current `MediaSource` instance.
     *
     * It may be triggered either at content stop (and thus at the same time than
     * the `_initCanceller`) or when reloading the content.
     */
    private _currentMediaSourceCanceller;
    /**
     * Create a new `MultiThreadContentInitializer`, associated to the given
     * settings.
     * @param {Object} settings
     */
    constructor(settings: IInitializeArguments);
    /**
     * Perform non-destructive preparation steps, to prepare a future content.
     */
    prepare(): void;
    /**
     * Update URL of the Manifest.
     * @param {Array.<string>|undefined} urls - URLs to reach that Manifest from
     * the most prioritized URL to the least prioritized URL.
     * @param {boolean} refreshNow - If `true` the resource in question (e.g.
     * DASH's MPD) will be refreshed immediately.
     */
    updateContentUrls(urls: string[] | undefined, refreshNow: boolean): void;
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    start(mediaElement: HTMLMediaElement, playbackObserver: PlaybackObserver): void;
    dispose(): void;
    private _onFatalError;
    private _initializeContentDecryption;
    private _hasTextBufferFeature;
    private _reload;
    /**
     * Start-up modules and mechanisms (initial seek, auto-play etc.) needed each
     * time a content is loaded AND re-loaded on a `HTMLMediaElement`, when the
     * manifest is known.
     *
     * Note that this does not include reacting to incoming worker messages nor
     * sending them, those actions have to be handled separately.
     *
     * @param {Object} parameters
     * @param {Object} cancelSignal
     * @returns {Object|null} - Playback Observer created for this content. `null`
     * only if playback initialization failed (most likely because it has been
     * cancelled).
     */
    private _setUpModulesOnNewMediaSource;
    /**
     * Initialize content playback if and only if those conditions are filled:
     *   - The Manifest is fetched and stored in `this._currentContentInfo`.
     *   - `drmInitializationStatus` indicates that DRM matters are initialized.
     *   - `mediaSourceStatus` indicates that the MediaSource is attached to the
     *     `mediaElement`.
     *
     * In other cases, this method will do nothing.
     *
     * To call when any of those conditions might become `true`, to start-up
     * playback.
     *
     * @param {Object} parameters
     * @returns {boolean} - Returns `true` if all conditions where met for
     * playback start.
     */
    private _startPlaybackIfReady;
    /**
     * Handles Worker messages asking to create a MediaSource.
     * @param {Object} msg - The worker's message received.
     * @param {HTMLMediaElement} mediaElement - HTMLMediaElement on which the
     * content plays.
     * @param {Worker} worker - The WebWorker concerned, messages may be sent back
     * to it.
     */
    private _onCreateMediaSourceMessage;
}
/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
    worker: Worker;
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
    /** Options relative to the streaming protocol. */
    transportOptions: Omit<ITransportOptions, "manifestLoader" | "segmentLoader" | "representationFilter"> & {
        manifestLoader: undefined;
        segmentLoader: undefined;
        representationFilter: string | undefined;
    };
    /** Settings linked to Manifest requests. */
    manifestRequestSettings: IManifestFetcherSettings;
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
