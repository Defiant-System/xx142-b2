
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
				switch (event.char) {
					case "w":
					case "up":    Keys.up = 1; break;
					case "s":
					case "down":  Keys.down = 1; break;
					case "a":
					case "left":  Keys.left = 1; break;
					case "d":
					case "right": Keys.right = 1; break;
					case "esc":
						break;
					case "p":
						if (Game.paused) Game.resume();
						else Game.pause();
						break;
				}
				break;
			case "window.keyup":
				// switch (event.char) {
				// 	case "w":
				// 	case "up":    Keys.up = 0; break;
				// 	case "s":
				// 	case "down":  Keys.down = 0; break;
				// 	case "a":
				// 	case "left":  Keys.left = 0; break;
				// 	case "d":
				// 	case "right": Keys.right = 0; break;
				// }
				break;
			// custom events
			case "open-help":
				karaqu.shell("fs -u '~/help/index.md'");
				break;
		}
	}
};

window.exports = xx142b2;
