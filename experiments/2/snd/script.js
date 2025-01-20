export const AudioManager = new class {
    constructor() {
        this.ready = false;
        this.samples = {};
        this.bgmVoices = {};
        this.bgmLoops = {};
    }
    playSample(name) {
        try {
            if (!this.ready) return;
            this.samples[name].restart();
            this.samples[name].start();
        } catch (err) {
            console.error(err);
        }
    }
    bgmVoiceFadeIn(voice, time) {
        voice = this.bgmVoices[voice];
        voice.volume.rampTo(-15, time);
    }
    bgmVoiceSetLoop(voice, startTime, ...notes) {
        const name = voice;
        this.bgmVoiceStopLoop(name);
        voice = this.bgmVoices[voice];
        const funcs = [];
        let dt = 0;
        for (const note of notes) {
            let [pitch, duration] = note.split(" ");
            if (!duration) {
                duration = pitch;
                pitch = false;
            }
            if (pitch) {
                const thisDt = dt;
                funcs.push(time => {
                    voice.triggerAttackRelease(pitch, duration, time + thisDt);
                });
            }
            dt += new Tone.Time(duration).toSeconds();
        }
        this.bgmLoops[name] = new Tone.Loop(time => {
            for (let func of funcs) func(time);
        }, dt);
        this.bgmLoops[name].start(startTime);
    }
    bgmVoiceStopLoop(voice) {
        if (this.bgmLoops[voice]) {
            this.bgmLoops[voice].cancel();
            this.bgmLoops[voice].stop();
            this.bgmLoops[voice].dispose();
            delete this.bgmLoops[voice];
        }
    }
};

document.querySelector("#p5js-canvas").addEventListener("click", async () => {
    if (!AudioManager.ready) {
        await Tone.start();
        for (const name of ["click", "win", "gameover", "taunt", "shoot"]) {
            AudioManager.samples[name] =
                new Tone.Player(`./snd/${name}.ogg`).toDestination();
        }
        AudioManager.bgmVoices["membrane"] =
            new Tone.MembraneSynth({
                oscillator: {
                    type: "amtriangle2",
                    spread: 600,
                    harmonicity: 0.09
                },
                filterEnvelope: {attack: 0}
            }).toDestination();
        AudioManager.bgmVoices["square"] =
            new Tone.MonoSynth({
                oscillator: {type: "square"},
                filterEnvelope: {attack: 0}
            }).toDestination();
        AudioManager.bgmVoices["triangle"] =
            new Tone.MonoSynth({
                oscillator: {type: "triangle"},
                filterEnvelope: {attack: 0}
            }).toDestination();
        AudioManager.bgmVoices["sawtooth"] =
            new Tone.MonoSynth({
                oscillator: {type: "sawtooth"},
                filterEnvelope: {attack: 0}
            }).toDestination();
        for (let voice of Object.keys(AudioManager.bgmVoices)) {
            AudioManager.bgmVoices[voice].volume.value = -100;
        }
        AudioManager.bgmVoiceSetLoop("membrane", "8n",
            "A2 8n", "A2 8n", "A3 8n", "A2 8n",
            "A2 16t", "A2 16t", "A2 16t", "A2 16n", "A3 8n", "A3 8n", "A2 16n",
            "A2 8n", "A2 8n", "A3 8n",
            "A2 16n", "A2 8n",
            "A2 8n", "A2 16n", "A3 8n", "A2 16n", "A2 16n",
            "A2 8n", "A2 8n", "A3 8n", "A2 8n",
            "A2 16t", "A2 16t", "A2 16t", "A2 16n", "A3 8n", "A3 8n", "A2 16n",
            "A3 16n", "A2 8n", "A3 8n", "A2 16n",
            "A2 16n", "A2 8n", "A2 8n", "A2 16n",
            "A3 16n", "A2 16n", "A3 16t", "A3 16t", "A3 16t",
        );
        AudioManager.bgmVoiceSetLoop("square", "8n",
            "A1 8n", "A2 8n",
            "A1 8n", "A2 8n",
            "A1 8n", "A2 8n",
            "A1 8n", "A2 8n",
            "A1 8n", "A2 8n",
            "A1 8n", "A2 8n",
            "G#1 8n", "G#2 8n",
            "G1 8n", "G2 8n",
            "F#1 8n", "F#2 8n",
            "F#1 8n", "F#2 8n",
            "F#1 8n", "F#2 8n",
            "F#1 8n", "F#2 8n",
            "G1 8n", "G2 8n",
            "G1 8n", "G2 8n",
            "G#1 8n", "G#2 8n",
            "G#1 8n", "G#2 8n",
        );
        AudioManager.bgmVoiceSetLoop("sawtooth", "8n",
            "G3 16n", "A3 16n", "A3 16n", "16n",
            "A3 16n", "16n", "G3 16n", "A3 16n",
            "4n", "16n", "E3 16n", "D#3 16n", "E3 16n",
            "G3 16n", "A3 16n", "A3 16n", "16n",
            "A3 16n", "16n", "G3 16n", "E4 16n",
            "D#4 16t", "E4 16t", "D#4 16t",
            "E4 16t", "D#4 16t", "E4 16t",
            "D#4 16n", "D4 16n", "C4 16n", "E3 16n",
            "F3 16n", "F#3 16n", "F#3 16n", "E3 16n",
            "F3 16n", "F#3 16n", "A3 16n", "D3 16n",
            "4n", "16n", "D3 16n", "C#3 16n", "D3 16n",
            "F3 16n", "F#3 16n", "F#3 16n", "E3 16n",
            "F3 16n", "F#3 16n", "A3 16n", "D3 16n",
            "D4 16t", "C#4 16t", "D4 16t",
            "A3 16t", "G#3 16t", "A3 16t",
            "F3 16n", "F#3 16n", "C#3 16n", "D3 16n",
        );
        Tone.getTransport().bpm.value = 120;
        Tone.getTransport().start();
        //AudioManager.bgmVoiceFadeIn("membrane", "2n");
        //AudioManager.bgmVoiceFadeIn("sawtooth", "2n");
        //AudioManager.bgmVoiceFadeIn("square", "2n");
        await Tone.loaded();
        AudioManager.ready = true;
    }
});
