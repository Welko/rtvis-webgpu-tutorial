window.SHADERS = Object.assign(window.SHADERS || {}, {
    heatmapCompute: /* wgsl */ `

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
    treeCount: atomic<u32>,
    heightCategoryCount: array<atomic<u32>, 9>,
};

struct Grid {
    maxTreeCount: atomic<u32>,
}

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
    gridWidth: f32,
    gridHeight: f32,
    mouseX: f32,
    mouseZ: f32,
};

@group(0) @binding(0) var<storage, read> treeCoordinates: array<TreeCoordinates>;
@group(0) @binding(1) var<storage, read> treeInfo: array<TreeInfo>;
@group(0) @binding(2) var<storage, read_write> cells: array<Cell>;
@group(0) @binding(3) var<storage, read_write> grid: Grid;
@group(0) @binding(4) var<uniform> u: Uniforms;

fn latLonToXY(lat: f32, lon: f32) -> vec2f {
    // Since our map area is kiiiiinda small, a linear mapping is okay
    return vec2f(
        (lon - u.mapLongitudeMin) / (u.mapLongitudeMax - u.mapLongitudeMin),
        (lat - u.mapLatitudeMin) / (u.mapLatitudeMax - u.mapLatitudeMin),
    );
}

fn xyToCellIndex(xy: vec2f) -> u32 {
    let x: u32 = u32(xy.x * u.gridWidth);
    let y: u32 = u32(xy.y * u.gridHeight);
    return y * u32(u.gridWidth) + x;
}

@compute
@workgroup_size(64)
fn clear(@builtin(global_invocation_id) globalId: vec3u) {
    if (globalId.x >= arrayLength(&cells)) {
        return;
    }

    // Clear max tree count
    if (globalId.x == 0) {
        atomicStore(&grid.maxTreeCount, 0);
    }

    let cellIndex = globalId.x;

    // Clear tree count and height category count
    atomicStore(&cells[cellIndex].treeCount, 0);
    for (var i: u32 = 0; i < 9; i = i + 1) {
        atomicStore(&cells[cellIndex].heightCategoryCount[i], 0);
    }
}

@compute
@workgroup_size(64)
fn count(@builtin(global_invocation_id) globalId: vec3u) {
    if (globalId.x >= arrayLength(&treeInfo)) {
        return;
    }

    // Get tree index
    let treeIndex = globalId.x;

    // Get 2D position of tree
    let latLon = treeCoordinates[treeIndex];
    let xy = latLonToXY(latLon.lat, latLon.lon);

    // Get cell index
    let cellIndex = xyToCellIndex(xy);

    // Get height category
    let treeInfo: TreeInfo = treeInfo[globalId.x];
    let heightCategory = treeInfo.treeHeightCategory;

    // Increment one to tree count and height category count
    atomicAdd(&cells[cellIndex].treeCount, 1);
    atomicAdd(&cells[cellIndex].heightCategoryCount[heightCategory], 1);
}

@compute
@workgroup_size(64)
fn max(@builtin(global_invocation_id) globalId: vec3u) {
    if (globalId.x >= arrayLength(&cells)) {
        return;
    }

    let cellIndex = globalId.x;

    let treeCount = atomicLoad(&cells[cellIndex].treeCount);

    atomicMax(&grid.maxTreeCount, treeCount);
}

`});