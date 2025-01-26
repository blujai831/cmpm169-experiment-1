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
    get totalHours() {
        return this.time/250;
    }
    get timeOfDay() {
        return this.totalHours%24;
    }
    get totalDays() {
        return this.totalHours/24;
    }
    get dayOfYear() {
        return this.totalDays%365.25;
    }
    get totalYears() {
        return this.totalDays/365.25;
    }
    get totalMonths() {
        return this.totalDays/30.4375;
    }
    get monthOfYear() {
        return this.totalMonths%12;
    }
    get season() {
        return ((this.totalMonths + 1)/3)%4;
    }
    seasonLerp(lerpFunc, wi, sp, su, fa) {
        const w = this.season;
        const wp = w%1;
        if (w < 1) {
            return lerpFunc(wi, sp, wp);
        } else if (w < 2) {
            return lerpFunc(sp, su, wp);
        } else if (w < 3) {
            return lerpFunc(su, fa, wp);
        } else {
            return lerpFunc(fa, wi, wp);
        }
    }
    get proximityToNight() {
        return norm(Math.abs(12 - clock.timeOfDay), 0, 12);
    }
    get proximityToTwilight() {
        return norm(Math.abs(0.5 - this.proximityToNight), 0.5, 0);
    }
    draw() {
        this.time += deltaTime;
    }
}

class Sky {
    constructor() {
        this.dayColorWinter = hsb(7/12, 1/4, 3/4);
        this.twilightColorWinter = hsb(5/6, 1, 1/4);
        this.nightColorWinter = hsb(0, 0, 0);
        this.dayColorSpring = hsb(1/2, 1, 5/6);
        this.twilightColorSpring = hsb(1/6, 1, 2/3);
        this.nightColorSpring = hsb(17/24, 1, 1/6);
        this.dayColorSummer = hsb(7/12, 1, 3/4);
        this.twilightColorSummer = hsb(1/18, 1, 1/2);
        this.nightColorSummer = hsb(2/3, 1, 1/3);
        this.dayColorFall = hsb(1/2, 1/6, 5/6);
        this.twilightColorFall = hsb(1/12, 1, 2/3);
        this.nightColorFall = hsb(7/12, 1, 1/8);
    }
    get dayColor() {
        return clock.seasonLerp(
            lerpColor,
            this.dayColorWinter,
            this.dayColorSpring,
            this.dayColorSummer,
            this.dayColorFall
        );
    }
    get twilightColor() {
        return clock.seasonLerp(
            lerpColor,
            this.twilightColorWinter,
            this.twilightColorSpring,
            this.twilightColorSummer,
            this.twilightColorFall
        );
    }
    get nightColor() {
        return clock.seasonLerp(
            lerpColor,
            this.nightColorWinter,
            this.nightColorSpring,
            this.nightColorSummer,
            this.nightColorFall
        );
    }
    get topColor() {
        return lerpColor(
            this.dayColor, this.nightColor,
            clock.proximityToNight
        );
    }
    get bottomColor() {
        return lerpColor(
            this.topColor, this.twilightColor,
            clock.proximityToTwilight
        );
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
