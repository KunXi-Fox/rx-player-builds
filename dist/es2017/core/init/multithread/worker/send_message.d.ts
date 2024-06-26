import { ISentError, IWorkerMessage } from "../../../../multithread_types";
export default function sendMessage(msg: IWorkerMessage, transferables?: Transferable[]): void;
export declare function formatErrorForSender(error: unknown): ISentError;
