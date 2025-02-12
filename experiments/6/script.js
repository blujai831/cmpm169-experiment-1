function assert(what) {
    if (!what) throw new Error("Assertion failed");
}

class Coroutine {
    // This is my own stackful coroutine implementation.
    // (Admittedly, async makes it easy.)
    // You may recognize it from Experiment 5.
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
        this._associations = {};
        this._backtrackLimit = Infinity;
        this.mode = "letters";
    }
    setBacktrackLimit(n) {
        this._backtrackLimit = n;
    }
    learnSingle(from, to) {
        console.log(`learn association: ${from} => ${to}`);
        this._associations[from] ||= {};
        this._associations[from][to] ||= 0;
        this._associations[from][to]++;
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
        if (progressCoro) {
            await progressCoro.yield(
                Math.floor(tokens.length*(tokens.length - 1)/2)
            );
            await progressCoro.yield(n);
        }
        for (let i = 1; i < tokens.length; i++) {
            let from = [];
            let to = tokens[i];
            for (
                let j = i - 1;
                j >= 0 && j >= i - this._backtrackLimit;
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
                Math.min(this._backtrackLimit, tokens.length);
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
                responseWeights = this._associations[phrase];
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

const markov = new Markov();
let busy = false;
const inputField = document.querySelector("input");
const outputArea = document.querySelector("output");

async function yieldToPage() {
    await new Promise(r => setTimeout(r, 0));
}

inputField.addEventListener("keydown", async (ev) => {
    if (ev.code == "Enter" && !busy) {
        busy = true;
        const prompt = inputField.value;
        inputField.value = "";
        let coro = new Coroutine(async function () {
            await markov.learn(outputArea.innerText, prompt, this);
            await this.yield("|||");
            await markov.respond(prompt, this);
        });
        const learnSteps = await coro.resume();
        for await (const value of coro) {
            if (value == "|||") {
                break;
            } else {
                outputArea.innerText =
                    `Learning... ${Math.round(value*100/learnSteps)}%`;
                await yieldToPage();
            }
        }
        outputArea.innerText = "";
        let str = "";
        for await (const value of coro) {
            str = markov.detokenize([str, value]);
            outputArea.innerText = str;
            await yieldToPage();
        }
        busy = false;
    }
});
