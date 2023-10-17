window.SHADERS = Object.assign(window.SHADERS || {}, {
    reduceTrees: /* wgsl */ `

struct TreeInfo {
    treeHeightCategory: u32,
    crownDiameterCategory: u32,
    districtNumber: u32,
    circumferenceAt1mInCm: u32
};

struct ReducedValues {
    sumHeightCategories: array<atomic<u32>, 9>,
    districtNumberOccurrences: array<atomic<u32>, 23>
};

@group(0) @binding(0) var<storage, read> treeInfo: array<TreeInfo>;
@group(0) @binding(1) var<storage, read_write> reducedValues: ReducedValues;

@compute
@workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
    if (globalId.x >= arrayLength(&treeInfo)) {
        return;
    }
    
    let treeInfo: TreeInfo = treeInfo[globalId.x];

    // Increment one to district number
    let districtNumber: u32 = treeInfo.districtNumber;
    atomicAdd(&reducedValues.districtNumberOccurrences[districtNumber - 1], 1);

    // Increment one to height category
    let heightCategory: u32 = treeInfo.treeHeightCategory;
    atomicAdd(&reducedValues.sumHeightCategories[heightCategory], 1);
}

`});