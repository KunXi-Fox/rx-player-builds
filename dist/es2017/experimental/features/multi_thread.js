// eslint-disable-next-line max-len
import MultiThreadContentInitializer from "../../core/init/multithread/main_thread/multi_thread_content_initializer";
/**
 * Add ability to run the RxPlayer's main buffering logic in a WebMultiThread.
 * @param {Object} features
 */
function addMultiThreadFeature(features) {
    features.multithread = { init: MultiThreadContentInitializer };
}
export { addMultiThreadFeature as MULTI_THREAD };
export default addMultiThreadFeature;
