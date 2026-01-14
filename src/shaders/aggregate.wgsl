struct TreeInfo {
    treeHeightCategory: u32,
    crownDiameterCategory: u32,
    districtNumber: u32,
    circumferenceAt1mInCm: u32,
};

struct AggregatedValues {
    // Array of 23 atomic unsigned integers (one for each district in Vienna)
    districtNumberOccurrences: array<atomic<u32>, 23>,
};

// Our storage buffer at binding 0 now is of type TreeInfo (see the TreeInfo struct)
@group(0) @binding(0) var<storage, read> treeInfo: array<TreeInfo>;

// A second storage buffer is added, where our (atomic) counts are stored
// We need to create a new buffer for this!
@group(0) @binding(1) var<storage, read_write> aggregatedValues: AggregatedValues;

@compute
@workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
    if (globalId.x >= arrayLength(&treeInfo)) {
        return;
    }
    
    // Your code here :)
}