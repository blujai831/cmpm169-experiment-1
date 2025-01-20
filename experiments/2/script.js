import { AudioManager } from "./snd/script.js";

const WIDTH = 512;

function removeItemsFromArray(array, predicate) {
    const removed = [];
    for (let i = array.length - 1; i >= 0; i--) {
        const item = array[i];
        if (predicate(item)) {
            for (let j = i; j < array.length - 1; j++) {
                array[j] = array[j + 1];
            }
            array.length--;
            removed.push(item);
        }
    }
    return removed;
}

class Scene {
    static current = null;
    static next = null;
    constructor(...layerOrder) {
        this.layerOrder = layerOrder;
        this.layers = {};
        this.actorsToDrop = [];
        for (let layer of this.layerOrder) {
            this.layers[layer] = [];
        }
    }
    spawn(where, what, ...args) {
        console.assert(what.prototype instanceof Actor);
        let actor = new what(...args);
        this.layers[where].push(actor);
        actor.scene = this;
        actor.layer = where;
        return actor;
    }
    despawn(what) {
        this.actorsToDrop.push(what);
    }
    findAll(...args) {
        let layers, predicate;
        if (args.length > 1) {
            let layer;
            ([layer, predicate] = args);
            layers = [layer];
        } else {
            layers = this.layerOrder;
            ([predicate] = args);
        }
        if (predicate.prototype instanceof Actor) {
            let klass = predicate;
            predicate = actor => actor instanceof klass;
        }
        let actors = [];
        for (let layer of layers) {
            for (let actor of this.layers[layer]) {
                if (predicate(actor)) {
                    actors.push(actor);
                }
            }
        }
        return actors;
    }
    find(...args) {
        return this.findAll(...args)[0];
    }
    count(...args) {
        return this.findAll(...args).length;
    }
    update() {
        for (let layer of this.layerOrder) {
            for (let actor of this.layers[layer]) {
                actor.update();
            }
            removeItemsFromArray(this.layers[layer], actor =>
                this.actorsToDrop.includes(actor));
        }
        this.actorsToDrop.length = 0;
        if (Scene.next) {
            Scene.current = new Scene.next[0](...Scene.next.slice(1));
            Scene.next = null;
        }
    }
    draw() {
        for (let layer of this.layerOrder) {
            for (let actor of this.layers[layer]) {
                actor.draw();
            }
        }
    }
    doClick() {
        for (let layer of this.layerOrder) {
            for (let actor of this.layers[layer]) {
                if (actor.canBeClicked()) {
                    actor.doClick();
                }
            }
        }
    }
    static change(what, ...args) {
        console.assert(what == Scene || what.prototype instanceof Scene);
        if (Scene.next) {
            return;
        } else if (Scene.current) {
            Scene.next = [what, ...args];
        } else {
            Scene.current = new what(...args);
        }
    }
}

class Actor {
    constructor(...args) {
        this.reset(...args);
    }
    despawn() {
        this.scene.despawn(this);
    }
    reset(...args) {}
    canBeClicked() {}
    doClick() {}
    draw() {}
    update() {}
}

class Bullet extends Actor {
    reset(x, y, size, speed) {
        this.x = x;
        this.y = y;
        this.size = size;
        const mDist = dist(x, y, mouseX, mouseY);
        this.xSpeed = speed*(mouseX - x)/mDist;
        this.ySpeed = speed*(mouseY - y)/mDist;
        this.angle = Math.atan2(this.ySpeed, this.xSpeed);
    }
    draw() {
        strokeWeight(2);
        stroke(color("#800000"));
        fill(color("#ff0000"));
        push();
        translate(this.x, this.y);
        rotate(this.angle);
        beginShape();
        vertex(this.size, 0);
        vertex(0, this.size);
        vertex(0, this.size/2);
        vertex(-this.size, this.size/2);
        vertex(-this.size, -this.size/2);
        vertex(0, -this.size/2);
        vertex(0, -this.size);
        endShape();
        pop();
    }
    outOfBounds() {
        return this.x < -this.size || this.x > WIDTH + this.size ||
            this.y < -this.size || this.y > WIDTH + this.size;
    }
    isHovered() {
        return dist(this.x, this.y, mouseX, mouseY) < this.size;
    }
    update() {
        this.x += this.xSpeed*deltaTime/(1000/60);
        this.y += this.ySpeed*deltaTime/(1000/60);
        if (this.outOfBounds()) {
            this.despawn();
        } else if (this.isHovered()) {
            gameOver();
        }
    }
}

