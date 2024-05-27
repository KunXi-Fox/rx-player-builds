import { IReadOnlySharedReference } from "../../../../utils/reference";
import { CancellationSignal } from "../../../../utils/task_canceller";
import { IReadOnlyPlaybackObserver } from "../../../api";
import { ICorePlaybackObservation } from "../../utils/create_core_playback_observer";
export default class WorkerPlaybackObserver implements IReadOnlyPlaybackObserver<ICorePlaybackObservation> {
    private _src;
    private _cancelSignal;
    private _contentId;
    constructor(src: IReadOnlySharedReference<ICorePlaybackObservation>, contentId: string, cancellationSignal: CancellationSignal);
    getCurrentTime(): number | undefined;
    getReadyState(): number | undefined;
    getIsPaused(): boolean | undefined;
    getReference(): IReadOnlySharedReference<ICorePlaybackObservation>;
    setPlaybackRate(playbackRate: number): void;
    getPlaybackRate(): number | undefined;
    listen(cb: (observation: ICorePlaybackObservation, stopListening: () => void) => void, options?: {
        includeLastObservation?: boolean | undefined;
        clearSignal?: CancellationSignal | undefined;
    }): void;
    deriveReadOnlyObserver<TDest>(transform: (observationRef: IReadOnlySharedReference<ICorePlaybackObservation>, cancellationSignal: CancellationSignal) => IReadOnlySharedReference<TDest>): IReadOnlyPlaybackObserver<TDest>;
}
