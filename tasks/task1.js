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
    }

    async initializeBuffers() {
        this.data = new Uint32Array([1, 2, 3, 4]);
        this.buffer = this.device.createBuffer({
        size: this.data.byteLength,
        // Storage buffers can be indexed directly on the GPU
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
        });
        this.device.queue.writeBuffer(this.buffer, 0, this.data);
    }

    async initializeTextures() {
        
    }

    async initializeLayouts() {
        
    }

    async initializePipelines() {
        this.pipeline = this.device.createComputePipeline({
            // Use simplistic auto-generation
            // Bigger applications will manually generate a layout, and share it across muliple shaders
            layout: "auto", 
            compute: {
                module: this.device.createShaderModule({
                    code: SHADERS.add
                }),
            }
        });
    }

    async initializeBindGroups() {
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0), // group(0)
            entries: [
                {
                    binding: 0, // Matches our shader!
                    resource: {
                        buffer: this.buffer // Our data!
                    }
                }
            ]
        });
    }

    async initializeAttachments() {
        
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
        const commandEncoder = this.device.createCommandEncoder();
        {
            const computePass = commandEncoder.beginComputePass();
            computePass.setPipeline(this.pipeline);
            computePass.setBindGroup(0, this.bindGroup);
            computePass.dispatchWorkgroups(1); // Only one workgroup! (64 threads, as defined in the shader)
            computePass.end();
        }
        const commandBuffer = commandEncoder.finish();
        
        this.device.queue.submit([commandBuffer]);
        
        console.log(await this.readBuffer(this.buffer, new Uint32Array(this.data.length)));
    }

}