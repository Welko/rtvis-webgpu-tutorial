window.SHADERS = Object.assign(window.SHADERS || {}, {
    heatmap: /* wgsl */ `

struct TreeCoordinates {
    lat: f32,
    lon: f32,
};

struct TreeInfo {
    treeHeightCategory: u32,
    crownDiameterCategory: u32,
    districtNumber: u32,
    circumferenceAt1mInCm: u32,
};

struct Cell {
    count: atomic<u32>,
};

struct Uniforms {
    mapWidth: f32,
    mapHeight: f32,
    mapLatitudeMin: f32,
    mapLatitudeMax: f32,
    mapLongitudeMin: f32,
    mapLongitudeMax: f32,
    markerSize: f32,
    unused: f32,
    markerColor: vec4f,
    gridWidth: u32,
    gridHeight: u32,
};

@group(0) @binding(0) var<storage, read> treeCoordinates: array<TreeCoordinates>;
@group(0) @binding(1) var<storage, read> treeInfo: array<TreeInfo>;
@group(0) @binding(2) var<storage, read> grid: array<Cell>;
@group(0) @binding(3) var<uniform> u: Uniforms;

fn latLonToXY(lat: f32, lon: f32) -> vec2f {
    // Since our map area is kiiiiinda small, a linear mapping is okay
    return vec2f(
        (lon - u.mapLongitudeMin) / (u.mapLongitudeMax - u.mapLongitudeMin),
        (lat - u.mapLatitudeMin) / (u.mapLatitudeMax - u.mapLatitudeMin),
    );
}

fn xyToGridIndex(xy: vec2f) -> u32 {
    let x: u32 = u32(xy.x * f32(u.gridWidth));
    let y: u32 = u32(xy.y * f32(u.gridHeight));
    return y * u.gridWidth + x;
}

@compute
@workgroup_size(64)
fn compute(@builtin(global_invocation_id) globalId: vec3u) {
    if (globalId.x >= arrayLength(&treeInfo)) {
        return;
    }

    // Get 2D position of tree
    let latLon = treeCoordinates[treeIndex];
    let xy = latLonToXY(latLon.lat, latLon.lon);

    // Get grid index
    let gridIndex = xyToGridIndex(xy);
    
    let treeInfo: TreeInfo = treeInfo[globalId.x];

    // Increment one to district number
    let districtNumber: u32 = treeInfo.districtNumber;
    atomicAdd(&aggregatedValues.districtNumberOccurrences[districtNumber - 1], 1);
}

`});