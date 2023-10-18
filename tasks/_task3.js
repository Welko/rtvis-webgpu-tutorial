/*

Task 3: TODO

TODO

*/

async function task3() {

console.log("task3");

const DEVICE = Tasks.device;
const GPU = Tasks.gpu;
const CONTEXT = Tasks.context;
const CANVAS = Tasks.canvas;

// Write some shader code to draw an image
const shader = SHADERS.image;

// Load the map
const map = Tasks.map;

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
});

// Create GPU bindings to the buffers
const bindGroup = DEVICE.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
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
    renderPass.setPipeline(pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.draw(6); // 6 vertices - one quad
    renderPass.end();
    DEVICE.queue.submit([commandEncoder.finish()]);
}
render();

}