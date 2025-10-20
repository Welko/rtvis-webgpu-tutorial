window.SHADERS = Object.assign(window.SHADERS || {}, {
    add: /* wgsl */ `

@group(0) @binding(0) var<storage, read_write> data : array<u32>;

const addend: u32 = 100u;

@compute
@workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
    if (globalId.x >= arrayLength(&data)) {
        return;
    }
    data[globalId.x] += addend;
}

`});