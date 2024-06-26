import isNode from "./is_node";
import isWorker from "./is_worker";
/**
 * The current environment's global object, written in such a way to maximize
 * compatibility.
 *
 * Though the RxPlayer should theoretically not be runnable in NodeJS, we still
 * had to support it for some applications implementing server-side rendering.
 */
const globalScope = isWorker ? self :
    isNode ? global :
        window;
export default globalScope;
