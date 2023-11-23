
const STATE_TITLE = 0
const STATE_FADEIN = 1
const STATE_PLAY = 2
const STATE_DEAD = 3
const STATE_FADEOUT = 4
const STATE_COMPLETE = 5

class Gaming {
	constructor(levels) {
		this.level;
		this.player;
		this.ghosts = [];
		this.currentTick = 0;
		this.history = [];
		this.currentLevel = 0;
		this.fadeTimer = 0;
		this.state = STATE_TITLE;

		this.levels = levels;
		this.levelNameShowed = -1
		this.buttons = {}

		this.loadLevel(this.currentLevel);
	}

	showLevelName() {
		console.log(level.last ? "THE MEMORY CORE" : `Level ${currentLevel}`);
	}

	reset() {
		for (let g of this.ghosts) {
			g.reset();
		}
		this.ghosts.push(new Ghost(history, level));
		if (this.ghosts.length > settings_maxGhosts) {
			this.ghosts.shift();
		}
		this.currentTick = 0;
		this.history = [];

		//reset level and player
		this.level.reset();
		this.player = new Player(level);
		this.state = STATE_FADEIN;
		Draw.scale = 1.5;
	}

	die() {
		Sounds.death();
		this.state = STATE_DEAD;
	}

	draw(accumulator, frameTime, timeDelta) {
		Draw.accumulator = accumulator;
		switch (this.state) {
			case STATE_TITLE:
				Draw.titleScreen();
				break;
			case STATE_FADEIN:
			case STATE_FADEOUT:
			case STATE_DEAD:
			case STATE_PLAY:
				Draw.setCamera(this.player.position, this.player.movementVector);
				Draw.bg();
				Draw.level(this.level.getLevel(), frameTime, timeDelta, this.state);
				Draw.player(player);
				if (this.state === STATE_PLAY) {
					for (const g of ghosts) {
						Draw.ghost(g);
					}
				}
				Draw.timer(this.currentTick / settings_tps);
				break;
			case STATE_COMPLETE:
				Draw.endScreen();
				break;
		}
	}

	tick() {
		if (this.state === STATE_FADEIN && this.levelNameShowed !== this.currentLevel) {
			this.levelNameShowed = this.currentLevel;
			this.showLevelName();
		}

		if (this.state === STATE_FADEIN || this.state === STATE_FADEOUT) {
			if (this.fadeTimer > 0) {
				this.fadeTimer -= 1 / settings_tps;
			}
		}

		if (this.state === STATE_DEAD) {
			let mv = new Vec2(0, 0);
			while (mv.len() < 40 && this.currentTick > 0) {
				--this.currentTick;
				mv = mv.sub(history[this.currentTick]);
			}
			Draw.scale /= 0.95;
			this.player.forceMove(mv);
			if (this.currentTick === 0) {
				this.reset();
			}
			return;
		}

		if (this.state === STATE_PLAY) {
			if (this.level.completed) {
				this.state = STATE_FADEOUT;
				this.player.movementVector = new Vec2(0, 0); //stops flickering while fading out
				this.fadeTimer = 1.0;
				Sounds.win();
				return;
			}
			if (this.currentTick === settings_timeToDie * settings_tps) {
				this.die();
				return;
			}
			history[this.currentTick] = this.player.move(this.buttons);
			for (const g of this.ghosts) {
				g.tick(this.currentTick);
			}
			++this.currentTick;
		}

		if (this.state === STATE_FADEOUT && this.fadeTimer <= 0) {
			if (this.level.last) {
				console.log("started won");
			} else {
				this.loadLevel(this.currentLevel + 1);
				this.state = STATE_FADEIN;
				this.fadeTimer = 1.0;
			}
		}
	}

	buttonDown(key) {
		if (this.state === STATE_TITLE) {
			console.log(started);
			this.state = STATE_FADEIN;
			this.fadeTimer = 1.0;
			return;
		}
		if (this.state === STATE_FADEIN && this.fadeTimer <= 0) {
			this.state = STATE_PLAY;
		}
		this.buttons[key] = true;
		if (key === 'back') {
			this.die();
		}
	}

	buttonUp(key) {
		if (key === undefined) {
			this.buttons = {};
		}
		this.buttons[key] = false;
	}

	loadLevel(index) {
		this.currentLevel = index;
		if (index >= this.levels.length) {
			this.state = STATE_COMPLETE;
		}
		this.level = new Level(this.levels[index]);
		this.history = [];
		this.player = new Player(this.level);
		this.ghosts = [];
		this.currentTick = 0;
		Draw.resetCamera();
	}
}
