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

    async readBuffer(buffer, size) {

    }

    async render() {

    }

}