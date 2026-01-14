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

@group(0) @binding(0) var texture: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;

struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
};

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    return VertexOutput(
        vec4f(VERTICES[input.vertexIndex % 6], 0, 1),
        UVS[input.vertexIndex % 6],
    );
}

struct FragmentInput {
    @location(0) uv: vec2f,
};

struct FragmentOutput {
    @location(0) color: vec4f,
};

@fragment
fn fragment(input : FragmentInput) -> FragmentOutput {
    return FragmentOutput(
        textureSample(texture, linearSampler, input.uv),
    );
}
