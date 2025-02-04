const Experiment4 = {};

Experiment4.lerp = function (min, max, weight) {
    return min + (max - min)*weight;
}

Experiment4.clamp = function (min, max, value) {
    if (value < min) return min;
    else if (value > max) return max;
    else return value;
}

Experiment4.Application = new class {
    constructor() {
        this.canvas = document.querySelector("canvas");
        this.graphics = this.canvas.getContext("2d");
        this.drawPreview();
        this.addEventListeners();
    }
    addEventListeners() {
        this.mouse = {};
        this.canvas.addEventListener("click", ev => {
            this.mouse.down = false;
            this.mouse.x = ev.offsetX;
            this.mouse.y = ev.offsetY;
            if (!this.running) {
                this.start();
            }
        });
        this.canvas.addEventListener("mousedown", ev => {
            this.mouse.down = true;
            this.mouse.x = ev.offsetX;
            this.mouse.y = ev.offsetY;
        });
        this.canvas.addEventListener("mouseup", ev => {
            this.mouse.down = false;
            this.mouse.x = ev.offsetX;
            this.mouse.y = ev.offsetY;
            if (this.running) {
                if (this.mouse.dragging) {
                    this.onDragRelease();
                } else {
                    this.onClick();
                }
            }
            this.mouse.dragging = false;
        });
        this.canvas.addEventListener("mousemove", ev => {
            const dx = ev.offsetX - this.mouse.x;
            const dy = ev.offsetY - this.mouse.y;
            this.mouse.x = ev.offsetX;
            this.mouse.y = ev.offsetY;
            if (this.mouse.down && Math.sqrt(dx**2 + dy**2) > 2) {
                this.mouse.dragging = true;
                if (this.running) {
                    this.onDrag(dx, dy);
                }
            }
        });
    }
    async start() {
        if (!this.running) {
            this.running = true;
            this.setup();
            let then = performance.now();
            while (this.running) {
                this.draw();
                await new Promise(requestAnimationFrame);
                const now = performance.now();
                this.update(now - then);
                then = now;
            }
        }
    }
    setup() {
        this.audio = new AudioContext();
        this.voicePool = new Experiment4.VoicePool(this);
        this.timers = [];
        this.cursorHue = 0;
        this.waves = [];
        this.squiggles = [];
        this.workingSquiggle = null;
        this.period = 8000;
        this.clock = 0;
        this.timeMouseHeld = 0;
    }
    async wait(n) {
        let waited = 0;
        await new Promise(resolve => this.timers.push(deltaTime => {
            waited += deltaTime;
            if (waited >= n) {
                resolve(waited);
                return true;
            } else {
                return false;
            }
        }));
    }
    async waitUntil(cond) {
        let waited = 0;
        await new Promise(resolve => this.timers.push(deltaTime => {
            waited += deltaTime;
            if (cond(waited)) {
                resolve(waited);
                return true;
            } else {
                return false;
            }
        }));
    }
    drawPreview() {
        this.graphics.fillStyle = "black";
        this.graphics.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    get cursorRadius() {
        return 8 + this.timeMouseHeld/100;
    }
    draw() {
        this.graphics.fillStyle = "black";
        this.graphics.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.graphics.fillStyle = `hsl(${this.cursorHue} 100% 50%)`;
        for (const wave of this.waves) {
            wave.draw();
        }
        for (const squiggle of this.squiggles) {
            squiggle.draw();
        }
        this.graphics.beginPath();
        this.graphics.ellipse(
            this.mouse.x, this.mouse.y,
            this.cursorRadius, this.cursorRadius,
            0, 0, 2*Math.PI
        );
        this.graphics.fill();
    }
    update(deltaTime) {
        if (this.mouse.dragging) {
            this.cursorHue = (
                Math.round(this.mouse.x*360/this.canvas.width)%360 +
                360
            )%360;
        } else {
            this.cursorHue = (this.cursorHue + deltaTime/2)%360;
        }
        if (this.mouse.down && !this.mouse.dragging) {
            this.timeMouseHeld += deltaTime;
        } else {
            this.timeMouseHeld -= 8*deltaTime;
            if (this.timeMouseHeld <= 0) {
                this.timeMouseHeld = 0;
            }
        }
        for (const wave of this.waves) {
            wave.update(deltaTime);
        }
        for (const squiggle of this.squiggles) {
            squiggle.update(deltaTime);
        }
        for (let i = this.timers.length - 1; i >= 0; i--) {
            if (this.timers[i](deltaTime)) {
                this.timers.splice(i, 1);
            }
        }
        this.clock = (this.clock + deltaTime)%this.period;
    }
    onClick() {
        this.waves.push(new Experiment4.Wave(this));
    }
    onDrag(dx, dy) {
        if (!this.workingSquiggle) {
            this.workingSquiggle = new Experiment4.Squiggle(
                this, this.mouse.x - dx, this.mouse.y - dy
            );
            this.squiggles.push(this.workingSquiggle);
        }
        this.workingSquiggle.addVertex(this.mouse.x, this.mouse.y);
    }
    onDragRelease() {
        if (this.workingSquiggle) {
            this.workingSquiggle.activate();
            this.workingSquiggle = null;
        }
    }
};

Experiment4.VoicePool = class {
    constructor(app, count = 12) {
        this.voices = [];
        for (; count > 0; count--) {
            this.voices.push(new Experiment4.Voice(app, "triangle"));
        }
    }
    play(note, volume = 1, when = null) {
        for (const voice of this.voices) {
            if (!voice.playing) {
                voice.play(note, volume, when);
                return true;
            }
        }
        return false;
    }
    slide(seq, when = null) {
        for (const voice of this.voices) {
            if (!voice.playing) {
                voice.slideSequence(seq, when);
                return true;
            }
        }
        return false;
    }
    slideStream(stream) {
        for (const voice of this.voices) {
            if (!voice.playing) {
                voice.slideStream(stream);
                return true;
            }
        }
        return false;
    }
}

Experiment4.Voice = class {
    constructor(app, oscType = "sine") {
        this.app = app;
        const now = app.audio.currentTime;
        this.oscillatorVolume = 0.25;
        this.oscillators = [];
        this.gains = [];
        this.master = app.audio.createGain();
        this.master.gain.value = 0;
        this.master.connect(app.audio.destination);
        for (let i = 0; i < 2; i++) {
            const oscillator = app.audio.createOscillator();
            oscillator.type = oscType;
            oscillator.frequency.setValueAtTime(220*(2**i), now + 0.01);
            const gain = app.audio.createGain();
            gain.gain.value = 0;
            this.oscillators.push(oscillator);
            this.gains.push(gain);
            oscillator.connect(gain);
            gain.connect(this.master);
            oscillator.start(now + 0.02);
        }
    }
    shepard(note) {
        note = (note%12 + 12)%12;
        const flo = 220*(2**(note/12));
        const fhi = 2*flo;
        const vlo = Experiment4.clamp(
            0, 1, (note >= 6) ? (note - 6)/6 : note/6
        )*this.oscillatorVolume;
        const vhi = Experiment4.clamp(
            0, 1, (note >= 6) ? 1 - (note - 6)/6 : 1 - note/6
        )*this.oscillatorVolume;
        return {flo, fhi, vlo, vhi};
    }
    get playing() {
        return this.master.gain.value > 0.01;
    }
    stop(when = null) {
        when ||= this.app.audio.currentTime + 0.1;
        this.master.gain.linearRampToValueAtTime(0, when);
        this.oscillators[0].frequency.cancelScheduledValues(when + 0.01);
        this.gains[0].gain.cancelScheduledValues(when + 0.01);
        this.oscillators[1].frequency.cancelScheduledValues(when + 0.01);
        this.gains[1].gain.cancelScheduledValues(when + 0.01);
        this.master.gain.cancelScheduledValues(when + 0.01);
    }
    play(note, volume = 1, when = null) {
        const {flo, fhi, vlo, vhi} = this.shepard(note);
        when ||= this.app.audio.currentTime + 0.01;
        this.stop(when);
        this.oscillators[0].frequency.setValueAtTime(flo, when + 0.015);
        this.gains[0].gain.setValueAtTime(vlo, when + 0.015);
        this.oscillators[1].frequency.setValueAtTime(fhi, when + 0.015);
        this.gains[1].gain.setValueAtTime(vhi, when + 0.015);
        this.master.gain.setValueAtTime(0, when + 0.015);
        this.master.gain.linearRampToValueAtTime(volume, when + 0.05);
        this.stop(when + 0.5);
        if (this.app.audio.state == "suspended") {
            this.app.audio.resume();
        }
    }
    slide(note, volume = 1, when = null) {
        const {flo, fhi, vlo, vhi} = this.shepard(note);
        when ||= this.app.audio.currentTime + 0.1;
        this.oscillators[0].frequency.linearRampToValueAtTime(flo, when);
        this.gains[0].gain.linearRampToValueAtTime(vlo, when);
        this.oscillators[1].frequency.linearRampToValueAtTime(fhi, when);
        this.gains[1].gain.linearRampToValueAtTime(vhi, when);
        this.master.gain.linearRampToValueAtTime(volume, when);
    }
    slideSequence(seq, when = null) {
        when ||= this.app.audio.currentTime + 0.01;
        this.stop(when);
        when += 0.015;
        for (const keyframe of seq) {
            const {note, volume, length} = keyframe;
            this.slide(note, volume, when);
            when += length || 0;
        }
        this.stop(when);
    }
    async slideStream(stream) {
        const now = this.app.audio.currentTime;
        this.stop();
        await this.app.waitUntil(() =>
            this.app.audio.currentTime >= now + 0.12);
        for await (const keyframe of stream) {
            const {note, volume} = keyframe;
            this.slide(note, volume);
        }
        this.stop();
    }
};

Experiment4.Wave = class {
    constructor(app) {
        this.app = app;
        this.x = app.mouse.x;
        this.y = app.mouse.y;
        this.pitch = app.cursorHue;
        this.clock = app.period;
        this.rippleLifetime = 2000;
        this.rippleMaxRadius = 20*app.cursorRadius;
        this.volume = Experiment4.lerp(
            1/4, 1,
            Experiment4.clamp(
                0, 1,
                app.cursorRadius/16 - 1
            )
        );
        this.ripples = [];
    }
    draw() {
        for (const r of this.ripples) {
            const life = Experiment4.clamp(0, 1, 1 - r/this.rippleLifetime);
            const radius = Experiment4.lerp(0, this.rippleMaxRadius, 1 - life);
            this.app.graphics.strokeStyle =
                `hsl(${this.pitch} 100% 50% / ${Math.round(life*100)}%)`;
            this.app.graphics.lineWidth = 4*life;
            this.app.graphics.beginPath();
            this.app.graphics.ellipse(
                this.x, this.y, radius, radius, 0, 0, 2*Math.PI
            );
            this.app.graphics.stroke();
        }
    }
    update(deltaTime) {
        if (this.clock >= this.app.period) {
            this.clock %= this.app.period;
            this.fire();
        }
        this.updateRipples(deltaTime);
        this.clock += deltaTime;
    }
    updateRipples(deltaTime) {
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            this.ripples[i] += deltaTime;
            if (this.ripples[i] >= this.rippleLifetime) {
                this.ripples.splice(i, 1);
            }
        }
    }
    async fire() {
        this.app.voicePool.play(this.pitch/30, this.volume);
        this.ripple();
        await this.app.wait(250);
        this.ripple();
        await this.app.wait(250);
        this.app.voicePool.play(this.pitch/30, this.volume*2/3);
        this.ripple();
        await this.app.wait(250);
        this.ripple();
        await this.app.wait(250);
        this.app.voicePool.play(this.pitch/30, this.volume*1/3);
        this.ripple();
        await this.app.wait(250);
        this.ripple();
    }
    ripple() {
        this.ripples.push(0);
    }
};

