function assert(what) {
    if (!what) throw new Error("Assertion failed");
}

class Coroutine {
    // This is my own stackful coroutine implementation.
    // (Admittedly, async makes it easy.)
    // You may recognize it from Experiment 5.
    // I've improved upon it by making it iterable.
    constructor(callback) {
        this._resume = callback.bind(this);
    }
    async resume(...args) {
        const resumeCallback = this._resume;
        this._resume = null;
        const yieldPromise = new Promise(r => this._yield = r);
        const resumePromise = resumeCallback(...args);
        // intentionally not awaited
        if (!this._overallPromise) {
            this._overallPromise = resumePromise;
            (async () => {
                try {
                    await this._overallPromise;
                    this._done = true;
                } catch (error) {
                    this._error = error;
                }
            })(); // intentionally not awaited
        }
        return await Promise.race([this._overallPromise, yieldPromise]);
    }
    async yield(...args) {
        const yieldCallback = this._yield;
        this._yield = null;
        const resumePromise = new Promise(r => this._resume = r);
        yieldCallback(...args);
        return await resumePromise;
    }
    get status() {
        if (this._error) {
            return "error";
        } else if (this._done) {
            return "done";
        } else if (this._resume) {
            return "stopped";
        } else if (this._yield) {
            return "running";
        } else {
            return "internal error";
        }
    }
    get result() {
        return this._overallPromise;
    }
    async next() {
        if (this.status == "stopped") {
            return {done: false, value: await this.resume()};
        } else if (this.status == "running") {
            return {done: false, value: await this.yield()};
        } else {
            return {done: true};
        }
    }
    [Symbol.asyncIterator]() {
        return this;
    }
}

class Markov {
    constructor() {
        this.associations = {};
        this.backtrackLimit = Infinity;
        this.mode = "words";
    }
    reset() {
        this.associations = {};
    }
    learnSingle(from, to) {
        this.associations[from] ||= {};
        this.associations[from][to] ||= 0;
        this.associations[from][to]++;
    }
    tokenize(text) {
        if (this.mode == "letters") {
            return text.
                toLowerCase().
                replaceAll(/[^a-z0-9\s]/gi, "").
                split(/\s+/).
                filter(s => s != "").
                join(" ").
                split("");
        } else {
            return text.
                toLowerCase().
                replaceAll(/[^a-z0-9\s]/gi, "").
                split(/\s+/).
                filter(s => s != "");
        }
    }
    detokenize(tokens) {
        if (this.mode == "letters") {
            return tokens.join("");
        } else {
            return tokens.join(" ");
        }
    }
    async learn(prompt, response, progressCoro = null) {
        const tokens = [
            "^",
            ...this.tokenize(prompt),
            "|",
            ...this.tokenize(response),
            "$"
        ];
        let n = 0;
        const start = tokens.indexOf("|") + 1;
        let expected = 0;
        for (let i = start; i < tokens.length; i++) {
            for (let j = i - 1; j >= 0 && j >= i - this.backtrackLimit; j--) {
                expected++;
            }
        }
        if (progressCoro) {
            await progressCoro.yield(expected);
            await progressCoro.yield(n);
        }
        for (let i = start; i < tokens.length; i++) {
            let from = [];
            let to = tokens[i];
            for (
                let j = i - 1;
                j >= 0 && j >= i - this.backtrackLimit;
                j--
            ) {
                from.splice(0, 0, tokens[j]);
                this.learnSingle(this.detokenize(from), to);
                if (progressCoro) await progressCoro.yield(++n);
            }
        }
    }
    async respond(prompt, outputCoro = null) {
        const tokens = ["^", ...this.tokenize(prompt), "|"];
        for (;;) {
            const maxLookbehind =
                Math.min(this.backtrackLimit, tokens.length);
            let lookbehind =
                Math.round((
                    Math.random()*(maxLookbehind - 1)
                ) + 1);
            let responseWeights;
            for (;;) {
                const phraseTokens = [];
                for (
                    let i = tokens.length - lookbehind;
                    i < tokens.length;
                    i++
                ) {
                    phraseTokens.push(tokens[i]);
                }
                const phrase = this.detokenize(phraseTokens);
                responseWeights = this.associations[phrase];
                if (responseWeights) {
                    break;
                } else {
                    lookbehind--;
                    assert(lookbehind > 0);
                }
            }
            const candidates = Object.keys(responseWeights);
            assert(candidates.length > 0);
            let possibilitySpaceSize = 0;
            for (const candidate of candidates) {
                possibilitySpaceSize += responseWeights[candidate];
            }
            const selection = Math.random()*possibilitySpaceSize;
            let choice;
            for (const candidate of candidates) {
                possibilitySpaceSize -= responseWeights[candidate];
                if (possibilitySpaceSize <= selection) {
                    choice = candidate;
                    break;
                }
            }
            assert(!!choice);
            tokens.push(choice);
            if (choice == "|" || choice == "$") break;
            else if (outputCoro) await outputCoro.yield(choice);
        }
    }
}

