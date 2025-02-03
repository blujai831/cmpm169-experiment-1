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
            if (this.running) {
                this.onMouseDown();
            }
        });
        this.canvas.addEventListener("mouseup", ev => {
            this.mouse.down = false;
            this.mouse.x = ev.offsetX;
            this.mouse.y = ev.offsetY;
            if (this.running) {
                this.onMouseUp();
            }
        });
        this.canvas.addEventListener("mousemove", ev => {
            this.mouse.x = ev.offsetX;
            this.mouse.y = ev.offsetY;
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
                this.update(performance.now() - then);
                then = performance.now();
            }
        }
    }
    setup() {
        this.audio = new AudioContext();
        this.voicePool = new Experiment4.VoicePool(this);
        this.cursorHue = 0;
        this.waves = [];
        this.period = 8000;
        this.clock = 0;
        this.timeMouseHeld = 0;
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
        this.graphics.beginPath();
        this.graphics.ellipse(
            this.mouse.x, this.mouse.y,
            this.cursorRadius, this.cursorRadius,
            0, 0, 2*Math.PI
        );
        this.graphics.fill();
    }
    update(deltaTime) {
        this.cursorHue = (this.cursorHue + deltaTime/2)%360;
        if (this.mouse.down) {
            this.timeMouseHeld += deltaTime;
        } else {
            this.timeMouseHeld -= 4*deltaTime;
            if (this.timeMouseHeld <= 0) {
                this.timeMouseHeld = 0;
            }
        }
        for (const wave of this.waves) {
            wave.update(deltaTime);
        }
        this.clock = (this.clock + deltaTime)%this.period;
    }
    onMouseDown() {}
    onMouseUp() {
        this.waves.push(new Experiment4.Wave(this));
    }
};

Experiment4.VoicePool = class {
    constructor(app, count = 12) {
        this.voices = [];
        for (; count > 0; count--) {
            this.voices.push(new Experiment4.Voice(app));
        }
    }
    play(note, volume = 1) {
        for (const voice of this.voices) {
            if (!voice.playing) {
                voice.play(note, volume);
                return true;
            }
        }
        return false;
    }
}

Experiment4.Voice = class {
    constructor(app) {
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
            oscillator.type = "sine";
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
    play(note, volume = 1) {
        const now = this.app.audio.currentTime;
        note = (note%12 + 12)%12;
        let flo, fhi, vlo, vhi;
        flo = 220*(2**(note/12));
        fhi = 2*flo;
        vlo = Experiment4.clamp(
            0, 1, (note >= 6) ? (note - 6)/6 : note/6
        )*this.oscillatorVolume;
        vhi = Experiment4.clamp(
            0, 1, (note >= 6) ? 1 - (note - 6)/6 : 1 - note/6
        )*this.oscillatorVolume;
        this.oscillators[0].frequency.cancelScheduledValues(now + 0.01);
        this.oscillators[0].frequency.setValueAtTime(flo, now + 0.0101);
        this.gains[0].gain.cancelScheduledValues(now + 0.01);
        this.gains[0].gain.setValueAtTime(vlo, now + 0.0101);
        this.oscillators[1].frequency.cancelScheduledValues(now + 0.01);
        this.oscillators[1].frequency.setValueAtTime(fhi, now + 0.0101);
        this.gains[1].gain.cancelScheduledValues(now + 0.01);
        this.gains[1].gain.setValueAtTime(vhi, now + 0.0101);
        this.master.gain.cancelScheduledValues(now + 0.01);
        this.master.gain.setValueAtTime(0, now + 0.0101);
        this.master.gain.linearRampToValueAtTime(volume, now + 0.05);
        this.master.gain.linearRampToValueAtTime(0, now + 0.5);
        if (this.app.audio.state == "suspended") {
            this.app.audio.resume();
        }
    }
    get playing() {
        return this.master.gain.value > 0.01;
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
        this.timers = [];
    }
    async wait(n) {
        await new Promise(resolve => this.timers.push(deltaTime => {
            n -= deltaTime;
            if (n <= 0) {
                resolve();
                return true;
            } else {
                return false;
            }
        }));
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
        this.updateTimers(deltaTime);
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
    updateTimers(deltaTime) {
        for (let i = this.timers.length - 1; i >= 0; i--) {
            if (this.timers[i](deltaTime)) {
                this.timers.splice(i, 1);
            }
        }
    }
    async fire() {
        this.app.voicePool.play(this.pitch/30, this.volume);
        this.ripple();
        await this.wait(250);
        this.ripple();
        await this.wait(250);
        this.app.voicePool.play(this.pitch/30, this.volume*2/3);
        this.ripple();
        await this.wait(250);
        this.ripple();
        await this.wait(250);
        this.app.voicePool.play(this.pitch/30, this.volume*1/3);
        this.ripple();
        await this.wait(250);
        this.ripple();
    }
    ripple() {
        this.ripples.push(0);
    }
};
