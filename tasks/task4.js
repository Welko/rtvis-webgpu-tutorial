async function task4() {

console.log("task4");

// Write some shader code to draw markers for the trees
const shader = SHADERS.markers;

// Load trees data conveniently into TypedArrays (ready to be used with WebGPU)
const data = await LOADER.loadTrees();

// Put the tree coordinates into a GPU buffer
const treeCoordinatesBuffer = DEVICE.createBuffer({
    size: data.getCoordinatesLatLonBuffer().byteLength,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true
});
new Float32Array(treeCoordinatesBuffer.getMappedRange()).set(data.getCoordinatesLatLonBuffer());
treeCoordinatesBuffer.unmap();

// Put the tree info into a GPU buffer
const treeInfoBuffer = DEVICE.createBuffer({
    size: data.getInfoBuffer().byteLength,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true
});
new Uint32Array(treeInfoBuffer.getMappedRange()).set(data.getInfoBuffer());
treeInfoBuffer.unmap();

// Load the map
const map = await LOADER.loadMap();

// Set up the uniforms
const uniforms = new Float32Array([
    map.width,
    map.height,
    map.latitude.min,
    map.latitude.max,
    map.longitude.min,
    map.longitude.max,
    0.01, // Marker size
    0xff0000ff, // Marker RGBA color
]);
const uniformsBuffer = DEVICE.createBuffer({
    size: uniforms.length * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
DEVICE.queue.writeBuffer(uniformsBuffer, 0, new Float32Array(uniforms));

// Create the GPU pipeline to run our shaders
const shaderModule = DEVICE.createShaderModule({
    code: shader
});
const pipeline = DEVICE.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: shaderModule,
        entryPoint: "vertex",
        // buffers: We don't need any vertex buffer :)
    },
    fragment: {
        module: shaderModule,
        entryPoint: "fragment",
        targets: [
            {
                format: GPU.getPreferredCanvasFormat()
            }
        ]
    },
    primitive: {
        topology: "triangle-list" // Optional, defaults to "triangle-list"
    }
});

// Create GPU bindings to the buffers
const bindGroup = DEVICE.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: {
                buffer: treeCoordinatesBuffer
            }
        },
        {
            binding: 1,
            resource: {
                buffer: treeInfoBuffer
            }
        },
        {
            binding: 2,
            resource: {
                buffer: uniformsBuffer
            }
        }
    ]
});

// Create the color attachment to draw to
const minSide = -100 + Math.min(CANVAS.parentNode.clientWidth, CANVAS.parentNode.clientHeight);
CANVAS.width = minSide;
CANVAS.height = minSide;
const colorAttachment = {
    view: CONTEXT.getCurrentTexture().createView(),
    loadOp: "load",
    storeOp: "store"
};

// Run our shaders
const commandEncoder = DEVICE.createCommandEncoder();
const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [colorAttachment]
});
{
    // Draw map
    //renderPass.

    // Draw markers
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6 * data.getNumTrees());
    renderPass.end();
}
DEVICE.queue.submit([commandEncoder.finish()]);

}