Markov.DataIO = new class {
    async compressAndSave(str) {
        // https://evanhahn.com/javascript-compression-streams-api-with-strings
        const chunks = [];
        for await (const chunk of (
            (new Blob([str])).stream().pipeThrough(
                new CompressionStream("gzip")
            )
        )) {
            chunks.push(chunk);
        }
        // https://stackoverflow.com/a/48280991
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(
            new Blob(chunks, {type: "application/gzip"})
        ));
        link.setAttribute("download", "markov.gz");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    async loadAndDecompress(file) {
        // https://evanhahn.com/javascript-compression-streams-api-with-strings
        const chunks = [];
        for await (const chunk of file.stream().pipeThrough(
            new DecompressionStream("gzip")
        )) {
            chunks.push(chunk);
        }
        return (new TextDecoder()).decode(new Uint8Array(
            await (new Blob(chunks)).arrayBuffer()
        ));
    }
    async fetchAndDecompress(url) {
        const chunks = [];
        for await (const chunk of (
            await (await fetch(url)).blob()
        ).stream().pipeThrough(
            new DecompressionStream("gzip")
        )) {
            chunks.push(chunk);
        }
        return (new TextDecoder()).decode(new Uint8Array(
            await (new Blob(chunks)).arrayBuffer()
        ));
    }
};

