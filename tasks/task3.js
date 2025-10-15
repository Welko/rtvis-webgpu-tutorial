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

    // From here on, it is up to you to implement the tutorial
    // ----------------------------------------------------------------------------------------------------

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
        this.trees = await LOADER.loadTrees(); // Load 100 trees

        // TreeInfo
        this.gpuTreeInfo = this.device.createBuffer({
            size: this.trees.getInfoBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE,
            mappedAtCreation: true,
        });
        // Attention! Now it's a Uint32Array, not float :)
        new Uint32Array(this.gpuTreeInfo.getMappedRange()).set(this.trees.getInfoBuffer());
        this.gpuTreeInfo.unmap();
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

        // Set canvas render size to image dimension
        this.canvas.width = image.width;
        this.canvas.height = image.height;
    }

    async initializeLayouts() {
        
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
    }

    async initializeBindGroups() {
        this.imageBindGroup = this.device.createBindGroup({
            layout: this.imageRenderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: this.gpuMapTexture.createView() },
                { binding: 1, resource: this.sampler },
            ]
        });
    }

    async initializeAttachments() {
        // Set canvas css size
        const minSide = -100 + Math.min(this.canvas.parentNode.clientWidth, this.canvas.parentNode.clientHeight);
        this.canvas.style.width = minSide + "px";
        this.canvas.style.height = minSide + "px";

        // Color attachment to draw to
        this.colorAttachment = {
            view: null, // Will be set in render(), i.e., every frame
            loadOp: "clear",
            clearValue: {r: 0, g: 0, b: 0, a: 0},
            storeOp: "store"
        };
    }

    async initializeGUI() {

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
        this.colorAttachment.view = this.context.getCurrentTexture().createView();

        const commandEncoder = this.device.createCommandEncoder();
        {
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [this.colorAttachment]
            });
            renderPass.setPipeline(this.imageRenderPipeline);
            renderPass.setBindGroup(0, this.imageBindGroup);
            renderPass.draw(6); // 6 vertices - one quad
            renderPass.end();
        }
        const commandBuffer = commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);
    }

}