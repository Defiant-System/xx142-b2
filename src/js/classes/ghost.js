
let defaultMovementVector = new Vec2(0, -1)

class Ghost {
	constructor(history, level) {
		this.history = history;
		this.level = level;

		this.position = this.level.getStart();
		//stores the last movementVector
		this.movementVector = defaultMovementVector;
		this._a = undefined;
	}

	tick(currentTick) {
		if (currentTick > this.history.length) {
			return
		}
		if (currentTick === this.history.length) {
			this.level.ghostRemoved(this.position, settings_playerRadius)
			this.dead = true
			return
		}

		let movementVector = this.history[currentTick]
		this.level.interact(this.position, settings_playerRadius, movementVector)
		this.position = this.position.add(movementVector) //always apply the vector, cause we're a ghost
		this.movementVector = currentTick === 0 ? defaultMovementVector : movementVector
	}

	reset() {
		this.position = this.level.getStart()
		this.dead = false
	}
}