Markov.UI = class {
    constructor() {
        this.markov = new Markov();
        this.busy = false;
        this.learningMode = "conversational";
        this.lastPrompt = "";
        this.promptField = document.querySelector("#prompt");
        this.promptButton = document.querySelector("#submit-prompt-button");
        this.responseArea = document.querySelector("#response");
        this.maxLookbehindField = document.querySelector("#max-lookbehind");
        this.learningModeSelect =
            document.querySelector("#learning-mode-select");
        this.tokenModeSelect = document.querySelector("#token-mode-select");
        this.exportButton = document.querySelector("#model-export");
        this.importButton = document.querySelector("#model-import");
        this.collectionImportButtons =
            document.querySelectorAll("#collection-import-buttons button");
        this.visualizer = new (Markov.Visualizer)(this.markov);
        this.registerEventListeners();
        this.syncModelFromUI();
    }
    registerEventListeners() {
        this.promptField.addEventListener("keydown",
            this.handlePromptFieldKeydown.bind(this));
        this.promptButton.addEventListener("click",
            this.handlePromptButtonClick.bind(this));
        this.maxLookbehindField.addEventListener("change",
            this.handleMaxLookbehindFieldChange.bind(this));
        this.learningModeSelect.addEventListener("change",
            this.handleLearningModeSelectChange.bind(this));
        this.tokenModeSelect.addEventListener("change",
            this.handleTokenModeSelectChange.bind(this));
        this.exportButton.addEventListener("click",
            this.handleExportButtonClick.bind(this));
        this.importButton.addEventListener("change",
            this.handleImportButtonChange.bind(this));
        for (const button of this.collectionImportButtons) {
            button.addEventListener("click",
                this.handleCollectionImportButtonClick.bind(this, button.id));
        }
    }
    disable() {
        this.promptField.disabled = true;
        this.promptButton.disabled = true;
        this.maxLookbehindField.disabled = true;
        this.learningModeSelect.disabled = true;
        this.tokenModeSelect.disabled = true;
        this.exportButton.disabled = true;
        this.importButton.disabled = true;
        this.visualizer.disableInput();
        this.busy = true;
    }
    enable() {
        this.busy = false;
        this.visualizer.enableInput();
        this.promptField.disabled = false;
        this.promptButton.disabled = false;
        this.maxLookbehindField.disabled = false;
        this.learningModeSelect.disabled = false;
        this.tokenModeSelect.disabled = false;
        this.exportButton.disabled = false;
        this.importButton.disabled = false;
    }
    async yieldToPage() {
        await new Promise(r => setTimeout(r, 0));
    }
    handlePromptFieldKeydown(ev) {
        if (ev.code == "Enter") {
            this.respond();
        }
    }
    handlePromptButtonClick() {
        this.respond();
    }
    handleMaxLookbehindFieldChange() {
        if (this.busy) {
            this.setMaxLookbehindInUIFromModel();
        } else {
            this.setMaxLookbehindInModelFromUI();
        }
    }
    setMaxLookbehindInUIFromModel() {
        const n = this.markov.backtrackLimit;
        if (isFinite(n)) {
            this.maxLookbehindField.value = String(n);
        } else {
            this.maxLookbehindField.value = String(-1);
        }
    }
    setMaxLookbehindInModelFromUI() {
        const n = Number(this.maxLookbehindField.value);
        if (n > 0) {
            this.markov.backtrackLimit = n;
        } else {
            this.markov.backtrackLimit = Infinity;
        }
    }
    handleLearningModeSelectChange() {
        if (this.busy) {
            this.setLearningModeInUIFromModel();
        } else {
            this.setLearningModeInModelFromUI();
        }
    }
    setLearningModeInUIFromModel() {
        this.learningModeSelect.value = this.learningMode;
    }
    setLearningModeInModelFromUI() {
        this.learningMode = this.learningModeSelect.value;
    }
    handleTokenModeSelectChange() {
        if (this.busy) {
            this.setTokenModeInUIFromModel();
        } else {
            this.setTokenModeInModelFromUI();
        }
    }
    setTokenModeInUIFromModel() {
        this.tokenModeSelect.value = this.markov.mode;
    }
    setTokenModeInModelFromUI() {
        this.markov.mode = this.tokenModeSelect.value;
    }
    async handleExportButtonClick() {
        if (!this.busy) {
            this.disable();
            await Markov.DataIO.compressAndSave(
                this.exportToJSON()
            );
            this.enable();
        }
    }
    async handleImportButtonChange() {
        if (!this.busy) {
            this.disable();
            this.importFromJSON(
                await Markov.DataIO.loadAndDecompress(
                    this.importButton.files[0]
                )
            );
            this.enable();
            this.visualizer.visualize(["|"]);
            this.promptField.focus();
        }
    }
    async respond(prompt) {
        if (!this.busy) {
            this.disable();
            const prompt = this.promptField.value;
            this.promptField.value = "";
            const ui = this;
            const coro = new Coroutine(async function () {
                switch (ui.learningMode) {
                    case "conversational": {
                        await ui.markov.learn(
                            ui.responseArea.innerText,
                            prompt, this
                        );
                    } break;
                    case "instructive": {
                        await ui.markov.learn(
                            ui.lastPrompt,
                            prompt, this
                        );
                    } break;
                    default: {
                        await this.yield(0);
                    } break;
                }
                await this.yield("|||");
                await ui.markov.respond(prompt, this);
            });
            const learnSteps = await coro.resume();
            for await (const value of coro) {
                if (value == "|||") {
                    break;
                } else {
                    this.responseArea.innerText =
                        `Learning... ${Math.round(value*100/learnSteps)}%`;
                    await this.yieldToPage();
                }
            }
            let str = "";
            for await (const value of coro) {
                str = this.markov.detokenize([str, value]);
                this.responseArea.innerText = str;
                await this.yieldToPage();
            }
            this.lastPrompt = prompt;
            this.enable();
            if (prompt == "") {
                this.visualizer.visualize(["|"]);
            } else {
                const visPath = ["^", ...this.markov.tokenize(prompt), "|"];
                while (visPath.length > 0 && !this.markov.associations[
                    this.markov.detokenize(visPath)
                ]) {
                    visPath.splice(0, 1);
                }
                this.visualizer.visualize(visPath);
            }
            this.promptField.focus();
        }
    }
    exportToJSON() {
        return JSON.stringify({
            lastPrompt: this.lastPrompt,
            //lastResponse: this.responseArea.innerText,
            //learningMode: this.learningMode,
            tokenMode: this.markov.mode,
            maxLookbehind: this.markov.backtrackLimit,
            associations: this.markov.associations
        });
    }
    importFromJSON(json) {
        const obj = JSON.parse(json);
        this.lastPrompt = obj.lastPrompt;
        //this.responseArea.innerText = obj.lastResponse;
        //this.learningMode = obj.learningMode;
        this.markov.mode = obj.tokenMode;
        this.markov.backtrackLimit = obj.maxLookbehind || Infinity;
        this.markov.associations = obj.associations;
        this.responseArea.innerText = "";
        this.lastResponse = "";
        this.learningMode = "disabled";
        this.syncUIFromModel();
    }
    async handleCollectionImportButtonClick(id) {
        if (!this.busy) {
            this.disable();
            this.importFromJSON(
                await Markov.DataIO.fetchAndDecompress(
                    `./collection/${id}.gz`
                )
            );
            this.enable();
            this.visualizer.visualize(["|"]);
            this.promptField.focus();
        }
    }
    syncUIFromModel() {
        this.setMaxLookbehindInUIFromModel();
        this.setLearningModeInUIFromModel();
        this.setTokenModeInUIFromModel();
    }
    syncModelFromUI() {
        this.setMaxLookbehindInModelFromUI();
        this.setLearningModeInModelFromUI();
        this.setTokenModeInModelFromUI();
    }
};

