interface Shaders {
  add: string;
  aggregate: string;
  heatmapCompute: string;
  heatmapRender: string;
  image: string;
  markers: string;
}

declare global {
  let SHADERS: Shaders;
}
