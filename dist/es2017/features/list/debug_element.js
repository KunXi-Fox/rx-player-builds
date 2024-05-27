import createDebugElement from "../../core/api/debug";
/**
 * Add ability to parse SAMI text tracks in an HTML textrack mode.
 * @param {Object} features
 */
function addDebugElementFeature(features) {
    features.createDebugElement = createDebugElement;
}
export { addDebugElementFeature as DEBUG_ELEMENT };
export default addDebugElementFeature;
