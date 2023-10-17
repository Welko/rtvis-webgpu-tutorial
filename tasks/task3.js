async function task3() {

console.log("task3");

// Write some shader code to draw an image
const shader = SHADERS.image;

// Load the map
const map = await LOADER.loadMap();

// Set up the texture to draw
const image = map.images.satellite;
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
        topology: "triangle-strip"
    }
});

// Create GPU bindings to the buffers
const bindGroup = DEVICE.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: texture.createView()
        },
        {
            binding: 1,
            resource: sampler
        }
    ]
});

// Create the color attachment to draw to
const minSide = -100 + Math.min(CANVAS.parentNode.clientWidth, CANVAS.parentNode.clientHeight);
CANVAS.width = minSide;
CANVAS.height = minSide;
const colorAttachment = {
    view: CONTEXT.getCurrentTexture().createView(),
    loadOp: "clear",
    clearValue: {r: 0, g: 0, b: 0, a: 1},
    storeOp: "store"
};

// Run our shaders
const commandEncoder = DEVICE.createCommandEncoder();
const renderPass = commandEncoder.beginRenderPass({
    colorAttachments: [colorAttachment]
});
renderPass.setPipeline(pipeline);
renderPass.setBindGroup(0, bindGroup);
renderPass.draw(4); // 4 vertices - our quad
renderPass.end();
DEVICE.queue.submit([commandEncoder.finish()]);

}