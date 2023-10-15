class Gui {

    root;

    #sections = {};

    #lastId = 0;

    constructor(title) {
        this.root = document.createElement("div");
        this.root.className = "root";

        const header = document.createElement("h1");
        header.className = "title";
        header.textContent = title;
        this.root.appendChild(header);
    }

    addElement(element, section, name=undefined) {
        let s = this.#sections[section];
        if (!s) {
            const header = document.createElement("h2");
            header.className = "header";
            header.textContent = section;
            header.addEventListener("click", () => {
                header.classList.toggle("collapsed");
            });
            this.root.appendChild(header);

            s = document.createElement("div");
            s.className = "section";
            this.root.appendChild(s);
        }
        if (!element.id) {
            element.id = "rtvis-" + this.#lastId++;
        }
        if (name) {
            const label = document.createElement("label");
            label.className = "label";
            label.textContent = name;
            label.htmlFor = element.id;
            s.appendChild(label);
        }
        s.appendChild(element);
        s.appendChild(document.createElement("br"));
    }

    static STYLE = `
.root {
    display: flex;
    flex-direction: column;
    font-family: monospace;
    padding: 0.5em;
}
.title {
    margin: 0 auto;
}
.title, .header {
    font-size: 1.2em;
    margin: 0 0 0.5em 0;
}
.header {
    border-bottom: 1px solid black;
}
.header:before {
    font-style: 'Arial','Source Sans Pro',Roboto,"San Francisco","Segoe UI",sans-serif;
    content: "-";
    margin-right: 0.5em;
}
.header.collapsed:before {
    content: "+";
}
.header:hover {
    background-color: white;
    cursor: pointer;
}
.header.collapsed:hover:before {
    content: "+";
}
.header.collapsed + .section {
    display: none;
}
.section {
    display: flex;
    flex-direction: column;
}
.section > * {
    font-size: 1em;
}
    `;

};