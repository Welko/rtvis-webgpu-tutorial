window.SHADERS = Object.assign(window.SHADERS || {}, {
    markers: /* wgsl */ `

struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
};

struct FragmentInput {
    @location(0) uv: vec2f,
    @location(1) color: vec4f,
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

struct Uniforms {
    mapWidth: f32,
    mapHeight: f32,
    mapLatitudeMin: f32,
    mapLatitudeMax: f32,
    mapLongitudeMin: f32,
    mapLongitudeMax: f32,
    markerSize: f32,
    markerColor: u32,
};

@group(0) @binding(0) var<storage, read> treeCoordinates: array<TreeCoordinates>;
@group(0) @binding(1) var<storage, read> treeInfo: array<TreeInfo>;
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

fn latLonToXY(lat: f32, lon: f32) -> vec2f {
    // Since our map is kiiiiinda rectangular, we can just do a linear mapping
    return vec2f(
        (lon - u.mapLongitudeMin) / (u.mapLongitudeMax - u.mapLongitudeMin),
        (lat - u.mapLatitudeMin) / (u.mapLatitudeMax - u.mapLatitudeMin),
    );
}

fn u32ToColor(rgba: u32) -> vec4f {
    return vec4f(
        f32((rgba & 0xff000000) >> 24) / 255,
        f32((rgba & 0x00ff0000) >> 16) / 255,
        f32((rgba & 0x0000ff00) >> 8) / 255,
        f32((rgba & 0x000000ff) >> 0) / 255,
    );
}

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    let treeIndex = input.vertexIndex / 6;

    // Get 2D position of tree
    let latLon = treeCoordinates[treeIndex];
    let xy = latLonToXY(latLon.lat, latLon.lon);

    // Calculate marker position and size
    let vertex = VERTICES[input.vertexIndex % 6] * u.markerSize + xy;

    // Get tree info
    let treeInfo = treeInfo[treeIndex];

    // Map color based on tree district
    let markerColor = u32ToColor(u.markerColor);
    let color = mix(vec4f(0,0,0,markerColor.a), markerColor, f32(treeInfo.districtNumber - 1) / 22);

    return VertexOutput(
        vec4f(vertex, 0, 1),
        UVS[input.vertexIndex % 6],
        vec4f(1,0,0,1),
    );
}

@fragment
fn fragment(input : FragmentInput) -> FragmentOutput {
    return FragmentOutput(
        input.color,
    );
}

`});