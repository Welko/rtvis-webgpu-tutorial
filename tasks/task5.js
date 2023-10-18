/*

Task 5: TODO

TODO

*/

async function task5() {

console.log("task5");

const DEVICE = Tasks.device;
const GPU = Tasks.gpu;
const CONTEXT = Tasks.context;
const CANVAS = Tasks.canvas;
const GUI = Tasks.gui;

// Write some shader code to compute the heightmap
const shaders = {
    compute: SHADERS.heatmapCompute,
    render: SHADERS.heatmapRender,
}

// Load the map
const map = Tasks.map;

// Load the data
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

// Set up the uniforms
const GRID_WIDTH_MAX = 100;
const GRID_HEIGHT_MAX = 100;
const uniforms = {
    markerSize: 0.01,
    markerColor: [117, 107, 177],
    markerAlpha: 1,
    gridWidth: 50,
    gridHeight: 50,
    mouseX: NaN,
    mouseY: NaN,
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
    uniforms.gridWidth,
    uniforms.gridHeight,
    uniforms.mouseX,
    uniforms.mouseY,
]);
const uniformsBuffer = DEVICE.createBuffer({
    size: uniformsArray.length * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
DEVICE.queue.writeBuffer(uniformsBuffer, 0, new Float32Array(uniformsArray));

// Create a buffer to store the grid cells
const cellsBuffer = DEVICE.createBuffer({
    size: 10 * GRID_WIDTH_MAX * GRID_HEIGHT_MAX * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
});

// Create a buffer to store the grid aggregate values
const gridBuffer = DEVICE.createBuffer({
    size: 1 * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
});

// Create the bind group layout for the compute stage
const computeBindGroupLayout = DEVICE.createBindGroupLayout({
    entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ]
});

// Create the compute pipeline layout
const computePipelineLayout = DEVICE.createPipelineLayout({
    bindGroupLayouts: [
        computeBindGroupLayout,
    ]
});

// Create the compute pipeline to clear the grid cells
const computePipelineClear = DEVICE.createComputePipeline({
    layout: computePipelineLayout,
    compute: {
        module: DEVICE.createShaderModule({
            code: shaders.compute
        }),
        entryPoint: "clear"
    }
});

// Create the compute pipeline to count trees in each grid cell
const computePipelineCount = DEVICE.createComputePipeline({
    layout: computePipelineLayout,
    compute: {
        module: DEVICE.createShaderModule({
            code: shaders.compute
        }),
        entryPoint: "count"
    }
});

// Create the compute pipeline to compute the max tree count value among all grid cells
const computePipelineMax = DEVICE.createComputePipeline({
    layout: computePipelineLayout,
    compute: {
        module: DEVICE.createShaderModule({
            code: shaders.compute
        }),
        entryPoint: "max"
    }
});

// Create the render pipeline to draw the heatmap
const renderShaderModule = DEVICE.createShaderModule({
    code: shaders.render
});
const renderPipeline = DEVICE.createRenderPipeline({
    layout: "auto",
    vertex: {
        module: renderShaderModule,
        entryPoint: "vertex",
        // buffers: We don't need any vertex buffer :)
    },
    fragment: {
        module: renderShaderModule,
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

// Create the bind group for the compute stage
const computeBindGroup = DEVICE.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
        { binding: 0, resource: { buffer: treeCoordinatesBuffer} },
        { binding: 1, resource: { buffer: treeInfoBuffer } },
        { binding: 2, resource: { buffer: cellsBuffer } },
        { binding: 3, resource: { buffer: gridBuffer } },
        { binding: 4, resource: { buffer: uniformsBuffer } },
    ]
});

// Create the bind group for the render stage
const renderBindGroup = DEVICE.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
        { binding: 0, resource: { buffer: cellsBuffer } },
        { binding: 1, resource: { buffer: gridBuffer } },
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
    const commandEncoder = DEVICE.createCommandEncoder();
    {
        // Compute pass
        {
            const numWorkgroupsTrees = Math.ceil(data.getNumTrees() / 64);
            const numWorkgroupCells = Math.ceil(uniforms.gridWidth * uniforms.gridHeight / 64);

            const computePass = commandEncoder.beginComputePass();
            {
                computePass.setBindGroup(0, computeBindGroup);

                // Clear tree count in each grid cell
                computePass.setPipeline(computePipelineClear);
                computePass.dispatchWorkgroups(numWorkgroupCells);

                // Count trees in each grid cell
                computePass.setPipeline(computePipelineCount);
                computePass.dispatchWorkgroups(numWorkgroupsTrees);

                // Compute the max tree count value among all grid cells
                computePass.setPipeline(computePipelineMax);
                computePass.dispatchWorkgroups(numWorkgroupCells);
            }
            computePass.end();
        }

        // Render pass
        {
            colorAttachment.view = CONTEXT.getCurrentTexture().createView();
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [colorAttachment]
            });
            {
                // Draw map
                renderPass.setPipeline(renderMapPipeline);
                renderPass.setBindGroup(0, renderMapBindGroup);
                renderPass.draw(6); // 6 vertices - one quad

                // Draw heatmap
                renderPass.setPipeline(renderPipeline);
                renderPass.setBindGroup(0, renderBindGroup);
                renderPass.draw(6 * uniforms.gridWidth * uniforms.gridHeight);
            }
            renderPass.end();
        }
    }
    DEVICE.queue.submit([commandEncoder.finish()]);
}
render();

