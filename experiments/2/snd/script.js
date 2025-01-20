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
        for (let iter = 0; iter < 2; iter++) {
            for (const note of notes) {
                let [pitch, duration] = note.split(" ");
                if (!duration) {
                    duration = pitch;
                    pitch = false;
                }
                if (pitch) {
                    const thisDt = dt;
                    funcs.push(time => {
                        voice.triggerAttackRelease(
                            pitch, duration, time + thisDt
                        );
                    });
                }
                dt += new Tone.Time(duration).toSeconds();
            }
        }
        this.bgmLoops[name] = new Tone.Loop(async time => {
            for (let func of funcs) {
                func(time);
                await new Promise(resolve => setTimeout(resolve, 1));
            }
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
        Tone.setContext(new Tone.Context({latencyHint: "interactive"}));
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
        Tone.getTransport().bpm.value = 120;
        Tone.getTransport().setLoopPoints(0, "16m");
        Tone.getTransport().loop = true;
        AudioManager.bgmVoiceSetLoop("membrane", 0,
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
        AudioManager.bgmVoiceSetLoop("square", 0,
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
            //
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
            //
            "A1 8n", "A2 8n",
            "A1 8n", "A2 8n",
            "G#1 8n", "G#2 8n",
            "G#1 8n", "G#2 8n",
            "G1 8n", "G2 8n",
            "G1 8n", "G2 8n",
            "F#1 8n", "F#2 8n",
            "F#1 8n", "F#2 8n",
            "F1 8n", "F2 8n",
            "F1 8n", "F2 8n",
            "F1 8n", "F2 8n",
            "F1 8n", "F2 8n",
            "D1 8n", "D2 8n",
            "D1 8n", "D2 8n",
            "E1 8n", "E2 8n",
            "E1 8n", "E2 8n",
            //
            "A1 8n", "A2 8n",
            "A1 8n", "A2 8n",
            "G1 8n", "G2 8n",
            "G1 8n", "G2 8n",
            "F1 8n", "F2 8n",
            "F1 8n", "F2 8n",
            "G1 8n", "G2 8n",
            "E1 8n", "E2 8n",
            "D1 8n", "D2 8n",
            "D1 8n", "D2 8n",
            "D1 8n", "D2 8n",
            "D1 8n", "D2 8n",
            "E1 8n", "E2 8n",
            "E1 8n", "E2 8n",
            "D#1 8n", "D#2 8n",
            "C1 8n", "A#1 8n",
        );
        AudioManager.bgmVoiceSetLoop("sawtooth", 0,
            "G3 16n", "A3 16n", "A3 16n", "16n",
            "A3 16n", "16n", "G3 16n", "A3 16n",
            "4n", "16n",
            "E3 16n", "D#3 16n", "E3 16n",
            //
            "G3 16n", "A3 16n", "A3 16n", "16n",
            "A3 16n", "16n", "G3 16n", "E4 16n",
            "D#4 16t", "E4 16t", "D#4 16t", "E4 16t", "D#4 16t", "E4 16t",
            "D#4 16n", "D4 16n", "C4 16n", "E3 16n",
            //
            "F3 16n", "F#3 16n", "F#3 16n", "E3 16n",
            "F3 16n", "F#3 16n", "A3 16n", "D3 16n",
            "4n",
            "16n", "D3 16n", "C#3 16n", "D3 16n",
            //
            "F3 16n", "F#3 16n", "F#3 16n", "E3 16n",
            "F3 16n", "F#3 16n", "A3 16n", "D3 16n",
            "D4 16t", "C#4 16t", "D4 16t", "A3 16t", "G#3 16t", "A3 16t",
            "F3 16n", "F#3 16n", "C#3 16n", "D3 16n",
            //
            // === === === === === === === ===
            //
            "G3 16n", "A3 16n", "A3 16n", "16n",
            "A3 16n", "16n", "G3 16n", "A3 16n",
            "4n",
            "16n", "E3 16n", "D#3 16n", "E3 16n",
            //
            "G3 16n", "A3 16n", "16n", "E3 16n",
            "G3 16n", "E3 16n", "A3 16n", "G4 16n",
            "F#4 16t", "G4 16t", "F#4 16t", "E4 16t", "F#4 16t", "E4 16t",
            "D4 16t", "E4 16t", "D4 16t", "C4 16n", "C#4 16n",
            //
            "D4 16n", "E4 16n", "D4 16n", "A3 16n",
            "D3 16n", "8n.",
            "16n", "G#3 16n", "A3 16n", "D4 16n",
            "16n", "E4 16n", "D4 16n", "A3 16n",
            //
            "G3 16n", "A3 16n", "16n", "E3 16n",
            "G3 16n", "E3 16n", "G3 16n", "A3 16n",
            "D3 16n", "8n", "D#3 16n",
            "16n", "E3 16n", "16n", "F#3 16n",
            //
            // === === === === === === === ===
            //
            "G3 16n", "A3 16n", "16n", "E3 16n",
            "G3 16n", "A3 16n", "G3 16n", "E3 16n",
            "D3 16n", "E3 16n", "16n", "D3 16n",
            "D#3 16n", "E3 16n", "D#3 16n", "E3 16n",
            //
            "D3 16n", "16n", "C#3 16n", "D3 16n",
            "16n", "C3 16n", "C#3 16n", "D3 16n",
            "4n.",
            "D3 16n", "16n",
            //
            "G3 16n", "A3 16n", "A3 16n", "16n",
            "A3 16n", "16n", "G3 16n", "A3 16n",
            "4n",
            "16n", "D3 16n", "D#3 16n", "E3 16n",
            //
            "G3 16n", "A3 16n", "A3 16n", "16n",
            "A3 16n", "16n", "G3 16n", "A3 16n",
            "8n", "G#3 16n", "A3 16n",
            "D3 16n", "C#3 16n", "D#3 16n", "E3 16n",
            //
            // === === === === === === === ===
            //
            "G3 16n", "A3 16n", "16n", "E3 16n",
            "G3 16n", "A3 16n", "G3 16n", "E3 16n",
            "F3 16n", "G3 16n", "F3 16n", "G3 16n",
            "8n", "E3 16n", "16n",
            //
            "D3 16n", "8n.",
            "16n", "C#3 16n", "D3 16n", "E3 16n",
            "G3 16n", "A3 16n", "A3 16n", "16n",
            "A3 16n", "16n", "G3 16n", "A3 16n",
            //
            "8n", "G3 16n", "A3 16n",
            "E3 16n", "16n", "G3 16n", "A3 16n",
            "D3 16n", "8n.",
            "8n", "D#3 16n", "16n",
            //
            "E3 16n", "8n", "D#3 16n",
            "8n", "D3 16n", "16n",
            "16n", "C3 16n", "8n",
            "A#2 16n", "16n", "C3 16n", "16n",
        );
        AudioManager.bgmVoiceSetLoop("triangle", 0,
            "E4 16n", "8n", "G4 16n",
            "8n", "A4 16n", "16n",
            "16n", "E4 16n", "8n",
            "G4 16n", "16n", "A4 16t", "G#4 16t", "A4 16t",
            //
            "C5 16n", "16n", "D5 16n", "A4 16n",
            "2n",
            "8n", "G4 16n", "A4 16n",
            //
            "C5 16n", "16n", "D5 16n", "A4 16n",
            "16n", "G4 16n", "A4 16n", "C5 16n",
            "D5 16n", "8n", "E5 16n",
            "8n", "G5 16t", "G#5 16t", "A5 16t",
            //
            "C6 16n", "B5 16n", "C6 16n", "16n",
            "2n",
            "8n", "G4 16n", "A4 16n",
            //
            // === === === === === === === ===
            //
            "C5 16n", "8n.",
            "16n", "A4 16n", "G4 16t", "G#4 16t", "A4 16t",
            "D5 16n", "8n.",
            "16n", "A4 16n", "G4 16t", "G#4 16t", "A4 16t",
            //
            "E5 16n", "G5 16t", "G#5 16t", "A5 16t",
            "C#5 32t", "D5 16t", "C5 16n", "D5 16n", "16n",
            "8n.", "C5 16t", "C#5 16t", "D5 16t",
            "E5 16n", "D#5 16n", "E5 16n", "D5 16n",
            //
            "C5 16n", "C#5 16n", "D5 16n", "A4 16n",
            "8n", "G4 16t", "G#4 16t", "A4 16t",
            "C5 16n", "C#5 16n", "D5 16n", "A4 16n",
            "16n", "G4 16t", "G#4 16t", "A4 16t", "D5 16n",
            //
            "D#5 32t", "E5 16t", "D#5 16n", "E5 16n", "D5 16n",
            "C#5 16n", "D5 16n", "C5 16n", "B4 16n",
            "C5 16n", "16n", "D5 16n", "A4 16n",
            "8n", "G4 16n", "16n",
            //
            // === === === === === === === ===
            //
            "A4 16n", "16n", "G4 16t", "G#4 16t", "A4 16t",
            "C5 16n", "16n", "A#4 16t", "B4 16t", "C5 16t",
            "D#5 32t", "E5 16t", "D#5 16n", "E5 16n", "D5 16n",
            "C5 16n", "D#5 16t", "E5 16t", "A5 16t", "A#5 32n", "B5 32n",
            //
            "C6 8n", "A#5 32t", "B5 16t", "16n",
            "G#5 32t", "A5 16t", "16n", "G5 16n", "16n",
            "E5 16n", "16n", "G5 8t", "C5 32t", "C#5 32t",
            "D5 8t", "C5 8t", "B4 16t", "G4 32t", "G#4 32t",
            //
            "A4 16n", "G4 16n", "A4 16n", "B4 32n", "C5 16n.",
            "G#4 16n", "A4 16n", "D5 8n",
            "G#4 16n", "A4 16n", "D5 16n",
            "16n", "D#5 8n.",
            //
            "D5 32t", "E5 16t", "D#5 16n", "D5 16t", "32t", "C5 16t", "32t",
            "G4 16n", "A4 16t", "32t", "D#5 32t", "E5 16t", "D#5 16n",
            "D5 16t", "32t", "C5 16t", "32t", "G4 16n", "A4 16t", "32t",
            "C5 16n", "16n", "D5 8n",
            //
            // === === === === === === === ===
            //
            "A4 16n", "G4 16n", "A4 16n", "B4 32n", "C5 16n.", // 5
            "A#4 16t", "B4 16t", "C5 16t", "C#5 32n", "D5 16n.", // + 4
            "C5 16t", "C#5 16t", "D5 16t", "E5 16n", // + 3
            "F#5 32t", "G5 16t", "G#5 16t", "A5 16t", "C6 16t", // + 3
            "D6 32t", "D#6 32t", "E6 32t", // + 1 = 16
            //
            "D6 32t", "D#6 32t", "E6 8t", "D6 16t", "D#6 16t", "E6 16t", // 4
            "C6 32t", "C#6 16t", "32t", "D6 16t", "G#5 16n", "A5 16n", // 4
            "D#5 32t", "E5 16t", "F#5 32t", "G5 16t", "A5 16n", // 3
            "D#5 32t", "D5 8t", "B4 32t", "C5 8n", "B4 16n", // 5
            //
            "A4 8n.", "C5 8n", "B4 32n", "C5 32n", "D5 8n.", // 9
            "D#5 8n.", "E5 16n", "16n", "G5 16t", "F#5 16t", "G5 16t", // 7
            //
            "D6 32t", "D#6 16t", "E6 16t", "32t",
            "E6 16t", "32t", "E6 16t", "32t",
            "D#6 16n", "E6 16t", "32t", "E6 16t", "32t", "E6 16t", "32t",
            "D#6 16n", "E6 16t", "32t", "E6 16t", "32t", "E6 16t", "32t",
            "D6 16t", "D#6 16t", "E6 16t", "G6 16t", "G#6 16t", "A6 16t",
        );
        await Tone.loaded();
        Tone.getTransport().start("+1")
        AudioManager.ready = true;
        //AudioManager.bgmVoiceFadeIn("membrane", "2m");
        //AudioManager.bgmVoiceFadeIn("sawtooth", "2m");
        //AudioManager.bgmVoiceFadeIn("square", "2m");
        //AudioManager.bgmVoiceFadeIn("triangle", "2m");
    }
});
