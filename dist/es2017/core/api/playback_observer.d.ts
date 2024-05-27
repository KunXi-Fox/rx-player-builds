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
import noop from "../../utils/noop";
import { IReadOnlySharedReference } from "../../utils/reference";
import { CancellationSignal } from "../../utils/task_canceller";
/**
 * Class allowing to "observe" current playback conditions so the RxPlayer is
 * then able to react upon them.
 *
 * This is a central class of the RxPlayer as many modules rely on the
 * `PlaybackObserver` to know the current state of the media being played.
 *
 * You can use the PlaybackObserver to either get the last observation
 * performed, get the current media state or listen to media observation sent
 * at a regular interval.
 *
 * @class {PlaybackObserver}
 */
export default class PlaybackObserver {
    /** HTMLMediaElement which we want to observe. */
    private _mediaElement;
    /** If `true`, a `MediaSource` object is linked to `_mediaElement`. */
    private _withMediaSource;
    /**
     * If `true`, we're playing in a low-latency mode, which might have an
     * influence on some chosen interval values here.
     */
    private _lowLatencyMode;
    /**
     * If set, position which could not yet be seeked to as the HTMLMediaElement
     * had a readyState of `0`.
     * This position should be seeked to as soon as the HTMLMediaElement is able
     * to handle it.
     */
    private _pendingSeek;
    /**
     * The RxPlayer usually wants to differientate when a seek was sourced from
     * the RxPlayer's internal logic vs when it was sourced from an outside
     * application code.
     *
     * To implement this in the PlaybackObserver, we maintain this counter
     * allowing to know when a "seeking" event received from a `HTMLMediaElement`
     * was due to an "internal seek" or an external seek:
     *   - This counter is incremented each time an "internal seek" (seek from the
     *     inside of the RxPlayer has been performed.
     *   - This counter is decremented each time we received a "seeking" event.
     *
     * This allows us to correctly characterize seeking events: if the counter is
     * superior to `0`, it is probably due to an internal "seek".
     */
    private _internalSeeksIncoming;
    /**
     * Stores the last playback observation produced by the `PlaybackObserver`.:
     */
    private _observationRef;
    /**
     * `TaskCanceller` allowing to free all resources and stop producing playback
     * observations.
     */
    private _canceller;
    /**
     * On some devices (right now only seen on Tizen), seeking through the
     * `currentTime` property can lead to the browser re-seeking once the
     * segments have been loaded to improve seeking performances (for
     * example, by seeking right to an intra video frame).
     * In that case, we risk being in a conflict with that behavior: if for
     * example we encounter a small discontinuity at the position the browser
     * seeks to, we will seek over it, the browser would seek back and so on.
     *
     * This variable allows to store the maximum known position we were seeking to
     * so we can detect when the browser seeked back (to avoid performing another
     * seek after that). When browsers seek back to a position behind a
     * discontinuity, they are usually able to skip them without our help.
     */
    private _expectedSeekingPosition;
    /**
     * Create a new `PlaybackObserver`, which allows to produce new "playback
     * observations" on various media events and intervals.
     *
     * Note that creating a `PlaybackObserver` lead to the usage of resources,
     * such as event listeners which will only be freed once the `stop` method is
     * called.
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} options
     */
    constructor(mediaElement: HTMLMediaElement, options: IPlaybackObserverOptions);
    /**
     * Stop the `PlaybackObserver` from emitting playback observations and free all
     * resources reserved to emitting them such as event listeners and intervals.
     *
     * Once `stop` is called, no new playback observation will ever be emitted.
     *
     * Note that it is important to call stop once the `PlaybackObserver` is no
     * more needed to avoid unnecessarily leaking resources.
     */
    stop(): void;
    /**
     * Returns the current position advertised by the `HTMLMediaElement`, in
     * seconds.
     * @returns {number}
     */
    getCurrentTime(): number;
    /**
     * Returns the current playback rate advertised by the `HTMLMediaElement`.
     * @returns {number}
     */
    getPlaybackRate(): number;
    /**
     * Returns the current `paused` status advertised by the `HTMLMediaElement`.
     *
     * Use this instead of the same status emitted on an observation when you want
     * to be sure you're using the current value.
     * @returns {boolean}
     */
    getIsPaused(): boolean;
    /**
     * Update the current position (seek) on the `HTMLMediaElement`, by giving a
     * new position in seconds.
     *
     * Note that seeks performed through this method are caracherized as
     * "internal" seeks. They don't result into the exact same playback
     * observation than regular seeks (which most likely comes from the outside,
     * e.g. the user).
     * @param {number} time
     */
    setCurrentTime(time: number): void;
    /**
     * Update the playback rate of the `HTMLMediaElement`.
     * @param {number} playbackRate
     */
    setPlaybackRate(playbackRate: number): void;
    /**
     * Returns the current `readyState` advertised by the `HTMLMediaElement`.
     * @returns {number}
     */
    getReadyState(): number;
    /**
     * Returns an `IReadOnlySharedReference` storing the last playback observation
     * produced by the `PlaybackObserver` and updated each time a new one is
     * produced.
     *
     * This value can then be for example listened to to be notified of future
     * playback observations.
     *
     * @returns {Object}
     */
    getReference(): IReadOnlySharedReference<IPlaybackObservation>;
    /**
     * Register a callback so it regularly receives playback observations.
     * @param {Function} cb
     * @param {Object} options - Configuration options:
     *   - `includeLastObservation`: If set to `true` the last observation will
     *     be first emitted synchronously.
     *   - `clearSignal`: If set, the callback will be unregistered when this
     *     CancellationSignal emits.
     */
    listen(cb: (observation: IPlaybackObservation, stopListening: () => void) => void, options?: {
        includeLastObservation?: boolean | undefined;
        clearSignal?: CancellationSignal | undefined;
    }): typeof noop | undefined;
    /**
     * Generate a new playback observer which can listen to other
     * properties and which can only be accessed to read observations (e.g.
     * it cannot ask to perform a seek).
     *
     * The object returned will respect the `IReadOnlyPlaybackObserver` interface
     * and will inherit this `PlaybackObserver`'s lifecycle: it will emit when
     * the latter emits.
     *
     * As argument, this method takes a function which will allow to produce
     * the new set of properties to be present on each observation.
     * @param {Function} transform
     * @returns {Object}
     */
    deriveReadOnlyObserver<TDest>(transform: (observationRef: IReadOnlySharedReference<IPlaybackObservation>, cancellationSignal: CancellationSignal) => IReadOnlySharedReference<TDest>): IReadOnlyPlaybackObserver<TDest>;
    private _actuallySetCurrentTime;
    /**
     * Creates the `IReadOnlySharedReference` that will generate playback
     * observations.
     * @returns {Object}
     */
    private _createSharedReference;
    private _getCurrentObservation;
    private _generateObservationForEvent;
}
/** "Event" that triggered the playback observation. */
export type IPlaybackObserverEventType = 
/** First playback observation automatically emitted. */
"init" | 
/** Observation manually forced by the PlaybackObserver. */
"manual" | 
/** Regularly emitted playback observation when no event happened in a long time. */
"timeupdate" | 
/** On the HTML5 event with the same name */
"canplay" | 
/** On the HTML5 event with the same name */
"ended" | 
/** On the HTML5 event with the same name */
"canplaythrough" | // HTML5 Event
/** On the HTML5 event with the same name */
"play" | 
/** On the HTML5 event with the same name */
"pause" | 
/** On the HTML5 event with the same name */
"seeking" | 
/** On the HTML5 event with the same name */
"seeked" | 
/** On the HTML5 event with the same name */
"stalled" | 
/** On the HTML5 event with the same name */
"loadedmetadata" | 
/** On the HTML5 event with the same name */
"ratechange" | 
/** An internal seek happens */
"internal-seeking";
/** Information recuperated on the media element on each playback observation. */
interface IMediaInfos {
    /** Value of `buffered` (buffered ranges) for the media element. */
    buffered: TimeRanges;
    /**
     * `currentTime` (position) set on the media element at the time of the
     * PlaybackObserver's measure.
     */
    position: number;
    /** Current `duration` set on the media element. */
    duration: number;
    /** Current `ended` set on the media element. */
    ended: boolean;
    /** Current `paused` set on the media element. */
    paused: boolean;
    /** Current `playbackRate` set on the media element. */
    playbackRate: number;
    /** Current `readyState` value on the media element. */
    readyState: number;
    /** Current `seeking` value on the mediaElement. */
    seeking: boolean;
}
/** Categorize a pending seek operation. */
export declare const enum SeekingState {
    /** We're not currently seeking. */
    None = 0,
    /**
     * We're currently seeking due to an internal logic of the RxPlayer (e.g.
     * discontinuity skipping).
     */
    Internal = 1,
    /** We're currently seeking due to a regular seek wanted by the application. */
    External = 2
}
/**
 * Describes when the player is "rebuffering" and what event started that
 * status.
 * "Rebuffering" is a status where the player has not enough buffer ahead to
 * play reliably.
 * The RxPlayer should pause playback when a playback observation indicates the
 * rebuffering status.
 */
