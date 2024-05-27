import { ITrackUpdateChoiceObject } from "../../../../multithread_types";
import { ITrackType } from "../../../../public_types";
import SharedReference from "../../../../utils/reference";
import { IAdaptationChoice, IRepresentationsChoice } from "../../../stream";
export default class TrackChoiceSetter {
    /**
     * Store SharedReference through which track choices and Representation
     * choices will be emitted to the rest of the code.
     *
     * Organized by Period id and by track type (audio, video, text).
     */
    private _refs;
    constructor();
    reset(): void;
    addTrackSetter(periodId: string, bufferType: ITrackType, ref: SharedReference<IAdaptationChoice | null | undefined>): void;
    setTrack(periodId: string, bufferType: ITrackType, choice: ITrackUpdateChoiceObject | null | undefined): boolean;
    updateRepresentations(periodId: string, adaptationId: string, bufferType: ITrackType, choice: IRepresentationsChoice): boolean;
    removeTrackSetter(periodId: string, bufferType: ITrackType): boolean;
}
