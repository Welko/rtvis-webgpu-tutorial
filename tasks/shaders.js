import add from "./shaders/add.wgsl?raw";
import aggregate from "./shaders/aggregate.wgsl?raw";
import image from "./shaders/image.wgsl?raw";
import markers from "./shaders/markers.wgsl?raw";
import heatmapCompute from "./shaders/heatmapCompute.wgsl?raw";
import heatmapRender from "./shaders/heatmapRender.wgsl?raw";

export const SHADERS = {
  add,
  aggregate,
  image,
  markers,
  heatmapCompute,
  heatmapRender,
};