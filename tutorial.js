class Tutorial {

    async start() {
        await this.initializeWebGPU();
        await this.initializeBuffers();
        await this.initializeUniforms();
        await this.initializePipelines();
        await this.initializeBindGroups();
        await this.initializeGUI();
        this.render();
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

    async initializeUniforms() {
        
    }

    async initializePipelines() {

    }

    async initializeBindGroups() {

    }

    async initializeGUI() {

    }

    async readBuffer() {

    }

    render() {

    }

}