Experiment4.Squiggle = class {
    constructor(app, x, y) {
        this.app = app;
        this.active = false;
        this.period = null;
        this.phase = null;
        this.vertices = [{x, y}];
        this.prelude();
    }
    prelude() {
        let lastLength = this.vertices.length;
        let before = performance.now();
        const self = this;
        this.app.voicePool.slideStream((async function* () {
            while (!self.active) {
                yield self.getSlideNote(lastLength - 1);
                await self.app.waitUntil(() =>
                    self.active || self.vertices.length != lastLength);
                const after = performance.now();
                if (lastLength == self.vertices.length) {
                    self.vertices[lastLength - 1].length =
                        (after - before)/1000;
                } else {
                    const nextLength = self.vertices.length;
                    const sublength =
                        (after - before)/(nextLength - lastLength);
                    for (
                        let i = lastLength - 1;
                        i < nextLength - 1;
                        i++
                    ) {
                        self.vertices[i].length = sublength/1000;
                    }
                }
                lastLength = self.vertices.length;
                before = performance.now();
            }
        })());
    }
    addVertex(x, y) {
        this.vertices.push({x, y});
    }
    getSlideNote(i) {
        const vertex = (typeof(i) == "object") ? i : this.vertices[i];
        const note = ((vertex.x*12/this.app.canvas.width)%12 + 12)%12;
        const volume =
            Experiment4.clamp(0, 1, 1 - vertex.y/this.app.canvas.height);
        const length = vertex.length;
        return {note, volume, length};
    }
    getColor(i) {
        const vertex = (typeof(i) == "object") ? i : this.vertices[i];
        const hue =
            (Math.round(vertex.x*360/this.app.canvas.width)%360 + 360)%360;
        const lightness = Experiment4.clamp(
            0, 100,
            Math.round(100*Experiment4.clamp(
                0, 1,
                1 - vertex.y/this.app.canvas.height
            ))
        );
        return `hsl(${hue} 100% ${lightness}%)`;
    }
    activate() {
        this.slideSequence = [];
        this.totalLength = 0;
        for (const vertex of this.vertices) {
            this.slideSequence.push(this.getSlideNote(vertex));
            this.totalLength += vertex.length || 0;
        }
        this.period =
            Math.ceil(this.totalLength/this.app.period)*this.app.period;
        this.clock = this.period - this.totalLength;
        this.active = true;
    }
    update(deltaTime) {
        if (this.active) {
            this.clock += deltaTime;
            if (this.clock >= this.period) {
                this.clock %= this.period;
                this.fire();
            }
        }
    }
    fire() {
        this.app.voicePool.slide(this.slideSequence);
    }
    draw() {
        this.app.graphics.lineWidth = 4;
        let t = 0;
        let prev = null;
        for (const vertex of this.vertices) {
            if (prev && (!this.active || t >= this.clock/1000)) {
                this.app.graphics.strokeStyle = this.getColor({
                    x: (prev.x + vertex.x)/2,
                    y: (prev.y + vertex.y)/2
                });
                this.app.graphics.beginPath();
                this.app.graphics.moveTo(prev.x, prev.y);
                this.app.graphics.lineTo(vertex.x, vertex.y);
                this.app.graphics.stroke();
            }
            t += vertex.length || 0;
            if (this.active && t >= (this.clock + 100)/1000) {
                break;
            }
            prev = vertex;
        }
    }
};
