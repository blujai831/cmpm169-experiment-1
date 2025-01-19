const WIDTH = 512;

const actors = [];
const actorsToDrop = [];

class Actor {
    constructor(...args) {
        actors.push(this);
        this.reset(...args);
    }
    static spawn(what, ...args) {
        console.assert(what.prototype instanceof Actor);
        return new what(...args);
    }
    static count(what) {
        console.assert(what.prototype instanceof Actor);
        let n = 0;
        for (let actor of actors) {
            if (actor instanceof what) {
                n++;
            }
        }
        return n;
    }
    static find(predicate) {
        if (predicate.prototype instanceof Actor) {
            for (let actor of actors) {
                if (actor instanceof what) {
                    return actor;
                }
            }
        } else {
            for (let actor of actors) {
                if (predicate(actor)) {
                    return actor;
                }
            }
        }
    }
    despawn() {
        actorsToDrop.push(this);
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
    }
    draw() {
        strokeWeight(2);
        stroke(color("#800000"));
        fill(color("#ff0000"));
        circle(this.x, this.y, this.size);
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
        this.avoidMargin = 1.1;
        this.avoidAggression = 0.03;
        this.followAggression = 0.5;
        this.clickDuration = 1;
        this.wasHeld = false;
        this.timeToDisappear = 3;
        this.timeInvincible = 1;
        this.maxAvoidTries = 100;
        this.minBulletTimeout = 0.5;
        this.maxBulletTimeout = 2.5;
        this.minShootMargin = 1.5;
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
        this.clickTimeout = this.clickDuration;
        this.timesClicked++;
        if (this.isTired()) {
            this.fork();
        }
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
            msg = "Ow! Stop that!";
        } else if (this.isHeld()) {
            fg = color("#aaaaaa");
            bg = color("#555555");
            msg = "Ack! Let me go!";
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
        Actor.spawn(
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
            let child = Actor.spawn(RunawayButton);
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
        this.color = options?.color || "white";
        this.size = options?.size || 288;
    }
    draw() {
        fill(this.color);
        noStroke();
        textAlign(LEFT, CENTER);
        textFont("sans-serif", this.size);
        text(this.message, this.x, WIDTH/2);
    }
    update() {
        this.x -= this.speed*deltaTime/(1000/60);
        if (this.x < -10*WIDTH) {
            this.despawn();
        }
    }
}

class MilestoneTracker extends Actor {
    reset(milestones) {
        this.milestones = {...milestones};
        this.milestonesMet = {};
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

function resetGame() {
    actors.length = 0;
    Actor.spawn(MilestoneTracker, {
        buttonsCanShoot: {
            condition: () => !!Actor.find(actor => (
                actor instanceof RunawayButton && actor.couldShoot()
            )),
            action: () =>
                Actor.spawn(ScrollingMessage, "Oh yeah?? How about THIS!?")
        }
    });
    Actor.spawn(RunawayButton);
}

function setup() {
    createCanvas(WIDTH, WIDTH, document.querySelector("#p5js-canvas"));
    resetGame();
}

function draw() {
    background("black");
    for (let actor of actors) {
        actor.draw();
        actor.update();
    }
    removeItemsFromArray(actors, actor => actorsToDrop.includes(actor));
    actorsToDrop.length = 0;
}

function mouseClicked() {
    for (let actor of actors) {
        if (actor.canBeClicked()) {
            actor.doClick();
        }
    }
}

function gameOver() {
    let score = Actor.count(RunawayButton);
    actors.length = 0;
    Actor.spawn(Scoreboard, score);
    Actor.spawn(PlayAgainButton);
}
