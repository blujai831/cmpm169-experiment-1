const WIDTH = 512;

const actors = [];

class Actor {
    constructor(...args) {
        actors.push(this);
        this.reset(...args);
    }
    static spawn(what, ...args) {
        console.assert(what.prototype instanceof Actor);
        return new what(...args);
    }
    despawn() {
        removeItemFromArray(actors, item => item == this);
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
    }
    isHovered() {
        return mouseX > this.x - this.width/2 &&
            mouseX < this.x + this.width/2 &&
            mouseY > this.y - this.height/2 &&
            mouseY < this.y + this.height/2;
    }
    isHeld() {
        return (this.isHovered() || this.wasHeld) && mouseIsPressed;
    }
    isClicked() {
        return this.clickTimeout > 0;
    }
    canBeClicked() {
        return this.isHovered() &&
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
        text("Got you!\n" +
            `Your score: ${this.score}`,
            WIDTH/2, WIDTH/2);
    }
}

function removeItemFromArray(array, predicate, all = false) {
    const removed = [];
    for (let i = array.length - 1; i >= 0; i--) {
        const item = array[i];
        if (predicate(item)) {
            for (let j = i; j < array.length - 1; j++) {
                array[j] = array[j + 1];
            }
            array.length--;
            if (all) {
                removed.push(item);
            } else {
                return item;
            }
        }
    }
    if (all) {
        return removed;
    }
}

function setup() {
    createCanvas(WIDTH, WIDTH, document.querySelector("#p5js-canvas"));
    actors.length = 0;
    Actor.spawn(RunawayButton);
}

function draw() {
    background("black");
    for (let actor of actors) {
        actor.draw();
        actor.update();
    }
}

function mouseClicked() {
    for (let actor of actors) {
        if (actor.canBeClicked()) {
            actor.doClick();
        }
    }
}

function gameOver() {
    let score = 0;
    for (let actor of actors) {
        if (actor instanceof RunawayButton) {
            score++;
        }
    }
    actors.length = 0;
    Actor.spawn(Scoreboard, score);
}
