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

    /**
     * @param {any} gui 
     * @param {HTMLCanvasElement} canvas 
     */
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
        this.trees = await LOADER.loadTrees(true); // Load 219,378 trees

        // TreeInfo
        this.gpuTreeInfo = this.device.createBuffer({
            size: this.trees.getInfoBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.gpuTreeInfo, 0, this.trees.getInfoBuffer());
        
        this.gpuAggregatedValues = this.device.createBuffer({
            size: 23 * Uint32Array.BYTES_PER_ELEMENT, // 23 unsigned integers (one per district in Vienna)
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
        
        // TreeCoordinates
        this.gpuTreeCoodinates = this.device.createBuffer({
            size: this.trees.getCoordinatesLatLonBuffer().byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.gpuTreeCoodinates, 0, this.trees.getCoordinatesLatLonBuffer());
        
        // Uniforms
        this.uniforms = {
            markerSize: 0.01,
            markerColor: [255, 0, 0], // The screenshots use [117, 107, 177]
            markerAlpha: 0.01,
        };
        this.gpuUniforms = this.device.createBuffer({
            size: 1024, // Allocate 1024 bytes. Enough space for 256 floats/ints/uints (each is 4 bytes). That should be enough
            // UNIFORM (of course) and COPT_DST so that we can later write to it
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        // Write to the uniforms buffer in render()
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
                // buffers: We don't need any vertex buffer :)
            },
            fragment: {
                module: imageShaderModule,
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
                // buffers: We don't need any vertex buffer :)
            },
            fragment: {
                module: markersShaderModule,
                targets: [{
                    format: this.gpu.getPreferredCanvasFormat()
                }]
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
    }

    async initializeAttachments() {
        // Set canvas css size
        const minSide = -100 + Math.min(this.canvas.parentElement.clientWidth, this.canvas.parentElement.clientHeight);
        this.canvas.style.width = minSide + "px";
        this.canvas.style.height = minSide + "px";

        // Color attachment to draw to
        /** @type {GPURenderPassColorAttachment} */
        this.colorAttachment = {
            view: null, // Will be set in render(), i.e., every frame
            loadOp: "clear",
            clearValue: {r: 0, g: 0, b: 0, a: 0},
            storeOp: "store"
        };
    }

    async initializeGUI() {

    }

    /**
     * @template {Float32Array | Uint32Array | Int32Array} T
     * @param {GPUBuffer} gpuBuffer
     * @param {T} outputArray
     * @returns {Promise<T>}
     */
    async readBuffer(gpuBuffer, outputArray) {
        // This buffer can be read on the CPU because of MAP_READ
        const readBuffer = this.device.createBuffer({
            size: outputArray.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });

        // Copy from 'gpuBuffer' to 'readBuffer'
        const commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(gpuBuffer, 0, readBuffer, 0, outputArray.byteLength);
        this.device.queue.submit([commandEncoder.finish()]);

        // Map the GPU data to the CPU
        await readBuffer.mapAsync(GPUMapMode.READ);

        // Read the data
        const ArrayType = /** @type {new (buffer: ArrayBufferLike) => T} */ (outputArray.constructor);
        const resultData = new ArrayType(readBuffer.getMappedRange());

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
        ]));

        this.colorAttachment.view = this.context.getCurrentTexture().createView();

        const commandEncoder = this.device.createCommandEncoder();
        {
            const renderPass = commandEncoder.beginRenderPass({
                colorAttachments: [this.colorAttachment]
            });

            // Render map
            renderPass.setPipeline(this.imageRenderPipeline);
            renderPass.setBindGroup(0, this.imageBindGroup);
            renderPass.draw(6); // One quad

            // Render markers
            renderPass.setPipeline(this.markersRenderPipeline);
            renderPass.setBindGroup(0, this.markersBindGroup);
            renderPass.draw(6 * this.trees.getNumTrees()); // As many quads as we have trees

            renderPass.end();
        }
        const commandBuffer = commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);
    }

}