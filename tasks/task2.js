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

    // CPU Data
    trees;

    // GPU Data
    gpuTreeInfo;
    gpuAggregatedValues;

    // Pipelines
    aggregatePipeline;

    // Bind Groups
    aggregateBindGroup;

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

        // AggregatedValues
        this.gpuAggregatedValues = this.device.createBuffer({
            size: 23 * Uint32Array.BYTES_PER_ELEMENT, // 23 unsigned integers (one per district in Vienna)
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });
    }

    async initializeTextures() {
        
    }

    async initializeUniforms() {
        
    }

    async initializePipelines() {
        this.aggregatePipeline = this.device.createComputePipeline({
            layout: "auto",
            compute: {
                module: this.device.createShaderModule({ code: SHADERS.aggregate }),
                entryPoint: "main"
            }
        });
    }

    async initializeBindGroups() {
        this.aggregateBindGroup = this.device.createBindGroup({
            layout: this.aggregatePipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.gpuTreeInfo } },
                // Now we have a second buffer on binding 1!
                { binding: 1,  resource: { buffer: this.gpuAggregatedValues } }
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
            const numTreeWorkgroups = Math.ceil(this.trees.getNumTrees() / 64); // 64 from shader

            const computePass = commandEncoder.beginComputePass();
            computePass.setPipeline(this.aggregatePipeline);
            computePass.setBindGroup(0, this.aggregateBindGroup);
            computePass.dispatchWorkgroups(numTreeWorkgroups);
            computePass.end();
        }
        const commandBuffer = commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);
        console.log(await this.readBuffer(this.gpuAggregatedValues, new Uint32Array(23)));
    }

}