class RunawayButton extends Actor {
    reset() {
        this.x = WIDTH/2;
        this.y = WIDTH/2;
        this.width = WIDTH/2;
        this.height = WIDTH/8;
        this.fontSize = 24;
        this.targetX = this.x;
        this.targetY = this.y;
        this.clickTimeout = 0;
        this.timesClicked = 0;
        this.avoidMargin = 0.75;
        this.avoidAggression = 0.03;
        this.followAggression = 0.5;
        this.clickDuration = 1;
        this.wasHeld = false;
        this.timeToDisappear = 3;
        this.timeInvincible = 1;
        this.maxAvoidTries = 100;
        this.minBulletTimeout = 0.5;
        this.maxBulletTimeout = 2.5;
        this.minShootMargin = 2.3;
        this.timeToNextBullet = this.maxBulletTimeout;
        this.mouseWasPressed = mouseIsPressed;
    }
    isHovered() {
        return mouseX > this.x - this.width/2 &&
            mouseX < this.x + this.width/2 &&
            mouseY > this.y - this.height/2 &&
            mouseY < this.y + this.height/2;
    }
    isHeld() {
        return (
            (this.isHovered() && !this.mouseWasPressed) ||
            this.wasHeld
        ) && mouseIsPressed;
    }
    isClicked() {
        return this.clickTimeout > 0;
    }
    canBeClicked() {
        return this.wasHeld &&
            !this.isClicked() &&
            !this.isTired() &&
            !this.isInvincible();
    }
    isInvincible() {
        return this.timeInvincible > 0;
    }
    isTired() {
        return this.timesClicked >= 5;
    }
    doClick() {
        AudioManager.playSample("click");
        this.clickTimeout = this.clickDuration;
        this.timesClicked++;
        if (this.isTired()) {
            AudioManager.playSample("win");
            this.fork();
        }
        Scene.current.find(MilestoneTracker).score++;
    }
    draw() {
        let fg, bg, msg;
        if (this.isTired()) {
            fg = color("#aa7777");
            bg = color("#552222");
            msg = "Ok, you win, sheesh!";
        } else if (this.isClicked()) {
            fg = color("#552222");
            bg = color("#aa7777");
            msg = "That all you got??";
        } else if (this.isHeld()) {
            fg = color("#aaaaaa");
            bg = color("#555555");
            msg = "En garde!";
        } else if (this.isHovered()) {
            fg = color("#777777");
            bg = color("#cccccc");
            msg = "Uh-oh!";
        } else {
            fg = color("#555555");
            bg = color("#aaaaaa");
            msg = "Click Here";
        }
        strokeWeight(2);
        stroke(fg);
        fill(bg);
        rect(this.x - this.width/2, this.y - this.height/2,
            this.width, this.height, this.height/4);
        fill(fg);
        noStroke();
        textFont("sans-serif", this.fontSize);
        textAlign(CENTER, CENTER);
        text(msg, this.x, this.y);
    }
    avoid() {
        let tries = this.maxAvoidTries;
        let best = dist(this.targetX, this.targetY, mouseX, mouseY);
        let bestX = this.targetX;
        let bestY = this.targetY;
        while (tries > 0 && best <= this.width*this.avoidMargin) {
            let candidateX =
                lerp(this.width/2, WIDTH - this.width/2, Math.random());
            let candidateY =
                lerp(this.height/2, WIDTH - this.height/2, Math.random());
            let candidate = dist(candidateX, candidateY, mouseX, mouseY);
            if (candidate > best) {
                best = candidate;
                bestX = candidateX;
                bestY = candidateY;
            }
            tries--;
        }
        this.targetX = bestX;
        this.targetY = bestY;
        this.aggression = this.avoidAggression;
    }
    follow() {
        this.targetX = mouseX;
        this.targetY = mouseY;
        this.aggression = this.followAggression;
    }
    move(aggression) {
        this.x = lerp(this.x, this.targetX, aggression);
        this.y = lerp(this.y, this.targetY, aggression);
    }
    updateTimers() {
        if (this.isClicked()) {
            this.clickTimeout -= deltaTime/1000;
        }
        if (this.isInvincible()) {
            this.timeInvincible -= deltaTime/1000;
        }
        if (this.isTired()) {
            this.timeToDisappear -= deltaTime/1000;
            if (this.timeToDisappear <= 0) {
                this.despawn();
            }
        }
        if (this.couldShoot() && !this.canShoot()) {
            this.timeToNextBullet -= deltaTime/1000;
        }
    }
    couldShoot() {
        return this.width <= WIDTH/3 &&
            dist(this.x, this.y, mouseX, mouseY) >=
            this.minShootMargin*this.width;
    }
    canShoot() {
        return this.couldShoot() && this.timeToNextBullet <= 0;
    }
    shoot() {
        AudioManager.playSample("shoot");
        Scene.current.spawn(
            "foreground",
            Bullet,
            this.x, this.y,
            lerp(8, 16, Math.random()),
            lerp(4, 8, Math.random())
        );
        this.timeToNextBullet =
            lerp(this.minBulletTimeout, this.maxBulletTimeout, Math.random());
    }
    update() {
        this.updateTimers();
        if (this.canShoot()) {
            this.shoot();
        }
        let aggression = this.avoidAggression;
        if (this.isHeld()) {
            this.wasHeld = true;
            aggression = this.followAggression;
            this.follow();
        } else {
            this.wasHeld = false;
            if (!this.isTired()) {
                this.avoid();
            }
        }
        this.mouseWasPressed = mouseIsPressed;
        this.move(aggression);
    }
    teleport(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }
    fork() {
        const sqrt2 = Math.sqrt(2);
        for (let i = 0; i < 2; i++) {
            let child = Scene.current.spawn("foreground", RunawayButton);
            child.teleport(this.x, this.y);
            child.width = this.width/sqrt2;
            child.height = this.height/sqrt2;
            child.fontSize = this.fontSize/sqrt2;
            child.avoidAggression = this.avoidAggression*sqrt2;
        }
    }
};

