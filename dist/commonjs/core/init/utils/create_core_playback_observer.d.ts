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
import { IManifestMetadata } from "../../../manifest";
import { IMediaSourceInterface } from "../../../mse";
import { ITrackType } from "../../../public_types";
import { ITextDisplayer } from "../../../text_displayer";
import { IRange } from "../../../utils/ranges";
import { IReadOnlySharedReference } from "../../../utils/reference";
import { CancellationSignal } from "../../../utils/task_canceller";
import { IFreezingStatus, IPlaybackObservation, IReadOnlyPlaybackObserver, IRebufferingStatus, PlaybackObserver } from "../../api";
import { IStreamOrchestratorPlaybackObservation } from "../../stream";
/** Arguments needed to create the core's version of the PlaybackObserver. */
export interface ICorePlaybackObserverArguments {
    /** If true, the player will auto-play when `initialPlayPerformed` becomes `true`. */
    autoPlay: boolean;
    /** Manifest of the content being played */
    manifest: IManifestMetadata;
    /** Becomes `true` after the initial play has been taken care of. */
    initialPlayPerformed: IReadOnlySharedReference<boolean>;
    /** The last speed requested by the user. */
    speed: IReadOnlySharedReference<number>;
    /**
     * Used abstraction to implement text track displaying.
     *
     * `null` if text tracks are disabled
     */
    textDisplayer: ITextDisplayer | null;
    /** Used abstraction for MSE API. */
    mediaSource: IMediaSourceInterface | null;
}
export type ICorePlaybackObservation = IStreamOrchestratorPlaybackObservation & {
    rebuffering: IRebufferingStatus | null;
    freezing: IFreezingStatus | null;
    bufferGap: number | undefined;
};
/**
 * Create PlaybackObserver for the core part of the code.
 * @param {Object} srcPlaybackObserver - Base `PlaybackObserver` from which we
 * will derive information.
 * @param {Object} context - Various information linked to the current content
 * being played.
 * @param {Object} fnCancelSignal - Abort the created PlaybackObserver.
 * @returns {Object}
 */
export default function createCorePlaybackObserver(srcPlaybackObserver: PlaybackObserver, { autoPlay, initialPlayPerformed, manifest, mediaSource, speed, textDisplayer }: ICorePlaybackObserverArguments, fnCancelSignal: CancellationSignal): IReadOnlyPlaybackObserver<ICorePlaybackObservation>;
export declare function updateWantedPositionIfAfterManifest(observation: IPlaybackObservation, manifest: IManifestMetadata): void;
export declare function getPendingPaused(initialPlayPerformed: IReadOnlySharedReference<boolean>, autoPlay: boolean): boolean | undefined;
export declare function getBufferedDataPerMediaBuffer(mediaSourceInterface: IMediaSourceInterface | null, textDisplayer: ITextDisplayer | null): Record<ITrackType, IRange[] | null>;
