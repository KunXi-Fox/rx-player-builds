/**
 * This file is the entry point of the worker part of the RxPlayer, only relied
 * on when running in a multithread mode.
 */
import initializeWorkerPortal from "./core/init/multithread/worker";
initializeWorkerPortal();
