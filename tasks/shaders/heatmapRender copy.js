window.SHADERS = Object.assign(window.SHADERS || {}, {
    heatmapRender: /* wgsl */ `

struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
    @location(2) mouseOver: f32,
};

struct FragmentInput {
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
    @location(2) mouseOver: f32,
};

struct FragmentOutput {
    @location(0) color: vec4f,
};

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
    treeCount: u32,
    heightCategoryCount: array<u32, 9>,
};

struct Grid {
    maxTreeCount: u32,
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
    mouseXY: vec2f,
};

@group(0) @binding(0) var<storage, read> cells: array<Cell>;
@group(0) @binding(1) var<storage, read> grid: Grid;
@group(0) @binding(2) var<uniform> u: Uniforms;

const VERTICES = array<vec2f, 6>(
    vec2f(-1, -1),
    vec2f(-1, 1),
    vec2f(1, -1),
    vec2f(1, 1),
    vec2f(-1, 1),
    vec2f(1, -1),
);

const UVS = array<vec2f, 6>(
    vec2f(0, 0),
    vec2f(0, 1),
    vec2f(1, 0),
    vec2f(1, 1),
    vec2f(0, 1),
    vec2f(1, 0),
);

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    let cellIndex = input.vertexIndex / 6;

    let gridWidth = u.gridWidth;
    let gridHeight = u.gridHeight;

    // Get center of cell
    let xy = vec2f(
        (0.5 + f32(cellIndex % u32(gridWidth))) / gridWidth,
        (0.5 + f32(cellIndex / u32(gridWidth))) / gridHeight,
    ) * 2 - 1;

    // Get size of cell
    let size = vec2f(1 / gridWidth, 1 / gridHeight);
    
    // Calculate cell position and size
    let vertex = VERTICES[input.vertexIndex % 6] * size + xy;

    // Map color based on tree count
    let maxCount = grid.maxTreeCount;
    let count = cells[cellIndex].treeCount;
    let color1 = vec4f(u.markerColor.rgb, 1);
    let color0 = vec4f(color1.rgb, color1.a * 0.2);

    // Linear blending
    let blendingFactor = f32(count) / f32(maxCount);

    // Logarithmic blending
    //let blendingFactor = log2(f32(count) + 1) / log2(f32(maxCount) + 1);

    var color = mix(color0, color1, blendingFactor);
    if (count == 0) {
        color.a = 0;
    }

    // Is mouse inside this cell?
    var mouseOver = 0.0;
    {
        let s = size;
        let m = u.mouseXY;
        if (m.x + s.x >= xy.x && m.x - s.x < xy.x && m.y + s.y >= xy.y && m.y - s.y < xy.y) {
            mouseOver = 1.0;
        }
    }

    return VertexOutput(
        vec4f(vertex, 0, 1),
        UVS[input.vertexIndex % 6],
        color,
        mouseOver,
    );
}

@fragment
fn fragment(input : FragmentInput) -> FragmentOutput {
    var color = input.color;
    if (input.mouseOver > 0.5) {
        color = vec4f(0, 0, 0, 1);
    }
    return FragmentOutput(
        color,
    );
}

`});