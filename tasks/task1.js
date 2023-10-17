/*

Task 1: WebGPU compute shader basics

TODO

*/

async function task1() {

console.log('task1');

// Initialize WebGPU
ADAPTER = await navigator.gpu.requestAdapter();
DEVICE = await ADAPTER.requestDevice();

// Write some shader code
const shader = SHADERS.add;

// Define the data we want to use
const data = new Float32Array([1, 2, 3, 4]);

// Create GPU buffer with some data
const buffer = DEVICE.createBuffer({
    size: 4 * data.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: true
});
new Float32Array(buffer.getMappedRange()).set(data);
buffer.unmap();

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

// Create GPU binding to the buffer
const bindGroup = DEVICE.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: {
                buffer: buffer
            }
        }
]
});

// Run our shader
const runShaderCommandEncoder = DEVICE.createCommandEncoder();
const computePass = runShaderCommandEncoder.beginComputePass();
computePass.setPipeline(pipeline);
computePass.setBindGroup(0, bindGroup);
computePass.dispatchWorkgroups(1);
computePass.end();
DEVICE.queue.submit([runShaderCommandEncoder.finish()]);

// Read the result back
const readDataCommandEncoder = DEVICE.createCommandEncoder();
const readBuffer = DEVICE.createBuffer({
    size: 4 * data.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
});
readDataCommandEncoder.copyBufferToBuffer(buffer, 0, readBuffer, 0, 4 * data.BYTES_PER_ELEMENT);
DEVICE.queue.submit([readDataCommandEncoder.finish()]);
await readBuffer.mapAsync(GPUMapMode.READ);
const resultData = new Float32Array(readBuffer.getMappedRange());
console.log(data, new Float32Array(resultData));

};