const gui = GUI.addFolder("Task 5");
//const markerSize = gui.add(uniforms, "markerSize", 0.001, 0.1, 0.001);
const markerColor = gui.addColor(uniforms, "markerColor");
const markerAlpha = gui.add(uniforms, "markerAlpha", 0, 1, 0.01);
const gridWidth = gui.add(uniforms, "gridWidth", 1, GRID_WIDTH_MAX, 1);
const gridHeight = gui.add(uniforms, "gridHeight", 1, GRID_HEIGHT_MAX, 1);
function updateUniforms() {
    uniformsArray[6] = uniforms.markerSize;
    uniformsArray[8] = uniforms.markerColor[0] / 255;
    uniformsArray[9] = uniforms.markerColor[1] / 255;
    uniformsArray[10] = uniforms.markerColor[2] / 255;
    uniformsArray[11] = uniforms.markerAlpha;
    uniformsArray[12] = uniforms.gridWidth;
    uniformsArray[13] = uniforms.gridHeight;
    uniformsArray[14] = uniforms.mouseX;
    uniformsArray[15] = uniforms.mouseY;
    DEVICE.queue.writeBuffer(uniformsBuffer, 0, uniformsArray);
    render();
}
//markerSize.onChange(updateUniforms);
markerColor.onChange(updateUniforms);
markerAlpha.onChange(updateUniforms);
gridWidth.onChange(updateUniforms);
gridHeight.onChange(updateUniforms);

CANVAS.addEventListener("mousemove", (event) => {
    const rect = CANVAS.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    uniforms.mouseX = x / CANVAS.width * 2 - 1;
    uniforms.mouseY = -y / CANVAS.height * 2 + 1;
    updateUniforms();
    tooltip(x, y);
});
CANVAS.addEventListener("mouseleave", (event) => {
    uniforms.mouseX = -100000;
    uniforms.mouseY = -100000;
    updateUniforms();
    tooltip();
});

let lastHoveredCellIndex = null;
const tooltipElement = document.createElement("tooltip");
tooltipElement.style.display = "none";
tooltipElement.style.position = "absolute";
tooltipElement.style.whiteSpace = "pre";
tooltipElement.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
tooltipElement.style.color = "white";
tooltipElement.style.padding = "0.5em";
tooltipElement.style.borderRadius = "0.5em";
tooltipElement.style.pointerEvents = "none";
tooltipElement.style.userSelect = "none";
document.body.appendChild(tooltipElement);
async function tooltip(x=undefined, y=undefined) {
    if (x === undefined || y === undefined) {
        tooltipElement.style.display = "none";
        return;
    }
    
    tooltipElement.style.top = `${y}px`;
    tooltipElement.style.left = `${x}px`;

    const cellIndex = Math.floor((x / CANVAS.width) * uniforms.gridWidth) +
                      Math.floor((1 - y / CANVAS.height) * uniforms.gridHeight) * uniforms.gridWidth;
                      
    if (cellIndex === lastHoveredCellIndex) {
        return;
    }
    lastHoveredCellIndex = cellIndex;
    
    // Read cell
    const readBytes = 10 * Uint32Array.BYTES_PER_ELEMENT;
    const readOffset = cellIndex * 10 * Uint32Array.BYTES_PER_ELEMENT;
    const readBuffer = DEVICE.createBuffer({
        size: readBytes,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const readDataCommandEncoder = DEVICE.createCommandEncoder();
    readDataCommandEncoder.copyBufferToBuffer(cellsBuffer, readOffset, readBuffer, 0, readBytes);
    DEVICE.queue.submit([readDataCommandEncoder.finish()]);
    await readBuffer.mapAsync(GPUMapMode.READ);
    const resultData = new Uint32Array(readBuffer.getMappedRange());
    const cell = {
        treeCount: resultData[0],
        heightCategoryCount: Array.from(resultData.slice(1, 9)),
    };
    
    // Delete read buffer
    readBuffer.destroy();

    // Update tooltip
    const heightCategories = ["unknown", "0-5 m", "6-10 m", "11-15 m", "16-20 m", "21-25 m", "26-30 m", "31-35 m", "> 35 m"];
    let text = `Tree count: ${cell.treeCount}\n`;
    text += "Height categories:\n";
    text += cell.heightCategoryCount.map((count, index) => {
        return `- ${heightCategories[index]}: ${count}`;
    }).join("\n");
    tooltipElement.innerText = text;
    tooltipElement.style.display = "";
}

}