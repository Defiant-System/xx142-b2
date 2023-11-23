
@import "./classes/drawing.js"
@import "./classes/game.js"
@import "./classes/player.js"
@import "./classes/ghost.js"
@import "./modules/vectors.js"

@import "./modules/math.js"
@import "./modules/settings.js"
@import "./modules/jsfxr.js"
@import "./modules/shaders.js"
@import "./modules/levels.js"
@import "./modules/sound.js"
@import "./modules/mat4.js"
@import "./modules/collision.js"
@import "./modules/build3d.js"
@import "./modules/level.js"

@import "./modules/test.js"

let draw;
let game;


const xx142b2 = {
	init() {
		// fast references
		this.content = window.find("content");
		// init game
		draw = new Drawing(window.find("canvas.cvs"));
		game = new Game(levels);

		// DEV-ONLY-START
		Test.init(this);
		// DEV-ONLY-END
	},
	dispatch(event) {
		switch (event.type) {
			case "window.init":
				break;
			case "open-help":
				karaqu.shell("fs -u '~/help/index.md'");
				break;
		}
	}
};

window.exports = xx142b2;
