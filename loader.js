const LOADER = {

serverUrl: "https://raw.githubusercontent.com/Welko/rtvis-webgpu-tutorial/main",

load: async (url) => {
    const response = await fetch(url);
    // TODO: Keep track of loading progress
    return response;
},

loadString: async (url) => {
    return (await LOADER.load(url)).text();
},

loadJson: async (url) => {
    return JSON.parse(await LOADER.loadString(url));
},

loadImage: async (url) => {
    return new Promise(resolve => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.addEventListener("load", () => resolve(image));
        image.src = url;
    });
},

/**
 * List of the columns in the CSV files, in order of how they appear in the CSV
 * Source: https://www.data.gv.at/katalog/dataset/c91a4635-8b7d-43fe-9b27-d95dec8392a7
 */
baumkatogdCsvColumnList: [
    "FID", // Apparently the string "BAUMKATOGD.<objectId>"
    "OBJECTID", // Not sure what this means
    "SHAPE", // Geographical coordaintes in the format "POINT (<longitude> <latitude>)"
    "BAUM_ID", // The ID of the tree
    "DATENFUEHRUNG", // Data management (e.g. "magistrat")
    "BEZIRK", // DE: Wiener Gemeindebezirk, in dem der Baum steht | EN: Vienna district in which the tree stands
    "OBJEKT_STRASSE", // DE: Anlage, Objekt oder Straße, in der der Baum steht | EN: Facility, object or street in which the tree stands
    "GEBIETSGRUPPE", // DE: Gebiet, in dem der Baum steht (e.g. "MA 28 - Straße, Grünanlage") | EN: Area in which the tree stands (e.g. "MA 28 - Straße, Grünanlage")
    "GATTUNG_ART", // DE: Information, um welche Baumart es sich handelt | EN: Information about the type of tree
    "PFLANZJAHR", // DE: Das Jahr, in dem der Baum gepflanzt wurde | EN: The year the tree was planted
    "PFLANZJAHR_TXT", // DE: Werte aus PFLANZJAHR in Textformat, Nullwerte werden in Text "nicht bekannt" | EN: Values from PFLANZJAHR in text format, null values are converted to text "nicht bekannt"
    "STAMMUMFANG", // DE: Umfang des Baumstammes in cm in einem Meter Höhe | EN: Circumference of the tree trunk in cm at one meter height
    "STAMMUMFANG_TXT", // DE: Werte aus STAMMUMFANG in Textformat mit Zusatz " cm", Nullwerte werden in Text "nicht bekannt" umgewandelt | EN: Values from STAMMUMFANG in text format with additional " cm", null values are converted to text "nicht bekannt"
    "BAUMHOEHE", // DE: Einteilung in 8 Größenkategorien der Baumhöhe + Nullwert | EN: Division into 8 size categories of tree height + null value
    "BAUMHOEHE_TXT", // DE: Größenkategorien der Baumhöhe in Textformat direkt aus Quelldatenbank, Leereinträge werden in Text "nicht bekannt" umgewandelt | EN: Size categories of tree height in text format directly from source database, empty entries are converted to text "nicht bekannt"
    "KRONENDURCHMESSER", // DE: Einteilung in 8 Größenkategorien des Baumkronendurchmessers + Nullwert | EN: Division into 8 size categories of tree crown diameter + null value
    "KRONENDURCHMESSER_TXT", // DE: Größenkategorien der Kronendurchmesser in Textformat direkt aus Quelldatenbank, Leereinträge werden in Text "nicht bekannt" umgewandelt | EN: Size categories of crown diameters in text format directly from source database, empty entries are converted to text "nicht bekannt"
    "BAUMNUMMER", // DE: Nummer des Baumes | EN: Number of the tree
    "SE_ANNO_CAD_DATA", // Not sure what this means. Often empty
],
baumkatogdCsvColumnEnum: {
    // Automatically generated based on the order of the elements in column list (see the end of this file)
},

/**
 * @param {boolean} lots True if we should load LOTS OF TREES (219,378 of them)
 *                       False (default) loads only 100 trees
 * @returns {TreeStore}
 */
