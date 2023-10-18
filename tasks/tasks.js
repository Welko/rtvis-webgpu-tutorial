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

const TASKS = {

    tasks: Object.entries(window)
            .filter(([key, task]) => key.startsWith("task"))
            .map(([key, task]) => [parseInt(key.substring(4)), key, task])
            .filter(([number, key, task]) => !isNaN(number))
            .sort(([number1, key1, task1], [number2, key2, task2]) => number1 - number2),

    runOne: async (number, key, task) =>  {
        if (!TASKS.trees) {
            TASKS.trees = await LOADER.loadTrees();
        }
        if (!TASKS.lotsOfTrees) {
            TASKS.lotsOfTrees = await LOADER.loadTrees(true);
        }
        if (!TASKS.map) {
            TASKS.map = await LOADER.loadMap();
        }
        try {
            await task();
        } catch (e) {
            const message = `Error in task ${number} ("${key}")`;
            console.error(message, e);
            alert(message + ": See console for details");
            return false;
        }
        return true;
    },
    
    runAll: async () => {
        for (const [number, key, task] of TASKS.tasks) {
            const noErrors = await TASKS.runOne(number, key, task);
            if (!noErrors) {
                break;
            }
        }
    },

    runLast: async () => {
        const [number, key, task] = TASKS.tasks[TASKS.tasks.length - 1];
        await TASKS.runOne(number, key, task);
    },

    // Loaded if needed as soon as TASKS.runOne() is called
    trees: null, 
    lotsOfTrees: null,
    map: null,

};