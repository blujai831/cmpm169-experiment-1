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

function filterInPlace(array, predicate) {
    for (let i = array.length - 1; i >= 0; i--) {
        if (!predicate(array[i])) {
            array.splice(i, 1);
        }
    }
}

class Clock {
    constructor() {
        this.time = 0;
        this.monthLengths = [
            [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
            [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        ];
        this.monthNames = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];
    }
    get totalHours() {
        return this.time/125;
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
        return ((this.totalMonths + 1/2)/3)%4;
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
    get date() {
        let day = this.totalDays%(365.25*4);
        let yearType = 0;
        if (day >= 365*3) {
            day -= 365*3;
            yearType = 1;
        } else {
            day %= 365;
        }
        const monthLengths = this.monthLengths[yearType];
        let month;
        for (let i = 0; i < 12; i++) {
            if (day < monthLengths[i]) {
                month = i;
                break;
            } else {
                day -= monthLengths[i];
            }
        }
        day++;
        return `${this.monthNames[month]} ${Math.floor(day)}`;
    }
    draw() {
        this.time += deltaTime;
        stroke("black");
        strokeWeight(2);
        const tc = sky.topColor;
        fill(color(
            255 - red(tc),
            255 - green(tc),
            255 - blue(tc)
        ));
        textFont("monospace", 18);
        text(this.date, 12, 20);
        noFill();
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
        this.overcastColor = hsb(0, 0, 3/4);
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
        return lerpColor(lerpColor(
            this.dayColor, this.nightColor,
            clock.proximityToNight
        ), this.overcastColor, 1 - Math.pow(9/10, clouds.clouds.length));
    }
    get bottomColor() {
        return lerpColor(
            this.topColor, this.twilightColor,
            clock.proximityToTwilight
        );
    }
    illuminate(color) {
        return lerpColor(color, this.topColor, 0.125);
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

class Tree {
    constructor() {
        this.woodColorWinterA = hsb(1/18, 1/4, 3/4);
        this.woodColorWinterB = hsb(1/2, 1/8, 3/4);
        this.woodColorSpringA = hsb(1/18, 1/2, 1/3);
        this.woodColorSpringB = hsb(1/9, 1/2, 1/3);
        this.woodColorSummerA = hsb(1/18, 1, 1/2);
        this.woodColorSummerB = hsb(17/18, 1, 1/2);
        this.woodColorFallA = hsb(1/18, 1/2, 2/3);
        this.woodColorFallB = hsb(1/9, 1/2, 2/3);
        this.leafColorWinterA = hsb(0, 0, 2/3);
        this.leafColorWinterA.setAlpha(0);
        this.leafColorWinterB = hsb(2/3, 1/2, 3/4);
        this.leafColorWinterB.setAlpha(0);
        this.leafColorSpringA = hsb(5/12, 1, 1/3);
        this.leafColorSpringB = hsb(1/3, 1, 1/3);
        this.leafColorSummerA = hsb(1/3, 1, 1/2);
        this.leafColorSummerB = hsb(1/4, 1, 1/3);
        this.leafColorFallA = hsb(1/12, 1, 1/2);
        this.leafColorFallB = hsb(1/8, 1, 1/2);
        this.flowerColorA = hsb(11/12, 1, 3/4);
        this.flowerColorB = hsb(3/4, 1, 3/4);
        this.fruitColorA = hsb(5/6, 1, 1/2);
        this.fruitColorB = hsb(1/12, 1, 1/2);
        this.trunk = new Tree.Branch({
            x: WIDTH/2, y: WIDTH,
            theta: -Math.PI/2,
            width: 32
        });
        this.lengthLimit = 32;
        this.partLimit = 500;
        this.partCount = 0;
    }
    get woodColorA() {
        return clock.seasonLerp(
            lerpColor,
            this.woodColorWinterA,
            this.woodColorSpringA,
            this.woodColorSummerA,
            this.woodColorFallA
        );
    }
    get woodColorB() {
        return clock.seasonLerp(
            lerpColor,
            this.woodColorWinterB,
            this.woodColorSpringB,
            this.woodColorSummerB,
            this.woodColorFallB
        );
    }
    get leafColorA() {
        return clock.seasonLerp(
            lerpColor,
            this.leafColorWinterA,
            this.leafColorSpringA,
            this.leafColorSummerA,
            this.leafColorFallA
        );
    }
    get leafColorB() {
        return clock.seasonLerp(
            lerpColor,
            this.leafColorWinterB,
            this.leafColorSpringB,
            this.leafColorSummerB,
            this.leafColorFallB
        );
    }
    draw() {
        this.trunk.draw();
    }
}

Tree.Branch = class {
    constrainAngleUpward(theta) {
        while (theta > 0) theta -= 2*Math.PI;
        while (theta < -Math.PI) theta += 2*Math.PI;
        if (theta > 0) {
            if (theta > Math.PI - theta) {
                theta = -Math.PI;
            } else {
                theta = 0;
            }
        }
        return theta;
    }
    constructor(options) {
        this.length = [{
            x: options.x, y: options.y,
            theta: this.constrainAngleUpward(options.theta)
        }];
        this.width = options.width;
        this.alive = true;
        this.branches = [];
        this.growthRate = options.growthRate || 1/3;
        this.turnRadius = options.turnRadius || 12;
        this.branchArc = options.branchArc || Math.PI/2;
        this.parent = options.parent || null;
        this.colorVariation = Math.random();
    }
    get head() {
        return this.length[this.length.length - 1];
    }
    get branchProbability() {
        return clock.seasonLerp(lerp, 0, 0.02, 0.03, 0.01);
    }
    get deathProbability() {
        const base = clock.seasonLerp(lerp, 0.027, 0, 0.009, 0.018);
        if (weather.active) {
            return base*clock.seasonLerp(lerp, 6, 1/6, 1/6, 1/6);
        } else {
            return base;
        }
    }
    get leafProbability() {
        return clock.seasonLerp(lerp, 0, 0.03, 0.02, 0.01);
    }
    get flowerProbability() {
        return clock.seasonLerp(lerp, 0, 0.0015, 0.001, 0.0005);
    }
    grow() {
        this.length.push({
            x: this.head.x +
                Math.cos(this.head.theta)*this.growthRate*deltaTime,
            y: this.head.y +
                Math.sin(this.head.theta)*this.growthRate*deltaTime,
            theta: constrain(
                this.head.theta + (2*Math.random() - 1)/this.turnRadius,
                -Math.PI, 0
            )
        });
    }
    die() {
        this.alive = false;
    }
    shrink() {
        if (this.length.length > 0) {
            this.length.pop();
        }
    }
    get gone() {
        return !this.alive && this.length.length <= 0;
    }
    branch() {
        const shrinkFactor = 4/5;
        const numBranches = Math.round(lerp(2, 4, Math.random()));
        for (let n = numBranches; n > 0; n--) {
            if (tree.partCount < tree.partLimit) {
                this.branches.push(new Tree.Branch({
                    x: this.head.x, y: this.head.y,
                    theta: this.head.theta +
                        lerp(-1, 1, Math.random())*this.branchArc/2,
                    width: this.width*shrinkFactor,
                    growthRate: this.growthRate*shrinkFactor,
                    turnRadius: this.turnRadius*shrinkFactor,
                    branchArc: this.branchArc*shrinkFactor,
                    parent: this
                }));
                tree.partCount++;
            }
        }
    }
    sproutLeaf() {
        if (tree.partCount < tree.partLimit) {
            this.branches.push(new Tree.Leaf({
                x: this.head.x, y: this.head.y,
                theta: this.head.theta,
                width: 2*this.width,
                growthRate: 8*this.growthRate,
                parent: this
            }));
            tree.partCount++;
        }
    }
    flower() {
        if (tree.partCount < tree.partLimit) {
            this.branches.push(new Tree.Flower({
                x: this.head.x, y: this.head.y,
                theta: this.head.theta,
                width: this.width,
                growthRate: 8*this.growthRate,
                parent: this
            }));
            tree.partCount++;
        }
    }
    draw() {
        this.update();
        this.drawSelf();
        for (const branch of this.branches) {
            branch.draw();
        }
    }
    update() {
        const countBeforePrune = this.branches.length;
        filterInPlace(this.branches, branch => !branch.gone);
        tree.partCount -= countBeforePrune - this.branches.length;
        if (this.branches.length <= 0) {
            if (this.alive) {
                if (Math.random() <= this.deathProbability && this.parent) {
                    this.die();
                } else if (
                    this.width >= 4 &&
                    Math.random() <= this.branchProbability
                ) {
                    this.branch();
                } else if (
                    this.width < 16 &&
                    Math.random() <= this.flowerProbability
                ) {
                    this.flower();
                } else if (
                    this.width < 16 &&
                    Math.random() <= this.leafProbability
                ) {
                    this.sproutLeaf();
                } else if (this.length.length < tree.lengthLimit) {
                    this.grow();
                } else if (this.parent) {
                    this.die();
                }
            } else {
                this.shrink();
            }
        } else if (this.branches.length < 4) {
            if (
                this.width >= 4 &&
                Math.random() <= this.branchProbability
            ) {
                this.branch();
            }
        }
    }
    get color() {
        return sky.illuminate(lerpColor(
            lerpColor(
                tree.woodColorA, tree.woodColorB,
                this.colorVariation
            ),
            color(0),
            0.25
        ));
    }
    drawSelf() {
        stroke(this.color);
        strokeWeight(this.width);
        let prev;
        for (const segment of this.length) {
            if (prev) {
                line(prev.x, prev.y, segment.x, segment.y);
            }
            prev = segment;
        }
    }
};

Tree.AbstractLeaf = class {
    constructor(options) {
        this.x = options.x;
        this.y = options.y;
        this.theta = options.theta;
        this.baseWidth = options.width;
        this.alive = true;
        this.size = 0;
        this.originalGrowthRate = options.growthRate;
        this.growthRate = options.growthRate;
        this.parent = options.parent;
        this.child = null;
        this.colorVariation = Math.random();
    }
    get width() {
        return this.baseWidth*this.size/(30*this.originalGrowthRate);
    }
    get nextStageProbability() {
        return clock.seasonLerp(lerp, 0, 0.003, 0.002, 0.001);
    }
    get deathProbability() {
        const base = clock.seasonLerp(lerp, 0.003, 0, 0.001, 0.002);
        if (weather.active) {
            return base*clock.seasonLerp(lerp, 6, 1/6, 1/6, 1/6);
        } else {
            return base;
        }
    }
    grow() {
        this.size += this.growthRate*deltaTime;
        this.growthRate /= 2;
    }
    die() {
        this.alive = false;
    }
    shrink() {
        this.size /= Math.sqrt(2);
    }
    get gone() {
        return !this.alive && this.size <= this.originalGrowthRate/2;
    }
    get color() {
        return sky.illuminate(lerpColor(
            lerpColor(this.colorA, this.colorB, this.colorVariation),
            color(0),
            0.25
        ));
    }
    draw() {
        this.update();
        this.drawSelf();
        if (this.child) this.child.draw();
    }
    update() {
        if (this.child && this.child.gone) this.child = null;
        if (!this.child) {
            if (this.alive) {
                if (Math.random() <= this.deathProbability) {
                    this.die();
                } else if (Math.random() <= this.nextStageProbability) {
                    this.sproutNextStage();
                } else {
                    this.grow();
                }
            } else {
                this.shrink();
            }
        }
    }
};

Tree.Leaf = class extends Tree.AbstractLeaf {
    constructor(options) {
        super(options);
    }
    get colorA() {
        return tree.leafColorA;
    }
    get colorB() {
        return tree.leafColorB;
    }
    sproutNextStage() {
        // doesn't have one
        this.grow();
    }
    drawSelf() {
        stroke(this.color);
        strokeWeight(this.width);
        line(
            this.x, this.y,
            this.x + this.size*Math.cos(this.theta),
            this.y + this.size*Math.sin(this.theta)
        );
    }
};

Tree.Flower = class extends Tree.AbstractLeaf {
    constructor(options) {
        super(options);
        this.petals = Math.round(lerp(4, 12, Math.random()));
    }
    get colorA() {
        return clock.seasonLerp(
            lerpColor,
            color(0, 0, 0, 0),
            tree.flowerColorA,
            tree.flowerColorB,
            color(0, 0, 0, 0)
        );
    }
    get colorB() {
        return clock.seasonLerp(
            lerpColor,
            color(0, 0, 0, 0),
            tree.flowerColorB,
            tree.flowerColorA,
            color(0, 0, 0, 0)
        );
    }
    sproutNextStage() {
        // todo
    }
    drawSelf() {
        stroke(this.color);
        strokeWeight(this.width);
        for (
            let theta = 0;
            theta < 2*Math.PI;
            theta += 2*Math.PI/this.petals
        ) {
            line(
                this.x, this.y,
                this.x + this.size*Math.cos(this.theta + theta)/2,
                this.y + this.size*Math.sin(this.theta + theta)/2
            );
        }
    }
};

class Stars {
    constructor() {
        this.stars = [];
        for (let n = 0; n < 100; n++) {
            this.stars.push({
                r: Math.random()*WIDTH*Math.sqrt(3/2),
                theta: 2*Math.PI*Math.random(),
                rSelf: lerp(1, 5/2, Math.random()),
                alpha: lerp(0.5, 1, Math.random()),
                speed: lerp(1/10000, 3/10000, Math.random())
            });
        }
    }
    draw() {
        noStroke();
        for (const star of this.stars) {
            fill(255, 255, 255,
                255*star.alpha*Math.pow(clock.proximityToNight, 3));
            circle(
                WIDTH/2 + star.r*Math.cos(star.theta),
                WIDTH + star.r*Math.sin(star.theta),
                2*star.rSelf
            );
            star.theta += star.speed*deltaTime;
        }
        noFill();
    }
}

class Sun {
    constructor() {
        this.r = WIDTH;
        this.rSelf = 32;
    }
    draw() {
        noStroke();
        fill("white");
        const theta = clock.timeOfDay*Math.PI/12 + Math.PI/2;
        circle(
            WIDTH/2 + this.r*Math.cos(theta),
            WIDTH + this.r*Math.sin(theta),
            2*this.rSelf
        );
        noFill();
    }
}

class Weather {
    constructor() {
        this.raindrops = [];
        this.snowflakes = [];
        this.active = false;
    }
    get startProbability() {
        return 1 - Math.pow(9994/10000, clouds.clouds.length + 1);
    }
    get endProbability() {
        return Math.pow(2/5, clouds.clouds.length + 1);
    }
    draw() {
        if (this.active && Math.random() <= this.endProbability) {
            this.active = false;
        } else if (!this.active && Math.random() <= this.startProbability) {
            this.active = true;
        }
        if (
            this.active &&
            this.raindrops.length + this.snowflakes.length < 100
        ) {
            const particle = {
                x: 2*Math.random()*WIDTH - WIDTH/2,
                y: -16,
                size: lerp(2, 8, Math.random()),
                alpha: lerp(1/3, 1, Math.random()),
                speed: lerp(1, 2, Math.random()),
                theta: Math.PI/2
            };
            if (Math.round(clock.season)%4 == 0) {
                this.snowflakes.push(particle);
            } else {
                this.raindrops.push(particle);
            }
        }
        for (const particle of this.raindrops) {
            stroke(0, 64, 128, 255*particle.alpha);
            strokeWeight(particle.size);
            line(particle.x, particle.y, particle.x + 4, particle.y + 8);
            particle.x += particle.speed*deltaTime/2;
            particle.y += particle.speed*deltaTime;
        }
        filterInPlace(this.raindrops, particle => particle.y < WIDTH);
        for (const particle of this.snowflakes) {
            stroke(192, 255, 255, 255);
            strokeWeight(2);
            circle(particle.x, particle.y, particle.size);
            particle.x +=
                Math.cos(particle.theta)*particle.speed*deltaTime/12;
            particle.y +=
                Math.sin(particle.theta)*particle.speed*deltaTime/12;
            particle.theta = constrain(
                particle.theta + lerp(-1/2, 1/2, Math.random()),
                0, Math.PI
            );
        }
        filterInPlace(this.snowflakes, particle => particle.y < WIDTH);
    }
}

class Clouds {
    constructor() {
        this.clouds = [];
    }
    get cloudProbability() {
        return clock.seasonLerp(lerp, 0.02, 0.005, 0.01, 0.05);
    }
    spawnCloud() {
        const cloudWidth = lerp(192, 384, Math.random());
        const cloud = {
            x: -2*cloudWidth,
            y: lerp(0, WIDTH/2, Math.random()),
            width: cloudWidth,
            plumes: [],
            speed: lerp(1/10, 3/10, Math.random())
        };
        for (let i = Math.round(lerp(4, 8, Math.random())); i > 0; i--) {
            cloud.plumes.push({
                x: lerp(-cloudWidth/2, cloudWidth/2, Math.random()),
                y: lerp(-cloudWidth/4, cloudWidth/4, Math.random()),
                width: lerp(cloudWidth/2, cloudWidth*3/4, Math.random())
            });
        }
        this.clouds.push(cloud);
    }
    draw() {
        if (
            Math.random() <= this.cloudProbability &&
            this.clouds.length < 50
        ) {
            this.spawnCloud();
        }
        noStroke();
        fill(192, 192, 192, 32);
        for (const cloud of this.clouds) {
            for (const plume of cloud.plumes) {
                ellipse(
                    cloud.x + plume.x, cloud.y + plume.y,
                    plume.width, plume.width/2
                );
            }
            cloud.x += cloud.speed*deltaTime;
        }
        noFill();
        filterInPlace(this.clouds, cloud => cloud.x < WIDTH + 2*cloud.width);
    }
}

let sky, stars, sun, tree, weather, clouds, clock;

globalThis.setup = function () {
    createCanvas(WIDTH, WIDTH, document.querySelector("#p5js-canvas"));
    sky = new Sky();
    stars = new Stars();
    sun = new Sun();
    tree = new Tree();
    weather = new Weather();
    clouds = new Clouds();
    clock = new Clock();
}

globalThis.draw = function () {
    sky.draw();
    stars.draw();
    sun.draw();
    tree.draw();
    weather.draw();
    clouds.draw();
    clock.draw();
}
