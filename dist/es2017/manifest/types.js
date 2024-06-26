/** Enumerate the different ways a Manifest update can be done. */
export var MANIFEST_UPDATE_TYPE;
(function (MANIFEST_UPDATE_TYPE) {
    /**
     * Manifest is updated entirely thanks to a re-downloaded version of
     * the original manifest document.
     */
    MANIFEST_UPDATE_TYPE[MANIFEST_UPDATE_TYPE["Full"] = 0] = "Full";
    /**
     * Manifest is updated partially thanks to a shortened version
     * of the manifest document. The latter's URL might be different
     * from the original one.
     */
    MANIFEST_UPDATE_TYPE[MANIFEST_UPDATE_TYPE["Partial"] = 1] = "Partial";
})(MANIFEST_UPDATE_TYPE || (MANIFEST_UPDATE_TYPE = {}));
