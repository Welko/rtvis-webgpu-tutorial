class TreeStore {

    /**
     * @type {number}
     */
    #numTrees;

    /**
     * @type {Float32Array<ArrayBuffer>}
     * Layout: [
     *          lat0, lon0,
     *          lat1, lon1,
     *          ...
     *         ]
     */
    #coordinatesLatLonBuffer; 

    /**
     * @type {Uint32Array<ArrayBuffer>}
     * Layout: [
     *          treeHeightCategory0, crownDiameterCategory0, districtNumber0, circumferenceAt1mInCm0,
     *          treeHeightCategory1, crownDiameterCategory1, districtNumber0, circumferenceAt1mInCm1,
     *          ...
     *         ]
     */
    #infoBuffer;

    /**
     * Other data not used in the GPU
     * 
     * @typedef OtherData
     * @property {number} locationId // OBJEKT_ID
     * @property {string} location // OBJEKT_STRASSE
     * @property {number} treeId // BAUM_ID
     * @property {string} dataManagement // DATENFUEHRUNG
     * @property {string} areaGroup // GEBIETSGRUPPE
     * @property {string} treeType // GATTUNG_ART
     * @property {number} yearPlanted // PFLANZJAHR
     * @property {number} treeNumber // BAUMNUMMER
     */
    /**
     * @type {OtherData[]}
     */
    #otherData = [];

    /**
     * @param {number} numTrees 
     */
    constructor(numTrees) {
        this.#numTrees = numTrees;
        this.#coordinatesLatLonBuffer = new Float32Array(numTrees * 2);
        this.#infoBuffer = new Uint32Array(numTrees * 4);
    }

    getNumTrees() {
        return this.#numTrees;
    }

    /**
     * @param {number} index 
     */
    getTreeProxy(index) {
        return new TreeProxy(this, index);
    }

    /**
     * @param {(treeProxy: TreeProxy)=>void} callback 
     */
    forEachTree(callback) {
        for (let i = 0; i < this.#numTrees; ++i) {
            callback(new TreeProxy(this, i));
        }
    }

    getCoordinatesLatLonBuffer() {
        return this.#coordinatesLatLonBuffer;
    }

    getInfoBuffer() {
        return this.#infoBuffer;
    }

    getOtherData() {
        return this.#otherData;
    }

}

class TreeProxy {

    #treeStore;
    #index;

    /**
     * @param {TreeStore} treeStore 
     * @param {number} index 
     */
    constructor(treeStore, index) {
        this.#treeStore = treeStore;
        this.#index = index;
    }

    getLatitude() {
        return this.#treeStore.getCoordinatesLatLonBuffer()[this.#index * 2];
    }

    /**
     * @deprecated
     * It's actually not deprecated :)
     * But needs testing. TODO
     * 
     * @param {number} mapLatitudeMin 
     * @param {number} mapLatitudeMax 
     * @param {number} mapWidth
     */
    getX(mapLatitudeMin, mapLatitudeMax, mapWidth) {
        return (this.getLatitude() - mapLatitudeMin) / (mapLatitudeMax - mapLatitudeMin) * mapWidth;
    }

    /**
     * @deprecated
     * It's actually not deprecated :)
     * But needs testing. TODO
     * 
     * @param {number} mapLongitudeMin 
     * @param {number} mapLongitudeMax 
     * @param {number} mapHeight
     */
    getY(mapLongitudeMin, mapLongitudeMax, mapHeight) {
        return (this.getLongitude() - mapLongitudeMin) / (mapLongitudeMax - mapLongitudeMin) * mapHeight;
    }

    getLongitude() {
        return this.#treeStore.getCoordinatesLatLonBuffer()[this.#index * 2 + 1];
    }

    getTotalHeightCategory() {
        return this.#treeStore.getInfoBuffer()[this.#index * 4];
    }

    getTotalHeightRange() {
        return this.#getSizeCategoryRange(this.getTotalHeightCategory());
    }

    getCrownDiameterCategory() {
        return this.#treeStore.getInfoBuffer()[this.#index * 4 + 1];
    }

    getCrownDiameterRange() {
        return this.#getSizeCategoryRange(this.getCrownDiameterCategory());
    }

    getDistrictNumber() {
        return this.#treeStore.getInfoBuffer()[this.#index * 4 + 2];
    }

    getTrunkCircumferenceAt1m() {
        return this.#treeStore.getInfoBuffer()[this.#index * 4 + 3];
    }

    /** @returns {number} The location ID (OBJEKT_ID, e.g. "576868130") */
    getLocationId() {
        return this.#treeStore.getOtherData()[this.#index].locationId;
    }

    /** @returns {string} The location (OBJEKT_STRASSE, e.g. "Guglgasse") */
    getLocation() {
        return this.#treeStore.getOtherData()[this.#index].location;
    }

    /** @returns {number} The tree ID (BAUM_ID, e.g. 194440) */
    getTreeId() {
        return this.#treeStore.getOtherData()[this.#index].treeId;
    }

    /** @returns {string} The data management organization (DATENFUEHRUNG, e.g. "magistrat") */
    getDataManagement() {
        return this.#treeStore.getOtherData()[this.#index].dataManagement;
    }

    /** @returns {string} The area group (GEBIETSGRUPPE), e.g. "MA 28 - Straße, Grünanlage") */
    getAreaGroup() {
        return this.#treeStore.getOtherData()[this.#index].areaGroup;
    }

    /** @returns {string} The tree type (GATTUNG_ART, e.g. "Prunus avium (Vogelkirsche)") */
    getTreeType() {
        return this.#treeStore.getOtherData()[this.#index].treeType;
    }

    /** @returns {number} The year the tree was planted (PFLANZJAHR, e.g. 2000) */
    getYearPlanted() {
        return this.#treeStore.getOtherData()[this.#index].yearPlanted;
    }

    /** @returns {number} The tree number (BAUMNUMMER, e.g. 1010) */
    getTreeNumber() {
        return this.#treeStore.getOtherData()[this.#index].treeNumber;
    }

    /**
     * Source: comments in https://www.data.gv.at/katalog/dataset/c91a4635-8b7d-43fe-9b27-d95dec8392a7
     * @param {number} category 
     * @returns {null | [number, number]} The min and max height in meters or null if unknown
     */
    #getSizeCategoryRange(category) {
        switch (this.getTotalHeightCategory()) {
            case 0: return null; // Unbekannt
            case 1: return [0, 5]; // 0-5 Meter
            case 2: return [6, 10]; // 6-10 Meter
            case 3: return [11, 15]; // 11-15 Meter
            case 4: return [16, 20]; // 16-20 Meter
            case 5: return [21, 25]; // 21-25 Meter
            case 6: return [26, 30]; // 26-30 Meter
            case 7: return [31, 35]; // 31-35 Meter
            case 8: return [35, Infinity]; // > 35 Meter
            default: throw new Error(`Unknown size category ${category}`);
        }
    }

}