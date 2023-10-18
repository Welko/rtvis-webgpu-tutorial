window.SHADERS = Object.assign(window.SHADERS || {}, {
    aggregate: /* wgsl */ `

struct TreeInfo {
    treeHeightCategory: u32,
    crownDiameterCategory: u32,
    districtNumber: u32,
    circumferenceAt1mInCm: u32,
};

struct AggregatedValues {
    districtNumberOccurrences: array<atomic<u32>, 23>,
};

@group(0) @binding(0) var<storage, read> treeInfo: array<TreeInfo>;
@group(0) @binding(1) var<storage, read_write> aggregatedValues: AggregatedValues;

@compute
@workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
    if (globalId.x >= arrayLength(&treeInfo)) {
        return;
    }
    
    let treeInfo: TreeInfo = treeInfo[globalId.x];

    // Increment one to district number
    let districtNumber = treeInfo.districtNumber;
    atomicAdd(&aggregatedValues.districtNumberOccurrences[districtNumber - 1], 1);
}

`});