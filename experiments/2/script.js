const WIDTH = 512;

const theButton = new class {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = WIDTH/2;
        this.y = WIDTH/2;
        this.width = WIDTH/4;
        this.height = WIDTH/16;
        this.targetX = this.x;
        this.targetY = this.y;
        this.clickTimeout = 0;
        this.timesClicked = 0;
        this.avoidAggression = 0.03;
        this.followAggression = 0.5;
        this.aggression = this.avoidAggression;
        this.clickDuration = 1;
        this.wasHeld = false;
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
        return this.isHovered() && !this.isClicked() && !this.isTired();
    }
    isTired() {
        return this.timesClicked >= 5;
    }
    doClick() {
        this.clickTimeout = this.clickDuration;
        this.timesClicked++;
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
        textFont("sans-serif", 12);
        textAlign(CENTER, CENTER);
        text(msg, this.x, this.y);
    }
    avoid() {
        while (dist(
            this.targetX, this.targetY,
            mouseX, mouseY
        ) <= this.width*1.5) {
            this.targetX =
                lerp(this.width/2, WIDTH - this.width/2, Math.random());
            this.targetY =
                lerp(this.height/2, WIDTH - this.height/2, Math.random());
        }
        this.aggression = this.avoidAggression;
    }
    follow() {
        this.targetX = mouseX;
        this.targetY = mouseY;
        this.aggression = this.followAggression;
    }
    update() {
        if (this.isClicked()) {
            this.clickTimeout -= deltaTime/1000;
        }
        if (this.isHeld()) {
            this.wasHeld = true;
            this.follow();
        } else {
            this.wasHeld = false;
            if (!this.isTired()) {
                this.avoid();
            }
        }
        this.x = lerp(this.x, this.targetX, this.aggression);
        this.y = lerp(this.y, this.targetY, this.aggression);
    }
};

function setup() {
    createCanvas(WIDTH, WIDTH, document.querySelector("#p5js-canvas"));
    theButton.reset();
}

function draw() {
    background("black");
    theButton.draw();
    theButton.update();
}

function mouseClicked() {
    if (theButton.canBeClicked()) {
        theButton.doClick();
    }
}