loadTrees: async (lots=false) => {
    const file = `/data/BAUMKATOGD-${lots?219378:100}.csv`;
    const csv = await LOADER.loadString(LOADER.serverUrl + file);
    const csvLines = csv.split("\n");
    
    // Verify if all columns are present
    csvLines[0]
        .split(",")
        .filter((csvColumnName, i) => csvColumnName !== LOADER.baumkatogdCsvColumnList[i])
        .forEach((csvColumnName, i) => {
            console.error(`Column ${i} is "${csvColumnName}" but should be "${LOADER.baumkatogdCsvColumnList[i]}"`);
        });

    // The 1st line has the column names and the last line is empty
    const numTrees = csvLines.length - 2;

    // Initialize the data structure
    const treeStore = new TreeStore(numTrees);

    // Get buffers
    const buffers = {
        latLon: treeStore.getCoordinatesLatLonBuffer(),
        info: treeStore.getInfoBuffer(),
    };

    // Parse the CSV lines
    for (let i = 0; i < numTrees; ++i) {
        // Split the line by comma, but ignore commas inside double quotes
        // Source: https://stackoverflow.com/questions/11456850/split-a-string-by-commas-but-ignore-commas-within-double-quotes-using-javascript
        const csvValues = csvLines[i + 1].match(/(?:[^",]+|"[^"]*")+|^(?=,)|(?<=,)/g);

        // Extract latitude and longitude
        const lonLat = csvValues[LOADER.baumkatogdCsvColumnEnum.SHAPE];
        const latLon = lonLat
            .substring(7, lonLat.length - 1) // Remove the prefix "POINT (" and the suffix ")"
            .split(" ") // Split into LONGITUDE then LATITUDE
            .reverse() // Reverse the order to LATITUDE then LONGITUDE
            .map((value) => parseFloat(value));

        // Extract other buffer values
        const treeHeightCategory = parseInt(csvValues[LOADER.baumkatogdCsvColumnEnum.BAUMHOEHE]);
        const crownDiameterCategory = parseInt(csvValues[LOADER.baumkatogdCsvColumnEnum.KRONENDURCHMESSER]);
        const district = parseInt(csvValues[LOADER.baumkatogdCsvColumnEnum.BEZIRK]);
        const circumference = parseInt(csvValues[LOADER.baumkatogdCsvColumnEnum.STAMMUMFANG]);
        
        // Store the values in the buffers
        buffers.latLon[i * 2] = latLon[0];
        buffers.latLon[i * 2 + 1] = latLon[1];
        buffers.info[i * 4] = treeHeightCategory;
        buffers.info[i * 4 + 1] = crownDiameterCategory;
        buffers.info[i * 4 + 2] = district;
        buffers.info[i * 4 + 3] = circumference;

        // Store the remaining values in the more general data structure
        treeStore.getOtherData()[i] = {
            latitude: latLon[0],
            longitude: latLon[1],
            locationId: parseInt(csvValues[LOADER.baumkatogdCsvColumnEnum.OBJECTID]),
            location: csvValues[LOADER.baumkatogdCsvColumnEnum.OBJEKT_STRASSE],
            treeId: parseInt(csvValues[LOADER.baumkatogdCsvColumnEnum.BAUM_ID]),
            dataManagement: csvValues[LOADER.baumkatogdCsvColumnEnum.DATENFUEHRUNG],
            areaGroup: csvValues[LOADER.baumkatogdCsvColumnEnum.GEBIETSGRUPPE],
            treeType: csvValues[LOADER.baumkatogdCsvColumnEnum.GATTUNG_ART],
            yearPlanted: parseInt(csvValues[LOADER.baumkatogdCsvColumnEnum.PFLANZJAHR]),
            treeNumber: parseInt(csvValues[LOADER.baumkatogdCsvColumnEnum.BAUMNUMMER]),
        };
    }

    return treeStore;
},

loadMap: async() => {
    const map = await LOADER.loadJson(LOADER.serverUrl + "/map/vienna.json");

    await Promise.all(Object.entries(map.images).map(async ([imageKey, imageFile]) => {
        const image = await LOADER.loadImage(LOADER.serverUrl + "/map/" + imageFile);
        map.images[imageKey] = await createImageBitmap(image);
    }));

    for (const image of Object.values(map.images)) {
        if (image.width !== image.height) {
            throw new Error(`Image ${image.src} must be square but is ${image.width}x${image.height}`);
        }
    }

    return map;
},

};

// Automatically generate the column enum based on the order of the elements in the column list
LOADER.baumkatogdCsvColumnList.forEach((columnName, i) => LOADER.baumkatogdCsvColumnEnum[columnName] = i);