class Scoreboard extends Actor {
    reset(score) {
        this.score = score;
    }
    draw() {
        fill(color("#ff0000"));
        noStroke();
        textFont("sans-serif", 48);
        textAlign(CENTER, CENTER);
        text("YOU'VE been clicked!\n" +
            `Your score: ${this.score}`,
            WIDTH/2, WIDTH/3);
    }
}

class PlayAgainButton extends Actor {
    reset() {
        this.timeSinceSpawn = 0;
    }
    isHovered() {
        return mouseX > WIDTH/4 && mouseX < 3*WIDTH/4 &&
            mouseY > WIDTH/2 && mouseY < 5*WIDTH/6;
    }
    isHeld() {
        return this.isHovered() && mouseIsPressed;
    }
    canBeClicked() {
        return this.isHovered() && this.timeSinceSpawn > 1;
    }
    doClick() {
        AudioManager.playSample("click");
        resetGame();
    }
    update() {
        this.timeSinceSpawn += deltaTime/1000;
    }
    draw() {
        let fg, bg, msg;
        msg = "Play Again";
        if (this.isHeld()) {
            fg = "#aaaaaa";
            bg = "#555555";
            msg = "... if you dare!";
        } else if (this.isHovered()) {
            fg = "#777777";
            bg = "#cccccc";
        } else {
            fg = "#555555";
            bg = "#aaaaaa";
        }
        strokeWeight(4);
        stroke(fg);
        fill(bg);
        rect(WIDTH/4, WIDTH/2, WIDTH/2, WIDTH/3, WIDTH/8);
        textFont("sans-serif", 36);
        fill(fg);
        noStroke();
        textAlign(CENTER, CENTER);
        text(msg, WIDTH/2, 2*WIDTH/3);
    }
}

class ScrollingMessage extends Actor {
    reset(msg, options = null) {
        this.message = msg;
        this.x = WIDTH;
        this.speed = options?.speed || 12;
        this.color = options?.color || "#555555";
        this.size = options?.size || 288;
        AudioManager.playSample("taunt");
    }
    draw() {
        fill(this.color);
        noStroke();
        textAlign(LEFT, CENTER);
        textFont("serif", this.size);
        text(this.message, this.x, WIDTH/2);
    }
    update() {
        this.x -= this.speed*deltaTime/(1000/60);
        if (this.x < -50*WIDTH) {
            this.despawn();
        }
    }
}

class MilestoneTracker extends Actor {
    reset(milestones) {
        this.milestones = {...milestones};
        this.milestonesMet = {};
        this.score = 0;
    }
    update() {
        for (let milestone of Object.keys(this.milestones)) {
            if (
                this.milestones[milestone].condition() &&
                !this.milestonesMet[milestone]
            ) {
                this.milestonesMet[milestone] = true;
                this.milestones[milestone].action();
            }
        }
    }
}

class RainbowFadeBackground extends Actor {
    reset() {
        this.hue = 0;
        this.brightness = 0;
        this.targetBrightness = 0.05;
        this.speed = 1;
        this.brightnessAggression = 0.03;
    }
    update() {
        this.speed =
            (this.scene.find(MilestoneTracker)?.score || 30)/30;
        this.hue = (this.hue + this.speed*deltaTime/(1000/60))%360;
        this.brightness =
            lerp(this.brightness, this.targetBrightness,
                this.brightnessAggression);
    }
    draw() {
        background(`hsl(${
            Math.round(this.hue)
        }, 100%, ${
            Math.round(100*this.brightness)
        }%)`);
    }
}

