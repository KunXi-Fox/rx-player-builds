import { CancellationSignal } from "../../../../utils/task_canceller";
import { IBufferType } from "../../../segment_buffers";
import RxPlayer from "../../public_api";
export default function createSegmentBufferGraph(instance: RxPlayer, bufferType: IBufferType, title: string, parentElt: HTMLElement, cancelSignal: CancellationSignal): HTMLElement;
