const WIDTH = 512;

function hsb(h, s, b) {
    while (h < 0) h++;
    h %= 1;
    h = constrain(360*h, 0, 360);
    s = constrain(100*s, 0, 100);
    b = constrain(100*b, 0, 100);
    h = Math.round(h);
    s = Math.round(s);
    b = Math.round(b);
    const result = color(`hsb(${h}, ${s}%, ${b}%)`);
    return result;
}

class Clock {
    constructor() {
        this.time = 0;
    }
    get timeOfDay() {
        return (this.time/1000)%24;
    }
    draw() {
        this.time += deltaTime;
    }
}

class Sky {
    constructor() {
        this.dayColor = hsb(7/12, 1, 5/6);
        this.twilightColor = hsb(1/18, 1, 1/2);
        this.nightColor = hsb(17/24, 1, 1/6);
    }
    get topColor() {
        const nightness = norm(Math.abs(12 - clock.timeOfDay), 0, 12);
        return lerpColor(this.dayColor, this.nightColor, nightness);
    }
    get bottomColor() {
        const nightness = norm(Math.abs(12 - clock.timeOfDay), 0, 12);
        const twilightness = norm(Math.abs(0.5 - nightness), 0.5, 0);
        return lerpColor(this.topColor, this.twilightColor, twilightness);
    }
    draw() {
        const topColor = this.topColor;
        const bottomColor = this.bottomColor;
        background(topColor);
        strokeWeight(4);
        for (let i = 0; i < WIDTH/4; i++) {
            const w = norm(i, 0, WIDTH/4);
            stroke(lerpColor(topColor, bottomColor, w*w));
            const y = lerp(0, WIDTH, w) + 2;
            line(0, y, WIDTH, y);
        }
    }
}

let clock, sky;

globalThis.setup = function () {
    createCanvas(WIDTH, WIDTH, document.querySelector("#p5js-canvas"));
    clock = new Clock();
    sky = new Sky();
}

globalThis.draw = function () {
    clock.draw();
    sky.draw();
}
