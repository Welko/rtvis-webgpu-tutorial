/*

Task 4: TODO

TODO

*/

async function task4() {

console.log("task4");

const DEVICE = Tasks.device;
const GPU = Tasks.gpu;
const CONTEXT = Tasks.context;
const CANVAS = Tasks.canvas;
const GUI = Tasks.gui;

// Write some shader code to draw markers for the trees
const shader = SHADERS.markers;

// Load trees data conveniently into TypedArrays (ready to be used with WebGPU)
const data = Tasks.lotsOfTrees;

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
const map = Tasks.map;

// Set up the uniforms
const uniforms = {
    markerSize: 0.01,
    markerColor: [117, 107, 177],
    markerAlpha: 1,
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
    uniforms.markerAlpha, // Marker color (A)
]);
const uniformsBuffer = DEVICE.createBuffer({
    size: uniformsArray.length * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
DEVICE.queue.writeBuffer(uniformsBuffer, 0, new Float32Array(uniformsArray));

// Create the GPU pipeline to run our shaders
const renderMarkersShaderModule = DEVICE.createShaderModule({
    code: shader
});
const renderMarkersPipeline = DEVICE.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: renderMarkersShaderModule,
        entryPoint: "vertex",
        // buffers: We don't need any vertex buffer :)
    },
    fragment: {
        module: renderMarkersShaderModule,
        entryPoint: "fragment",
        targets: [
            {
                format: GPU.getPreferredCanvasFormat(),
                blend: {
                    color: {
                        operation: "add",
                        srcFactor: "src-alpha",
                        dstFactor: "one-minus-src-alpha",
                    },
                    alpha: {
                        operation: "add",
                        srcFactor: "src-alpha",
                        dstFactor: "one-minus-src-alpha",
                    }
                }
            }
        ]
    }
});

// Create GPU bindings to the buffers
const renderMarkersBindGroup = DEVICE.createBindGroup({
    layout: renderMarkersPipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: { buffer: treeCoordinatesBuffer } },
        { binding: 1, resource: { buffer: treeInfoBuffer } },
        { binding: 2, resource: { buffer: uniformsBuffer } },
    ]
});

// Set up the texture to draw
const image = map.images.outdoors;
const texture = DEVICE.createTexture({
    size: [image.width, image.height],
    format: "rgba8unorm",
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING  | GPUTextureUsage.RENDER_ATTACHMENT,
});
DEVICE.queue.copyExternalImageToTexture(
    {source: image, flipY: true}, // Source
    {texture: texture}, // Destination
    [image.width, image.height] // Size
);

// Create the sampler used to access the texture
const sampler = DEVICE.createSampler({
    magFilter: 'linear',
    minFilter: 'linear'
});

// Create the GPU pipeline to run our shaders
const renderMapShaderModule = DEVICE.createShaderModule({
    code: SHADERS.image
});
const renderMapPipeline = DEVICE.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: renderMapShaderModule,
        entryPoint: "vertex",
        // buffers: We don't need any vertex buffer :)
    },
    fragment: {
        module: renderMapShaderModule,
        entryPoint: "fragment",
        targets: [
            {
                format: GPU.getPreferredCanvasFormat()
            }
        ]
    },
});

// Create GPU bindings to the buffers
const renderMapBindGroup = DEVICE.createBindGroup({
    layout: renderMapPipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: sampler },
    ]
});

// Create the color attachment to draw to
const minSide = -100 + Math.min(CANVAS.parentNode.clientWidth, CANVAS.parentNode.clientHeight);
CANVAS.width = minSide;
CANVAS.height = minSide;
const colorAttachment = {
    view: null,
    loadOp: "clear",
    clearValue: {r: 0, g: 0, b: 0, a: 0},
    storeOp: "store"
};

// Run our shaders
function render() {
    colorAttachment.view = CONTEXT.getCurrentTexture().createView();
    const commandEncoder = DEVICE.createCommandEncoder();
    const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [colorAttachment]
    });
    {
        // Draw map
        renderPass.setPipeline(renderMapPipeline);
        renderPass.setBindGroup(0, renderMapBindGroup);
        renderPass.draw(6); // 6 vertices - one quad

        // Draw markers
        renderPass.setPipeline(renderMarkersPipeline);
        renderPass.setBindGroup(0, renderMarkersBindGroup);
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
const markerAlpha = gui.add(uniforms, "markerAlpha", 0, 1, 0.01);
function updateUniforms() {
    uniformsArray[6] = uniforms.markerSize;
    uniformsArray[8] = uniforms.markerColor[0] / 255;
    uniformsArray[9] = uniforms.markerColor[1] / 255;
    uniformsArray[10] = uniforms.markerColor[2] / 255;
    uniformsArray[11] = uniforms.markerAlpha;
    DEVICE.queue.writeBuffer(uniformsBuffer, 0, uniformsArray);
    render();
}
markerSize.onChange(updateUniforms);
markerColor.onChange(updateUniforms);
markerAlpha.onChange(updateUniforms);

}