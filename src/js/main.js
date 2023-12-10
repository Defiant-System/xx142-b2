
@import "./classes/vectors.js"
@import "./classes/drawing.js"
@import "./classes/gaming.js"
@import "./classes/player.js"
@import "./classes/ghost.js"
@import "./classes/level.js"

@import "./modules/math.js"
@import "./modules/settings.js"
@import "./modules/jsfxr.js"
@import "./modules/shaders.js"
@import "./modules/levels.js"
@import "./modules/sound.js"
@import "./modules/mat4.js"
@import "./modules/collision.js"
@import "./modules/build3d.js"

@import "./modules/test.js"

let Draw;
let Game;
let levelIndex = 0;


const xx142b2 = {
	init() {
		// fast references
		this.content = window.find("content");
		// init game
		Draw = new Drawing(window.find("canvas.cvs"));
		Game = new Gaming(levels);
		Game.loadLevel(levelIndex);


		// DEV-ONLY-START
		Test.init(this);
		// DEV-ONLY-END
	},
	dispatch(event) {
		switch (event.type) {
			// system events
			case "window.init":
				break;
			case "window.keydown":
				if (Game.state === STATE_FADEIN && Game.fadeTimer <= 0) {
					Game.state = STATE_PLAY;
				}
				// console.log(event);
				switch (event.char) {
					case "esc": Game.start(); break;
					case "w":
					case "up": Game.buttons.up = true; break;
					case "s":
					case "down": Game.buttons.down = true; break;
					case "a":
					case "left": Game.buttons.left = true; break;
					case "d":
					case "right": Game.buttons.right = true; break;
					case "backspace": Game.die(); break;
					case "p": Game[Game.paused ? "resume" : "pause" ](); break;
				}
				break;
			case "window.keyup":
				switch (event.char) {
					case "w":
					case "up": Game.buttons.up = false; break;
					case "s":
					case "down": Game.buttons.down = false; break;
					case "a":
					case "left": Game.buttons.left = false; break;
					case "d":
					case "right": Game.buttons.right = false; break;
				}
				break;
			// custom events
			case "open-help":
				karaqu.shell("fs -u '~/help/index.md'");
				break;
		}
	}
};

window.exports = xx142b2;
