window.SHADERS = Object.assign(window.SHADERS || {}, {
    image: /* wgsl */ `

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

// Your code here :)

`});