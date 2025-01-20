export const AudioManager = new class {
    constructor() {
        this.ready = false;
        this.samples = {};
    }
    playSample(name) {
        if (!this.ready) return;
        this.samples[name].start();
    }
};

document.querySelector("#p5js-canvas").addEventListener("click", async () => {
    await Tone.start();
    for (const name of ["click", "win", "gameover", "taunt", "shoot"]) {
        AudioManager.samples[name] =
            new Tone.Player(`./snd/${name}.ogg`).toDestination();
    }
    await Tone.loaded();
    AudioManager.ready = true;
});
