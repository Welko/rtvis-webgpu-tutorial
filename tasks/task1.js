class Tutorial {

    async start() {
        await this.initializeWebGPU();
        await this.initializeBuffers();
        await this.initializeTextures();
        await this.initializeUniforms();
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
        this.data = new Float32Array([1, 2, 3, 4]);
        this.buffer = this.device.createBuffer({ // Create GPU buffer
            size: this.data.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, // Storage buffers can be indexed directly on the GPU
            mappedAtCreation: true, // Enables us to write to the buffer immediately
        });
        new Float32Array(this.buffer.getMappedRange()).set(this.data); // Write to the buffer
        this.buffer.unmap(); // Unmap on the CPU so that the GPU can use it
    }

    async initializeTextures() {
        
    }

    async initializeUniforms() {
        
    }

    async initializePipelines() {
        this.pipeline = this.device.createComputePipeline({
            layout: "auto", // Bad practice. Good enough for a tutorial though
            compute: {
                module: this.device.createShaderModule({
                    code: SHADERS.add
                }),
                entryPoint: "main" // Name of the entry point function in the shader
            }
        });
    }

    async initializeBindGroups() {
        this.bindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0), // Ideally created manually, but this is good enough for a tutorial
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
        console.log(await this.readBuffer(this.buffer, new Float32Array(this.data.length)));
    }

}