async function task4() {

console.log("task4");

// Write some shader code to draw markers for the trees
const shader = SHADERS.markers;

// Load trees data conveniently into TypedArrays (ready to be used with WebGPU)
const data = GLOBAL.trees;

// Put the tree coordinates into a GPU buffer
const treeCoordinatesBuffer = DEVICE.createBuffer({
    size: data.getCoordinatesLatLonBuffer().byteLength,
    usage: GPUBufferUsage.STORAGE,
    mappedAtCreation: true
});
new Float32Array(treeCoordinatesBuffer.getMappedRange()).set(data.getCoordinatesLatLonBuffer());
treeCoordinatesBuffer.unmap();

// Put the tree info into a GPU buffer
const treeInfoBuffer = GLOBAL.gpuTreeInfoBuffer;

// Load the map
const map = GLOBAL.map;

// Set up the uniforms
const uniforms = {
    markerSize: 0.01,
    markerColor: [255, 0, 0, 1],
};
const uniformsArray = new Float32Array([
    map.width,
    map.height,
    map.latitude.min,
    map.latitude.max,
    map.longitude.min,
    map.longitude.max,
    uniforms.markerSize,
    0, // Unused
    uniforms.markerColor[0] / 255, // Marker color (R)
    uniforms.markerColor[1] / 255, // Marker color (G)
    uniforms.markerColor[2] / 255, // Marker color (B)
    uniforms.markerColor[3], // Marker color (A)
]);
const uniformsBuffer = DEVICE.createBuffer({
    size: uniformsArray.length * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
DEVICE.queue.writeBuffer(uniformsBuffer, 0, new Float32Array(uniformsArray));

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
    }
});

// Create GPU bindings to the buffers
const bindGroup = DEVICE.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: { buffer: treeCoordinatesBuffer } },
        { binding: 1, resource: { buffer: treeInfoBuffer } },
        { binding: 2, resource: { buffer: uniformsBuffer } },
    ]
});

// Create the color attachment to draw to
const colorAttachment = GLOBAL.colorAttachment;

// Run our shaders
function render() {
    colorAttachment.view = CONTEXT.getCurrentTexture().createView();
    const commandEncoder = DEVICE.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [colorAttachment]
    });
    {
        // Draw map
        renderPass.setPipeline(GLOBAL.renderMapPipeline);
        renderPass.setBindGroup(0, GLOBAL.mapBindGroup);
        renderPass.draw(6); // 6 vertices - one quad

        // Draw markers
        renderPass.setPipeline(pipeline);
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(6 * data.getNumTrees());

        // End
        renderPass.end();
    }
    DEVICE.queue.submit([commandEncoder.finish()]);
}
render();

// Add some sliders to the UI
const gui = GUI.addFolder("Task 4");
const markerSize = gui.add(uniforms, "markerSize", 0.001, 0.1, 0.001);
const markerColor = gui.addColor(uniforms, "markerColor");
function updateUniforms() {
    uniformsArray[6] = uniforms.markerSize;
    uniformsArray[8] = uniforms.markerColor[0] / 255;
    uniformsArray[9] = uniforms.markerColor[1] / 255;
    uniformsArray[10] = uniforms.markerColor[2] / 255;
    uniformsArray[11] = uniforms.markerColor[3];
    DEVICE.queue.writeBuffer(uniformsBuffer, 0, uniformsArray);
    render();
}
markerSize.onChange(updateUniforms);
markerColor.onChange(updateUniforms);

GLOBAL.gpuTreeCoordinatesBuffer = treeCoordinatesBuffer;
GLOBAL.uniforms = uniforms;

}