export interface IRebufferingStatus {
    /** What started the player to rebuffer. */
    reason: "seeking" | // Building buffer after seeking
    "not-ready" | // Building buffer after low readyState
    "buffering";
    /**
     * Monotonically-raising timestamp at the time the rebuffering happened on the
     * main thread.
     */
    timestamp: number;
    /**
     * Position, in seconds, at which data is awaited.
     * If `null` the player is rebuffering but not because it is awaiting future data.
     * If `undefined`, that position is unknown.
     */
    position: number | null | undefined;
}
/**
 * Describes when the player is "frozen".
 * This status is reserved for when the player is stuck at the same position for
 * an unknown reason.
 */
export interface IFreezingStatus {
    /**
     * Monotonically-raising timestamp at the time the freezing started to be
     * detected.
     */
    timestamp: number;
}
/** Information emitted on each playback observation. */
export interface IPlaybackObservation extends Omit<IMediaInfos, "position" | "seeking"> {
    /** Event that triggered this playback observation. */
    event: IPlaybackObserverEventType;
    /** Current seeking state. */
    seeking: SeekingState;
    /**
     * Information on the current position being played, the position for which
     * media is wanted etc.
     */
    position: IObservationPosition;
    /**
     * Set if the player is short on audio and/or video media data and is a such,
     * rebuffering.
     * `null` if not.
     */
    rebuffering: IRebufferingStatus | null;
    /**
     * Set if the player is frozen, that is, stuck in place for unknown reason.
     * Note that this reason can be a valid one, such as a necessary license not
     * being obtained yet.
     *
     * `null` if the player is not frozen.
     */
    freezing: IFreezingStatus | null;
    /**
     * Gap between `currentTime` and the next position with un-buffered data.
     * `Infinity` if we don't have buffered data right now.
     * `undefined` if we cannot determine the buffer gap.
     */
    bufferGap: number | undefined;
    /**
     * The buffered range we are currently playing.
     * `null` if no range is currently available.
     * `undefined` if we cannot tell which range is currently available.
     */
    currentRange: {
        start: number;
        end: number;
    } | null | undefined;
}
export type IObservationPosition = ObservationPosition;
export declare class ObservationPosition {
    /**
     * Known position at the time the Observation was emitted, in seconds.
     *
     * Note that it might have changed since. If you want truly precize
     * information, you should recuperate it from the HTMLMediaElement directly
     * through another mean.
     */
    private _last;
    /**
     * Actually wanted position in seconds that is not yet reached.
     *
     * This might for example be set to the initial position when the content is
     * loading (and thus potentially at a `0` position) but which will be seeked
     * to a given position once possible. It may also be the position of a seek
     * that has not been properly accounted for by the current device.
     */
    private _wanted;
    constructor(last: number, wanted: number | null);
    /**
     * Obtain arguments allowing to instanciate the same ObservationPosition.
     *
     * This can be used to create a new `ObservationPosition` across JS realms,
     * generally to communicate its data between the main thread and a WebWorker.
     * @returns {Array.<number>}
     */
    serialize(): [number, number | null];
    /**
     * Returns the playback position actually observed on the media element at
     * the time the playback observation was made.
     *
     * Note that it may be different than the position for which media data is
     * wanted in rare scenarios where the goal position is not yet set on the
     * media element.
     *
     * You should use this value when you want to obtain the actual position set
     * on the media element for browser compatibility purposes. Note that this
     * position was calculated at observation time, it might thus not be
     * up-to-date if what you want is milliseconds-accuracy.
     *
     * If what you want is the actual position which the player is intended to
     * play, you should rely on `getWanted` instead`.
     * @returns {number}
     */
    getPolled(): number;
    /**
     * Returns the position which the player should consider to load media data
     * at the time the observation was made.
     *
     * It can be different than the value returned by `getPolled` in rare
     * scenarios:
     *
     *   - When the initial position has not been set yet.
     *
     *   - When the current device do not let the RxPlayer peform precize seeks,
     *     usually for perfomance reasons by seeking to a previous IDR frame
     *     instead (for now only Tizen may be like this), in which case we
     *     prefer to generally rely on the position wanted by the player (this
     *     e.g. prevents issues where the RxPlayer logic and the device are
     *     seeking back and forth in a loop).
     *
     *   - When a wanted position has been "forced" (@see forceWantedPosition).
     * @returns {number}
     */
    getWanted(): number;
    /**
     * Method to call if you want to overwrite the currently wanted position.
     * @param {number} pos
     */
    forceWantedPosition(pos: number): void;
    /**
     * Returns `true` when the position wanted returned by `getWanted` and the
     * actual position returned by `getPolled` may be different, meaning that
     * we're currently not at the position we want to reach.
     *
     * This is a relatively rare situation which only happens when either the
     * initial seek has not yet been performed. on specific targets where the
     * seeking behavior is a little broken (@see getWanted) or when the wanted
     * position has been forced (@see forceWantedPosition).
     *
     * In those situations, you might temporarily refrain from acting upon the
     * actual current media position, as it may change soon.
     *
     * @returns {boolean}
     */
    isAwaitingFuturePosition(): boolean;
}
/**
 * Interface providing a generic and read-only version of a `PlaybackObserver`.
 *
 * This interface allows to provide regular and specific playback information
 * without allowing any effect on playback like seeking.
 *
 * This can be very useful to give specific playback information to modules you
 * don't want to be able to update playback.
 *
 * Note that a `PlaybackObserver` is compatible and can thus be upcasted to a
 * `IReadOnlyPlaybackObserver` to "remove" its right to update playback.
 */