class CoolBackground extends Actor {
    reset() {
        this.count = 16;
        this.speed = 8;
        this.initRadius = WIDTH/4;
        this.minStrokeWeight = 0;
        this.maxStrokeWeight = 8;
        this.points = [];
        this.maxBrightness = 0.25;
        this.fadeInTime = 5;
        this.fadeInTimer = this.fadeInTime;
        for (let i = 0; i < this.count; i++) {
            this.points.push({
                id: i,
                x: this.initRadius*Math.cos(2*Math.PI*i/this.count),
                y: this.initRadius*Math.sin(2*Math.PI*i/this.count),
                xDir: 1,
                yDir: 1
            });
        }
    }
    coordToDelta(c) {
        return this.speed*c/WIDTH;
    }
    coordOutOfBounds(c) {
        return c > WIDTH/2 || c < -WIDTH/2;
    }
    updatePoint(p) {
        p.x += p.xDir*this.coordToDelta(p.y);
        p.y += p.yDir*this.coordToDelta(this.points[(p.id + 1)%this.count].x);
        if (this.coordOutOfBounds(p.x)) p.xDir *= -1;
        if (this.coordOutOfBounds(p.y)) p.yDir *= -1;
    }
    brightness() {
        return lerp(this.maxBrightness, 0, this.fadeInTimer/this.fadeInTime);
    }
    drawLine(from, to) {
        const b = Math.round(this.brightness()*(
            100 -
            100*dist(from.x, from.y, to.x, to.y)/Math.sqrt(2*WIDTH*WIDTH)
        ));
        let h =
            Math.round(180*Math.atan2(to.y - from.y, to.x - from.x)/Math.PI);
        while (h < 0) h += 360;
        while (h >= 360) h -= 360;
        stroke(`hsl(${h}, 100%, ${b}%)`);
        strokeWeight(lerp(this.minStrokeWeight, this.maxStrokeWeight, b/100));
        line(WIDTH/2 + from.x, WIDTH/2 + from.y,
            WIDTH/2 + to.x, WIDTH/2 + to.y);
    }
    draw() {
        for (let from of this.points) {
            for (let to of this.points) {
                if (from.id != to.id) {
                    this.drawLine(from, to);
                }
            }
        }
    }
    update() {
        if (this.fadeInTimer > 0) {
            this.fadeInTimer -= deltaTime/1000;
            if (this.fadeInTimer < 0) {
                this.fadeInTimer = 0;
            }
        }
        const x0a = this.points[0].x;
        for (let point of this.points) {
            if (point.id == this.count - 1) {
                const x0b = this.points[0].x;
                this.points[0].x = x0a;
                this.updatePoint(point);
                this.points[0].x = x0b;
            } else {
                this.updatePoint(point);
            }
        }
    }
}

class MainScene extends Scene {
    constructor() {
        super("background", "foreground");
        this.spawn("background", MilestoneTracker, {
            firstWin: {
                condition: () => !!this.find(actor => (
                    actor instanceof RunawayButton && actor.isTired()
                )),
                action: () => {
                    AudioManager.bgmVoiceFadeIn("membrane", "2n");
                }
            },
            buttonsCanShoot: {
                condition: () => !!this.find(actor => (
                    actor instanceof RunawayButton && actor.couldShoot()
                )),
                action: () => {
                    this.spawn("background", RainbowFadeBackground);
                    this.spawn("background", ScrollingMessage,
                        "Oh yeah!? Two can play at that game!!");
                    AudioManager.bgmVoiceFadeIn("square", "2n");
                }
            },
            rampUp: {
                condition: () => this.count(RunawayButton) >= 7,
                action: () => {
                    this.spawn("background", CoolBackground);
                    this.spawn("background", ScrollingMessage,
                        "You think you're good enough to click me!? " +
                        "I'll show you clicking " +
                        "like you've never even SEEN!!");
                    AudioManager.bgmVoiceFadeIn("sawtooth", "2n");
                }
            }
        });
        this.spawn("foreground", RunawayButton);
    }
}

class GameOverScene extends Scene {
    constructor(score) {
        super("background", "foreground");
        this.spawn("foreground", Scoreboard, score);
        this.spawn("foreground", PlayAgainButton);
        AudioManager.playSample("gameover");
    }
}

function resetGame() {
    Scene.change(MainScene);
}

function setup() {
    createCanvas(WIDTH, WIDTH, document.querySelector("#p5js-canvas"));
    resetGame();
}

function draw() {
    background("black");
    Scene.current.draw();
    Scene.current.update();
}

function mouseClicked() {
    Scene.current.doClick();
}

function gameOver() {
    let score = Scene.current.find(MilestoneTracker).score;
    Scene.change(GameOverScene, score);
}

globalThis.setup = setup;
globalThis.draw = draw;
globalThis.mouseClicked = mouseClicked;
