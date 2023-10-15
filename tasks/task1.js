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

const commandEncoder = DEVICE.createCommandEncoder();
{
    // Run our shader
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(pipeline);
    computePass.setBindGroup(0, bindGroup);
    computePass.dispatchWorkgroups(1);
    computePass.end();

    // Read the result back
    const resultBuffer = DEVICE.createBuffer({
        size: 4 * data.BYTES_PER_ELEMENT,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });
    commandEncoder.copyBufferToBuffer(buffer, 0, resultBuffer, 0, 4 * data.BYTES_PER_ELEMENT);
    DEVICE.queue.submit([commandEncoder.finish()]);
    await resultBuffer.mapAsync(GPUMapMode.READ);
    const resultData = new Float32Array(resultBuffer.getMappedRange());
    console.log(data, new Float32Array(resultData));
}
DEVICE.queue.submit([commandEncoder.finish()]);

};