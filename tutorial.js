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

    }

    async initializeBuffers() {

    }

    async initializeTextures() {
        
    }

    async initializeLayouts() {
        
    }

    async initializePipelines() {

    }

    async initializeBindGroups() {

    }

    async initializeAttachments() {
        
    }

    async initializeGUI() {

    }

    async readBuffer(gpuBuffer, outputArray) {

    }

    async render() {

    }

}