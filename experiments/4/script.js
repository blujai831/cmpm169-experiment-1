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
        this.canvas.addEventListener("click", this.start.bind(this));
    }
    async start() {
        if (!this.running) {
            this.running = true;
            this.setupAudio();
            let then = performance.now();
            while (this.running) {
                this.update(performance.now() - then);
                await new Promise(requestAnimationFrame);
                then = performance.now();
            }
        }
    }
    setupAudio() {
        this.audio = new AudioContext();
        this.voicePool = new Experiment4.VoicePool(this.audio);
    }
    update() {
        let self = this;
        this.coro ||= (function* () {
            for (let n = 0;; n--) {
                self.voicePool.play(n);
                for (let i = 0; i < 30; i++) yield;
            }
        })();
        this.coro.next();
    }
};

Experiment4.VoicePool = class {
    constructor(ctx, count = 12) {
        this.voices = [];
        for (; count > 0; count--) {
            this.voices.push(new Experiment4.Voice(ctx));
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
    constructor(ctx) {
        const now = ctx.currentTime;
        this.context = ctx;
        this.oscillatorVolume = 0.1;
        this.oscillators = [];
        this.gains = [];
        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(ctx.destination);
        for (let i = 0; i < 2; i++) {
            const oscillator = ctx.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(220*(2**i), now + 0.01);
            const gain = ctx.createGain();
            gain.gain.value = 0;
            this.oscillators.push(oscillator);
            this.gains.push(gain);
            oscillator.connect(gain);
            gain.connect(this.master);
            oscillator.start(now + 0.02);
        }
    }
    play(note, volume = 1) {
        const now = this.context.currentTime;
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
        console.log(
            note,
            Math.round(10*vlo/this.oscillatorVolume)/10,
            Math.round(10*vhi/this.oscillatorVolume)/10
        );
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
        if (this.context.state == "suspended") {
            this.context.resume();
        }
    }
    get playing() {
        return this.master.gain.value > 0.01;
    }
};
