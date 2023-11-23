
let STATE_TITLE = 0
let STATE_FADEIN = 1
let STATE_PLAY = 2
let STATE_DEAD = 3
let STATE_FADEOUT = 4
let STATE_COMPLETE = 5

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

		//stores incrementing value (in seconds) until the next tick, when it's then decremented by 1 tick's length
		this.accumulator = 0;
		this.previous;

		let Self = this;

		this.fpsControl = karaqu.FpsControl({
			fps: 60,
			callback(time=0) {
				if (Self.previous === undefined) {
					Self.previous = time;
				}
				let delta = (time - Self.previous) / 1e3;
				Self.accumulator += delta;

				if (Self.accumulator > 1.0 / settings_tps) {
					Self.accumulator -= 1.0 / settings_tps;
					Self.tick();
				}
				if (Self.accumulator > 1.0 / settings_tps) {
					Self.accumulator = 1.0 / settings_tps;
				}

				Self.draw(Self.accumulator, time / 1e3, delta);
				Self.previous = time;
			}
		});
	}

	showLevelName() {
		console.log(this.level.last ? "THE MEMORY CORE" : `Level ${this.currentLevel}`);
	}

	get paused() {
		return this._pause;
	}

	start() {
		console.log("started");
		this.state = STATE_FADEIN;
		this.fadeTimer = 1.0;
		this.fpsControl.start();
		this._pause = false;
	}

	pause() {
		console.log("stopped");
		this.fpsControl.stop();
		this._pause = true;
	}

	resume() {
		console.log("resumed");
		this.fpsControl.start();
		this._pause = false;
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
				Draw.player(this.player);
				if (this.state === STATE_PLAY) {
					for (let g of ghosts) {
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
			for (let g of this.ghosts) {
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
			this.start();
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
