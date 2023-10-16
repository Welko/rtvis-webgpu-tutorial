const UTIL = {

serverUrl: "https://raw.githubusercontent.com/Welko/rtvis-webgpu-tutorial/main",

loadString: async (url) => {
    const response = await fetch(url);
    
    return data;
},

loadTrees: async () => {
    const csv = await UTIL.loadString(UTIL.serverUrl + "/data/BAUMKATOGD-100.csv");

},

};