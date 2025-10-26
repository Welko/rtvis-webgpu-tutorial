import add from "./add.wgsl?raw";
import aggregate from "./aggregate.wgsl?raw";
import image from "./image.wgsl?raw";
import markers from "./markers.wgsl?raw";
import heatmapCompute from "./heatmapCompute.wgsl?raw";
import heatmapRender from "./heatmapRender.wgsl?raw";

export const SHADERS = {
  add,
  aggregate,
  image,
  markers,
  heatmapCompute,
  heatmapRender,
};