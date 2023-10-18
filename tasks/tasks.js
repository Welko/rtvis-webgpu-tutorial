/*

To run the tasks, make sure to include all of them in the HTML.
Just paste this into the HTML file:

<script src="tasks/task1.js"></script>
<script src="tasks/task2.js"></script>
<script src="tasks/task3.js"></script>
<script src="tasks/task4.js"></script>
<script src="tasks/task5.js"></script>
<script src="tasks/tasks.js"></script>

*/

class Tasks {

    static tasks = Object.entries(window)
            .filter(([key, task]) => key.startsWith("task"))
            .map(([key, task]) => [parseInt(key.substring(4)), key, task])
            .filter(([number, key, task]) => !isNaN(number))
            .sort(([number1, key1, task1], [number2, key2, task2]) => number1 - number2);

    // Loaded if needed as soon as TASKS.runOne() is called
    static gui = null;
    static canvas = null;
    static gpu = null;
    static adapter = null;
    static device = null;
    static context = null;
    static trees = null;
    static lotsOfTrees = null;
    static map = null;
    static initialized = null;

    constructor(gui, canvas) {
        Tasks.initialized = new Promise(async (resolve, reject) => {
            Tasks.gui = gui;
            Tasks.canvas = canvas;
            if (!Tasks.gpu) {
                Tasks.gpu = navigator.gpu;
                if (!Tasks.gpu) {
                    alert("WebGPU is not supported in your browser. Please use/update Chrome or Edge.");
                    return false;
                }
            }
            if (!Tasks.adapter) {
                Tasks.adapter = await Tasks.gpu.requestAdapter();
            }
            if (!Tasks.device) {
                Tasks.device = await Tasks.adapter.requestDevice();
            }
            if (!Tasks.context) {
                Tasks.context = canvas.getContext("webgpu");
                Tasks.context.configure({
                    device: Tasks.device,
                    format: Tasks.gpu.getPreferredCanvasFormat()
                });
            }
            if (!Tasks.trees) {
                Tasks.trees = await LOADER.loadTrees();
            }
            if (!Tasks.lotsOfTrees) {
                Tasks.lotsOfTrees = await LOADER.loadTrees(true);
            }
            if (!Tasks.map) {
                Tasks.map = await LOADER.loadMap();
            }
            resolve();
        });
    }

    async runOne(number, key, task) {
        await Tasks.initialized;
        try {
            await task();
        } catch (e) {
            const message = `Error in task ${number} ("${key}")`;
            console.error(message, e);
            alert(message + ": See console for details");
            return false;
        }
        return true;
    }
    
    async runAll() {
        for (const [number, key, task] of Tasks.tasks) {
            const noErrors = await this.runOne(number, key, task);
            if (!noErrors) {
                break;
            }
        }
    }

    async runlast() {
        const [number, key, task] = Tasks.tasks[Tasks.tasks.length - 1];
        await this.runOne(number, key, task);
    };

};