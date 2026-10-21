/**
 * @param {string} url a url that is relative to this file
 * @returns {Promise<string>}
 */
async function fetchTextFile(url) {
  const response = await fetch(import.meta.resolve(url));
  return await response.text();
}

const [add, aggregate, image, markers, heatmapCompute, heatmapRender] =
  await Promise.all([
    fetchTextFile("./shaders/add.wgsl"),
    fetchTextFile("./shaders/aggregate.wgsl"),
    fetchTextFile("./shaders/image.wgsl"),
    fetchTextFile("./shaders/markers.wgsl"),
    fetchTextFile("./shaders/heatmapCompute.wgsl"),
    fetchTextFile("./shaders/heatmapRender.wgsl"),
  ]);
// This should use text imports once those are stable
// https://github.com/whatwg/html/issues/9444
export const SHADERS = {
  add,
  aggregate,
  image,
  markers,
  heatmapCompute,
  heatmapRender,
};