Markov.Visualizer = class {
    constructor(markov) {
        this.markov = markov;
        this.buttons = [];
        this.pathText = document.querySelector("#visualizer-path");
        this.canvas = document.querySelector("#visualizer-canvas");
        this.graphics = this.canvas.getContext("2d");
        this.buttonList = document.querySelector("#visualizer-controls");
        this.visualize(["|"]);
    }
    visualize(path) {
        this.graphics.fillStyle = "black";
        this.graphics.fillRect(0, 0, this.canvas.width, this.canvas.height);
        const from = this.markov.detokenize(path);
        this.pathText.innerText = `Visualizing token path: ${from}`;
        this.graphics.font = "bold 16px serif";
        this.graphics.textAlign = "center";
        this.graphics.textBaseline = "middle";
        const centerX = this.canvas.width/2;
        const centerY = this.canvas.height/2;
        const maxW = this.canvas.width/4;
        const dist = Math.min(this.canvas.width, this.canvas.height)/3;
        this.graphics.fillStyle = "white";
        this.graphics.fillText(path[path.length - 1], centerX, centerY, maxW);
        const assocs = this.markov.associations[from];
        if (assocs) {
            const tos = Object.keys(assocs);
            let highest = 0;
            for (const to of tos) {
                if (assocs[to] > highest) {
                    highest = assocs[to];
                }
            }
            let i = 0;
            for (const to of tos) {
                const theta = 2*Math.PI*i/tos.length;
                const brightness = Math.round(255*assocs[to]/highest);
                this.graphics.fillStyle =
                    `rgb(${brightness} ${brightness} ${brightness})`;
                this.graphics.fillText(
                    to,
                    centerX + dist*Math.cos(theta),
                    centerY + dist*Math.sin(theta),
                    maxW
                );
                i++;
            }
        }
        this.clearButtonList();
        if (path.length > 0) {
            if (path[path.length - 1] != "|") {
                this.addButton("Backtrack (remove rightmost token)", () => {
                    path = [...path];
                    path.length--;
                    this.visualize(path);
                });
            }
            if (path[0] != "|") {
                this.addButton("Generalize (remove leftmost token)", () => {
                    path = [...path];
                    path.splice(0, 1);
                    this.visualize(path);
                });
            }
        }
        if (assocs) {
            for (const to of Object.keys(assocs)) {
                this.addButton(to, () => {
                    this.visualize([
                        ...path,
                        to
                    ]);
                });
            }
        } else {
            this.addTextToButtonList(`
                (The model does not know any continuations
                for the current token path.)
            `);
        }
    }
    clearButtonList() {
        this.buttons.length = 0;
        this.buttonList.innerHTML = "";
    }
    addButton(text, clickHandler) {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.innerHTML = text;
        button.addEventListener("click", clickHandler);
        this.buttons.push(button);
        li.appendChild(button);
        this.buttonList.appendChild(li);
        return button;
    }
    addTextToButtonList(text) {
        const li = document.createElement("li");
        const p = document.createElement("p");
        p.innerHTML = text;
        li.appendChild(p);
        this.buttonList.appendChild(li);
        return p;
    }
    enableInput() {
        for (const button of this.buttons) {
            button.disabled = true;
        }
    }
    disableInput() {
        for (const button of this.buttons) {
            button.disabled = false;
        }
    }
};

Markov.UI.Instance = new (Markov.UI)();

window.Markov = Markov;
