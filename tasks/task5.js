class Tutorial {

    async start() {
        await this.initializeWebGPU();
        await this.initializeBuffers();
        await this.initializeTextures();
        await this.initializeLayouts();
        await this.initializePipelines();
        await this.initializeBindGroups();
        await this.initializeAttachments();
        await this.initializeGUI();
        await this.render();
    }

    constructor(gui, canvas) {
        this.gui = gui;
        this.canvas = canvas;
    }

    // GUI
    gui;
    canvas;

    // From here on, it is up to you to implement the tutorial
    // ----------------------------------------------------------------------------------------------------

    // WebGPU
    gpu;
    adapter;
    device;
    context;

    // CPU Data
    trees;
    map;

    // GPU Data
    gpuTreeCoodinates
    gpuTreeInfo;
    gpuMapTexture;
    gpuUniforms;

    // Samplers
    sampler;

    // Layouts
    heatmapComputeBindGroupLayout;
    heatmapComputePipelineLayout;

    // Pipelines
    imageRenderPipeline;
    markersRenderPipeline;
    heatmapComputeClearPipeline;
    heatmapComputeCountPipeline;
    heatmapComputeMaxPipeline;
    heatmapRenderPipeline;

    // Bind Groups
    imageBindGroup;
    markersBindGroup;
    heatmapComputeBindGroup;
    heatmapRenderBindGroup;

    // Attachments
    colorAttachment;

    // Uniforms
    uniforms = {
        markerSize: 0.01,
        markerColor: [255, 0, 0], // The screenshots use [117, 107, 177]
        markerAlpha: 0.01,
        gridWidth: 50,
        gridHeight: 50,
    };

    // Constants
    GRID_MAX_WIDTH = 200;
    GRID_MAX_HEIGHT = 200;

    async initializeWebGPU() {
        if (!this.gpu) {
            this.gpu = navigator.gpu;
            if (!this.gpu) {
                const message = "WebGPU is not supported in your browser. Please use/update Chrome or Edge.";
                alert(message);
                throw new Error(message);
            }
            console.log("Hooray! WebGPU is supported in your browser!");
        }
        this.adapter = await this.gpu.requestAdapter();
        this.device = await this.adapter.requestDevice();

        this.context = this.canvas.getContext("webgpu");
        this.context.configure({
            device: this.device,
            format: this.gpu.getPreferredCanvasFormat()
        });
    }

    async initializeBuffers() {
        this.trees = await LOADER.loadTrees(true); // Load 219,378 trees

        // TreeInfo
        this.gpuTreeInfo = this.device.createBuffer({
            size: this.trees.getInfoBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE,
            mappedAtCreation: true,
        });
        new Uint32Array(this.gpuTreeInfo.getMappedRange()).set(this.trees.getInfoBuffer());
        this.gpuTreeInfo.unmap();

        // TreeCoordinates
        this.gpuTreeCoodinates = this.device.createBuffer({
            size: this.trees.getCoordinatesLatLonBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE,
            mappedAtCreation: true
        });
        new Float32Array(this.gpuTreeCoodinates.getMappedRange()).set(this.trees.getCoordinatesLatLonBuffer());
        this.gpuTreeCoodinates.unmap();

        // Uniforms
        this.gpuUniforms = this.device.createBuffer({
            size: 1024, // Allocate 1024 bytes. Enough space for 256 floats/ints/uints (each is 4 bytes). That should be enough
            // UNIFORM (of course) and COPT_DST so that we can later write to it
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // Write to the uniforms buffer in render()

        // Cells
        this.gpuGridCells = this.device.createBuffer({
            // Reserve enough space for the maximum number of cells
            size: this.GRID_MAX_WIDTH * this.GRID_MAX_HEIGHT * Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE,
        });
        
        // Grid 
        this.gpuGrid = this.device.createBuffer({
            // One 32-bit unsigned integer
            size: Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE,
        });
    }

    async initializeTextures() {
        this.map = await LOADER.loadMap(); // Load map images and geographical data

        const image = this.map.images.outdoors; // Try 'satellite' or 'streets' as well
        this.gpuMapTexture = this.device.createTexture({
            size: [image.width, image.height],
            format: "rgba8unorm",
            // TEXTURE_BINDING is needed to bind the texture to the pipeline
            // We also need to copy the image to the texture, so we need COPY_DST and RENDER_ATTACHMENT as well
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING  | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        this.device.queue.copyExternalImageToTexture(
            {source: image, flipY: true}, // Source
            {texture: this.gpuMapTexture}, // Destination
            [image.width, image.height] // Size
        );

        this.sampler = this.device.createSampler({
            magFilter: 'linear',
            minFilter: 'linear'
        });
    }

    async initializeLayouts() {
        this.heatmapComputeBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
                { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
                { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
                { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
                { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
            ]
        });

        this.heatmapComputePipelineLayout = this.device.createPipelineLayout({
            bindGroupLayouts: [
                this.heatmapComputeBindGroupLayout,
            ]
        });
    }

    async initializePipelines() {
        const imageShaderModule = this.device.createShaderModule({ code: SHADERS.image });
        this.imageRenderPipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: imageShaderModule,
                entryPoint: "vertex",
                // buffers: We don't need any vertex buffer :)
            },
            fragment: {
                module: imageShaderModule,
                entryPoint: "fragment",
                targets: [
                    {
                        // Only one render target, where our color will be drawn
                        format: this.gpu.getPreferredCanvasFormat()
                    }
                ]
            },
        });

        const markersShaderModule = this.device.createShaderModule({ code: SHADERS.markers });
        this.markersRenderPipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: markersShaderModule,
                entryPoint: "vertex",
                // buffers: We don't need any vertex buffer :)
            },
            fragment: {
                module: markersShaderModule,
                entryPoint: "fragment",
                targets: [{
                    format: this.gpu.getPreferredCanvasFormat(),
                    blend: {
                        color: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" },
                        alpha: { operation: "add", srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha" }
                    }
                }]
            }
        });

        const pipelineDescriptor = {
            layout: this.heatmapComputePipelineLayout,
            compute: {
                module: this.device.createShaderModule({ code: SHADERS.heatmapCompute }),
                entryPoint: null // Set for each pipeline
            }
        };
        pipelineDescriptor.compute.entryPoint = "clear";
        this.heatmapComputeClearPipeline = this.device.createComputePipeline(pipelineDescriptor);
        pipelineDescriptor.compute.entryPoint = "count";
        this.heatmapComputeCountPipeline = this.device.createComputePipeline(pipelineDescriptor);
        pipelineDescriptor.compute.entryPoint = "max";
        this.heatmapComputeMaxPipeline = this.device.createComputePipeline(pipelineDescriptor);

        const heatmapRenderShaderModule = this.device.createShaderModule({ code: SHADERS.heatmapRender });
        this.heatmapRenderPipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: heatmapRenderShaderModule,
                entryPoint: "vertex",
                // buffers: We don't need any vertex buffer :)
            },
            fragment: {
                module: heatmapRenderShaderModule,
                entryPoint: "fragment",
                targets: [
                    {
                        format: this.gpu.getPreferredCanvasFormat(),
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
    }

    async initializeBindGroups() {
        this.imageBindGroup = this.device.createBindGroup({
            layout: this.imageRenderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.gpuMapTexture.createView() },
                { binding: 1, resource: this.sampler },
            ]
        });

        this.markersBindGroup = this.device.createBindGroup({
            layout: this.markersRenderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.gpuTreeCoodinates } },
                { binding: 1, resource: { buffer: this.gpuTreeInfo } },
                { binding: 2, resource: { buffer: this.gpuUniforms } },
            ]
        });

        this.heatmapComputeBindGroup = this.device.createBindGroup({
            layout: this.heatmapComputeBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.gpuTreeCoodinates} },
                { binding: 1, resource: { buffer: this.gpuTreeInfo } },
                { binding: 2, resource: { buffer: this.gpuGridCells } },
                { binding: 3, resource: { buffer: this.gpuGrid } },
                { binding: 4, resource: { buffer: this.gpuUniforms } },
            ]
        });

        this.heatmapRenderBindGroup = this.device.createBindGroup({
            layout: this.heatmapRenderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.gpuGridCells } },
                { binding: 1, resource: { buffer: this.gpuGrid } },
                { binding: 2, resource: { buffer: this.gpuUniforms } },
            ]
        });
    }

    async initializeAttachments() {
        // Calculate size of our image and set it to the canvas
        const minSide = -100 + Math.min(this.canvas.parentNode.clientWidth, this.canvas.parentNode.clientHeight);
        this.canvas.width = minSide;
        this.canvas.height = minSide;

        // Color attachment to draw to
        this.colorAttachment = {
            view: null, // Will be set in render(), i.e., every frame
            loadOp: "clear",
            clearValue: {r: 0, g: 0, b: 0, a: 0},
            storeOp: "store"
        };
    }

    async initializeGUI() {
        const onChange = () => this.render();
        [
            this.gui.add(this.uniforms, "markerSize", 0.001, 0.1, 0.001),
            this.gui.addColor(this.uniforms, "markerColor"),
            this.gui.add(this.uniforms, "markerAlpha", 0.01, 1, 0.01),
            this.gui.add(this.uniforms, "gridWidth", 1, this.GRID_MAX_WIDTH, 1),
            this.gui.add(this.uniforms, "gridHeight", 1, this.GRID_MAX_HEIGHT, 1),
        ]
        .forEach((controller) => controller.onChange(onChange));
    }

    async readBuffer(gpuBuffer, outputArray) {
        // This buffer can be read on the CPU because of MAP_READ
        const readBuffer = this.device.createBuffer({
            size: outputArray.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Copy from 'buffer' to 'readBuffer'
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, outputArray.byteLength);
        this.device.queue.submit([commandEncoder.finish()]);

        // Map the GPU data to the CPU
        await readBuffer.mapAsync(GPUMapMode.READ);

        // Read the data.
        const resultData = new outputArray.constructor(readBuffer.getMappedRange());

        // Copy the data to the output array
        outputArray.set(resultData);

        // The read buffer is no longer needed
        readBuffer.destroy();

        return outputArray;
    }

    async render() {
        // Copy the uniforms to the GPU buffer
        // Warning: the layout must match the layout of the uniform buffer in the shader
        this.device.queue.writeBuffer(this.gpuUniforms, 0, new Float32Array([
            this.map.width,
            this.map.height,
            this.map.latitude.min,
            this.map.latitude.max,
            this.map.longitude.min,
            this.map.longitude.max,
            this.uniforms.markerSize,
            0, // Unused
            this.uniforms.markerColor[0] / 255,
            this.uniforms.markerColor[1] / 255,
            this.uniforms.markerColor[2] / 255,
            this.uniforms.markerAlpha,
            this.uniforms.gridWidth,
            this.uniforms.gridHeight,
        ]));

        this.colorAttachment.view = this.context.getCurrentTexture().createView();

        const commandEncoder = this.device.createCommandEncoder();
        {
            const numWorkgroupsTrees = Math.ceil(this.trees.getNumTrees() / 64);
            const numWorkgroupCells = Math.ceil(this.uniforms.gridWidth * this.uniforms.gridHeight / 64);

            const computePass = commandEncoder.beginComputePass();

            // Set one bindgroup for all three pipelines
            computePass.setBindGroup(0, this.heatmapComputeBindGroup);

            // Clear
            computePass.setPipeline(this.heatmapComputeClearPipeline);
            computePass.dispatchWorkgroups(numWorkgroupCells);

            // Count
            computePass.setPipeline(this.heatmapComputeCountPipeline);
            computePass.dispatchWorkgroups(numWorkgroupsTrees);

            // Max
            computePass.setPipeline(this.heatmapComputeMaxPipeline);
            computePass.dispatchWorkgroups(numWorkgroupCells);

            computePass.end();
        }
        {
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [this.colorAttachment]
            });

            // Render map
            renderPass.setPipeline(this.imageRenderPipeline);
            renderPass.setBindGroup(0, this.imageBindGroup);
            renderPass.draw(6); // One quad

            // Render markers
            //renderPass.setPipeline(this.markersRenderPipeline);
            //renderPass.setBindGroup(0, this.markersBindGroup);
            //renderPass.draw(6 * this.trees.getNumTrees()); // As many quads as we have trees

            // Render heatmap
            renderPass.setPipeline(this.heatmapRenderPipeline);
            renderPass.setBindGroup(0, this.heatmapRenderBindGroup);
            renderPass.draw(6 * this.uniforms.gridWidth * this.uniforms.gridHeight); // As many quads as we have grid cells

            renderPass.end();
        }
        const commandBuffer = commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);
    }

}