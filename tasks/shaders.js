/**
 * 
 * @param {string} url a url that is relative to this file 
 * @returns {Promise<string>}
 */
async function fetchTextFile(url) {
  const response = await fetch(import.meta.resolve(url));
  return await response.text();
}

// This should use text imports once those are stable
// https://github.com/whatwg/html/issues/9444
export const SHADERS = {
  add: await fetchTextFile("./shaders/add.wgsl"),
  aggregate: await fetchTextFile("./shaders/aggregate.wgsl"),
  image: await fetchTextFile("./shaders/image.wgsl"),
  markers: await fetchTextFile("./shaders/markers.wgsl"),
  heatmapCompute: await fetchTextFile("./shaders/heatmapCompute.wgsl"),
  heatmapRender: await fetchTextFile("./shaders/heatmapRender.wgsl"),
};

