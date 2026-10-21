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

@group(0) @binding(0)
var texture: texture_2d<f32>;
@group(0) @binding(1)
var linearSampler: sampler;

struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32, // Analogous to gl_VertexID in OpenGL
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
}

@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    return VertexOutput(
            // Index our vertex/UV data using the current vertex's index
            // %6 just for safety in case the draw call has more than 6 vertices
            vec4f(VERTICES[input.vertexIndex % 6], 0, 1),
            UVS[input.vertexIndex % 6],
        );
}

// The fragment input comes from the vertex shader's output (VertexOutput)

struct FragmentOutput {
    @location(0) color: vec4f,
}

@fragment
fn fragment(input: VertexOutput) -> FragmentOutput {
    let color = textureSample(texture, linearSampler, input.uv);
    return FragmentOutput(color);
}
