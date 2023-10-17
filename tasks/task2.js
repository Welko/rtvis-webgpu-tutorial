/*

Task 2: Load data from the loader and aggregate it with compute shaders

TODO

*/

async function task2() {

console.log('task2');

// Load trees data conveniently into TypedArrays (ready to be used with WebGPU)
const data = await LOADER.loadTrees();

// Write some shader code
const shader = SHADERS.aggregate;

// Put the tree data into GPU buffers
const treeInfoBuffer = DEVICE.createBuffer({
    size: data.getInfoBuffer().byteLength,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true
});
new Uint32Array(treeInfoBuffer.getMappedRange()).set(data.getInfoBuffer());
treeInfoBuffer.unmap();

// Create the output buffer
const aggregatedValuesBuffer = DEVICE.createBuffer({
    size: 32 * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
});

// Create the GPU pipeline to run our shader
const pipeline = DEVICE.createComputePipeline({
    layout: "auto",
    compute: {
        module: DEVICE.createShaderModule({
            code: shader
        }),
        entryPoint: "main"
    }
});

// Create GPU bindings to the buffers
const bindGroup = DEVICE.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: {
                buffer: treeInfoBuffer
            }
        },
        {
            binding: 1,
            resource: {
                buffer: aggregatedValuesBuffer
            }
        }
]
});

// Calculate number of workgroups
const numWorkgroups = Math.ceil(data.getNumTrees() / 64);

// Run our shader
const runShaderCommandEncoder = DEVICE.createCommandEncoder();
const computePass = runShaderCommandEncoder.beginComputePass();
computePass.setPipeline(pipeline);
computePass.setBindGroup(0, bindGroup);
computePass.dispatchWorkgroups(numWorkgroups);
computePass.end();
DEVICE.queue.submit([runShaderCommandEncoder.finish()]);

// Read the result back
const readDataCommandEncoder = DEVICE.createCommandEncoder();
const readBuffer = DEVICE.createBuffer({
    size: 32 * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
});
readDataCommandEncoder.copyBufferToBuffer(aggregatedValuesBuffer, 0, readBuffer, 0, 32 * Uint32Array.BYTES_PER_ELEMENT);
DEVICE.queue.submit([readDataCommandEncoder.finish()]);
await readBuffer.mapAsync(GPUMapMode.READ);
const resultData = new Uint32Array(readBuffer.getMappedRange());

// Print the results
for (let i = 0; i < 23; ++i) {
    console.log("Number of trees in district " + (i + 1) + ": " + resultData[i]);
}


}