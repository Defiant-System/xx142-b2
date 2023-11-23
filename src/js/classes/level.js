
class Level {
	constructor(levelObject) {
		let currentLevel = JSON.parse(JSON.stringify(levelObject));
		this.last = !!currentLevel.last;
		this.levelObject = levelObject;
	}

	doesCircleCollide(position, radius) {
		for (let i = 0; i < currentLevel.walls.length; i++) {
			for (let j = 1; j < currentLevel.walls[i].length; j++) {
				let colPos = doesLineInterceptCircle(currentLevel.walls[i][j - 1], currentLevel.walls[i][j], position, radius);
				if (colPos) {;
					return doesCircleCollide(colPos, radius) || colPos;
				}
			}
		}

		for (let i = 0; i < currentLevel.doors.length; i++) {
			if (currentLevel.doors[i].open) {
				continue;
			}
			let colPos = doesLineInterceptCircle(
				currentLevel.doors[i].polygon[0],
				currentLevel.doors[i].polygon[1],
				position,
				radius
			);
			if (colPos) {
				return doesCircleCollide(colPos, radius) || colPos;
			}
		}

		return false;
	}

	toggleDoor(doorName) {
		let door = currentLevel.doors.find(d => d.name === doorName);
		door.open = !door.open;
	}

	handleSwitches(oldPos, newPos, radius) {
		if (oldPos.x !== newPos.x || oldPos.y !== newPos.y) {
			for (let s of currentLevel.switches) {
				let switchPos = new Vec2(s.x, s.y);
				let wasTouching = oldPos.sub(switchPos).len() < radius + settings_switchRadius;
				let nowTouching = newPos.sub(switchPos).len() < radius + settings_switchRadius;

				if (!wasTouching && nowTouching) {
					//only toggle if you're the first one on it
					if (s.pressed === 0) {
						for (let target of s.targets) {
							toggleDoor(target);
						}
						Sounds.switchDown();
					}
					s.pressed++;
				}
				if (wasTouching && !nowTouching && s.type !== 'single') {
					if (s.pressed <= 0) {
						continue;
					}
					s.pressed--;
				}
				if (wasTouching && !nowTouching && s.type === 'momentary' && s.pressed === 0) {
					for (let target of s.targets) {
						toggleDoor(target);
					}
				}
				if (wasTouching && !nowTouching && s.pressed === 0) {
					Sounds.switchUp();
				}
			}
		}
	}

	handleEnd(position, radius) {
		let isEnded = position.sub(new Vec2(this.levelObject.end.x, this.levelObject.end.y)).len() < radius + settings_switchRadius;
		if (isEnded) {
			this.completed = true;
		}
	}

	ghostRemoved(position, radius) {
		for (let s of currentLevel.switches) {
			let isTouching = position.sub(new Vec2(s.x, s.y)).len() < radius + settings_switchRadius;
			if (isTouching) {
				if (s.type !== 'single') {
					s.pressed--;
				}
				if (s.pressed === 0 && s.type === 'momentary') {
					for (let target of s.targets) {
						toggleDoor(target);
					}
				}
			}
		}
	}

	getStart() {
		return new Vec2(this.levelObject.start.x, this.levelObject.start.y);
	}

	reset() {
		currentLevel = JSON.parse(JSON.stringify(this.levelObject));
	}

	interact(oldPos, radius, plannedVector) {
		let newPos = oldPos.add(plannedVector);

		let collisionPosition = doesCircleCollide(newPos, radius);
		newPos = collisionPosition || newPos;
		handleSwitches(oldPos, newPos, radius);
		handleEnd(newPos, radius);

		if (collisionPosition) {
			return collisionPosition.sub(oldPos);
		}

		return plannedVector;
	}

	getLevel() {
		return currentLevel;
	}
}