export interface IReadOnlyPlaybackObserver<TObservationType> {
    /**
     * Get the current playing position, in seconds.
     * Returns `undefined` when this cannot be known, such as when the playback
     * observer is running in a WebWorker.
     * @returns {number|undefined}
     */
    getCurrentTime(): number | undefined;
    /**
     * Returns the current playback rate advertised by the `HTMLMediaElement`.
     * Returns `undefined` when this cannot be known, such as when the playback
     * observer is running in a WebWorker.
     * @returns {number|undefined}
     */
    getPlaybackRate(): number | undefined;
    /**
     * Get the HTMLMediaElement's current `readyState`.
     * Returns `undefined` when this cannot be known, such as when the playback
     * observer is running in a WebWorker.
     * @returns {number|undefined}
     */
    getReadyState(): number | undefined;
    /**
     * Returns the current `paused` status advertised by the `HTMLMediaElement`.
     *
     * Use this instead of the same status emitted on an observation when you want
     * to be sure you're using the current value.
     *
     * Returns `undefined` when this cannot be known, such as when the playback
     * observer is running in a WebWorker.
     * @returns {boolean|undefined}
     */
    getIsPaused(): boolean | undefined;
    /**
     * Returns an `IReadOnlySharedReference` storing the last playback observation
     * produced by the `IReadOnlyPlaybackObserver` and updated each time a new one
     * is produced.
     *
     * This value can then be for example listened to to be notified of future
     * playback observations.
     *
     * @returns {Object}
     */
    getReference(): IReadOnlySharedReference<TObservationType>;
    /**
     * Register a callback so it regularly receives playback observations.
     * @param {Function} cb
     * @param {Object} options - Configuration options:
     *   - `includeLastObservation`: If set to `true` the last observation will
     *     be first emitted synchronously.
     *   - `clearSignal`: If set, the callback will be unregistered when this
     *     CancellationSignal emits.
     * @returns {Function} - Allows to easily unregister the callback
     */
    listen(cb: (observation: TObservationType, stopListening: () => void) => void, options?: {
        includeLastObservation?: boolean | undefined;
        clearSignal?: CancellationSignal | undefined;
    }): void;
    /**
     * Generate a new `IReadOnlyPlaybackObserver` from this one.
     *
     * As argument, this method takes a function which will allow to produce
     * the new set of properties to be present on each observation.
     * @param {Function} transform
     * @returns {Object}
     */
    deriveReadOnlyObserver<TDest>(transform: (observationRef: IReadOnlySharedReference<TObservationType>, cancellationSignal: CancellationSignal) => IReadOnlySharedReference<TDest>): IReadOnlyPlaybackObserver<TDest>;
}
export interface IPlaybackObserverOptions {
    withMediaSource: boolean;
    lowLatencyMode: boolean;
}
/**
 * Create `IReadOnlyPlaybackObserver` from a source `IReadOnlyPlaybackObserver`
 * and a mapping function.
 * @param {Object} src
 * @param {Function} transform
 * @returns {Object}
 */
export declare function generateReadOnlyObserver<TSource, TDest>(src: IReadOnlyPlaybackObserver<TSource>, transform: (observationRef: IReadOnlySharedReference<TSource>, cancellationSignal: CancellationSignal) => IReadOnlySharedReference<TDest>, cancellationSignal: CancellationSignal): IReadOnlyPlaybackObserver<TDest>;
export {};
