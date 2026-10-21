@group(0) @binding(0)
var<storage, read_write> data: array<u32>; // Array of 32-bit unsigned integers

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
    if globalId.x >= arrayLength(&data) {
        return;
    }
    data[globalId.x] += 100u;
}
