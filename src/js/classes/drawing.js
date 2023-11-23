
class Drawing {
	constructor(cvs) {
		this.cvs = cvs;
		this.gl = cvs[0].getContext("webgl");

		let width = cvs.parent().prop("offsetWidth"),
			height = cvs.parent().prop("offsetHeight");
		this.cvs.attr({ width, height });

		this.canvasWidth = width;
		this.canvasHeight = height;
		this.canvasRatio = this.canvasWidth / this.canvasHeight;

		this.vertex_buffer = this.createGlBuffer(builtVertices);
		this.normal_buffer = this.createGlBuffer(builtNormals);
		this.colors_buffer = this.createGlBuffer(builtColors);
		this.index_buffer = this.createGlBuffer(builtIndices, this.gl.ELEMENT_ARRAY_BUFFER);

		this.cameraRotX = 1;
		this.cameraRotY = 0;
		this.cameraPos = null;

		this.viewMatrix = new Float32Array(16);
		this.projectionMatrix = new Float32Array(16);
		this.playerLightPosition = new Float32Array(3);

		this.shaderProgram = this.gl.createProgram();
		this.createGlShasder(this.shaderProgram, shader_basic_vert, this.gl.VERTEX_SHADER);
		this.createGlShasder(this.shaderProgram, shader_basic_frag, this.gl.FRAGMENT_SHADER);
		this.gl.linkProgram(this.shaderProgram);

		if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
			throw new Error(this.gl.getProgramInfoLog(this.shaderProgram));
		}

		/* ====== Associating attributes to vertex shader =====*/
		this.uPmatrix = this.gl.getUniformLocation(this.shaderProgram, "Pmatrix");
		this.uVmatrix = this.gl.getUniformLocation(this.shaderProgram, "Vmatrix");
		this.uPosition = this.gl.getAttribLocation(this.shaderProgram, "position");
		this.uNormal = this.gl.getAttribLocation(this.shaderProgram, "normal");
		this.uColor = this.gl.getAttribLocation(this.shaderProgram, "color");
		this.uPlayerLightPosition = this.gl.getUniformLocation(this.shaderProgram, "playerLightPosition");
		this.uTranslation = this.gl.getUniformLocation(this.shaderProgram, "inTranslation");
		this.uAmbientColor = this.gl.getUniformLocation(this.shaderProgram, "inAmbientColor");
		this.uSurfaceSensitivity = this.gl.getUniformLocation(this.shaderProgram, "inSurfaceSensitivity");
		this.uFrameTime = this.gl.getUniformLocation(this.shaderProgram, "inFrameTime");
		this.uFade = this.gl.getUniformLocation(this.shaderProgram, "inFade");

		this.accumulator = 0;

		this.timerUpdateTime = 0;
		this.timerR = 0;
		this.timerG = 0;
		this.timerS = 0;
		this.timerX = 0;
		this.timeDelta = 1;
		this.startLight = 0;

		this.fadeLevel = 0;
		this.endLight;
		this.currentLevelId;

		this.gameState = STATE_FADEOUT;
		this.levelState = new Map();
		
		this.calcProjectionMatrix();
	}

	createGlBuffer(items, type = this.gl.ARRAY_BUFFER) {
		let result = this.gl.createBuffer();
		this.gl.bindBuffer(type, result);
		this.gl.bufferData(type, items, this.gl.STATIC_DRAW);
		return result;
	}

	createGlShasder(program, input, type) {
		let shader = this.gl.createShader(type);
		this.gl.shaderSource(shader, input);
		this.gl.compileShader(shader);
		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.log(`Shader compilation failed: ${this.gl.getShaderInfoLog(shader)}`);
		}
		this.gl.attachShader(program, shader);
	}

	interpolate(position, movementVector) {
		return position.sub(movementVector.mul(1 - settings_tps * this.accumulator));
	}

	resetCamera() {
		this.cameraPos = null;
	}

	setCamera(position, movementVector) {
		let currentPlayerPos = this.interpolate(position, movementVector);
		let desiredCameraPos = [currentPlayerPos.x, 250, -currentPlayerPos.y - 100];

		if (this.cameraPos === null) {
			this.cameraPos = desiredCameraPos;
		}

		let cameraMovementVector = Vec3.sub(desiredCameraPos, this.cameraPos);
		let length = Vec3.len(cameraMovementVector);
		if (length > 0) {
			this.cameraPos = Vec3.add(this.cameraPos, Vec3.mul(Vec3.normalize(cameraMovementVector), Math.pow(length, 2) * 0.001));
		}

		this.cameraRotX = 1 + (this.cameraPos[2] - desiredCameraPos[2]) / 1000;
		this.cameraRotY = -(this.cameraPos[0] - desiredCameraPos[0]) / 3000;

		this.playerLightPosition[0] = -currentPlayerPos.x * glScale;
		this.playerLightPosition[2] = currentPlayerPos.y * glScale;
	}

	bg() {
		this.calcViewMatrix();

		this.gl.enable(this.gl.DEPTH_TEST);
		this.gl.depthFunc(this.gl.LEQUAL);
		this.gl.clearColor(0, 0, 0, 1);
		this.gl.clearDepth(1.0);

		this.gl.viewport(0.0, 0.0, this.canvasWidth, this.canvasHeight);
		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	}

	timer(time) {
		let t = 1 - time / settings_timeToDie;
		let s = Math.ceil(13 - time);

		if (this.timerS !== s || time - this.timerUpdateTime > 0.2) {
			// if (this.timerX) {
			// 	elementT.className = "";
			// }

			this.timerUpdateTime = time;

			let v = new Vec2(t, 1 - t);
			v = v.normalize();

			let r = round(255 * v.y);
			let g = round(255 * v.x);

			if (r !== this.timerR || g !== this.timerG) {
				this.timerR = r;
				this.timerG = g;

				// let b = round(128 * v.x * v.x);
				// elementT.style.color = `rgb(${r},${g},${b})`;
			}

			if (this.timerS !== s) {
				this.timerS = s;
				if (s < 4) {
					this.timerX = 1;
					// elementT.className = "x";
				}
				// elementT.innerText = s;
			}
		}
	}

	playerRotation(p, movementVector) {
		let a;
		if (!movementVector || (movementVector.x === 0 && movementVector.y === 0)) {
			a = p._a;
		}
		if (a === undefined) {
			a = atan2(-movementVector.y, movementVector.x);
			p._a = a;
		}
		let r = p._r;
		p._r = r = angleLerp(r !== undefined ? r : a, a, this.timeDelta * 12);
		return PI / 2 - r;
	}

	player(player) {
		let pos = this.interpolate(player.position, player.movementVector);
		this.calcViewMatrix();
		mat4Translate(this.viewMatrix, -pos.x * glScale, -3.1 * glScale, pos.y * glScale);
		mat4RotateY(this.viewMatrix, this.playerRotation(player, player.drawMovementVector));
		this.gl.uniformMatrix4fv(this.uVmatrix, false, this.viewMatrix);
		this.gl.uniform3f(this.uAmbientColor, 1, 1, 1);
		this.gl.drawElements(this.gl.TRIANGLES, builtSprites.player.ibCount, this.gl.UNSIGNED_SHORT, builtSprites.player.ibStart * 2);
	}

	ghost(ghost) {
		if (ghost.dead) {
			return false;
		}
		let pos = this.interpolate(ghost.position, ghost.movementVector);
		this.calcViewMatrix();
		mat4Translate(this.viewMatrix, -pos.x * glScale, -3 * glScale, pos.y * glScale);
		mat4RotateY(this.viewMatrix, this.playerRotation(ghost, ghost.movementVector));
		this.gl.uniformMatrix4fv(this.uVmatrix, false, this.viewMatrix);
		this.gl.drawElements(this.gl.TRIANGLES, builtSprites.ghost.ibCount, this.gl.UNSIGNED_SHORT, builtSprites.ghost.ibStart * 2);
		return true;
	}

	level(level, frameTime, currentTimeDelta, currentCameState) {
		this.gameState = currentCameState;
		this.timeDelta = currentTimeDelta;
		if (level.id !== this.currentLevelId) {
			this.currentLevelId = level.id;
			this.endLight = 0;
			this.levelState.clear();
		}

		this.fadeLevel = clamp01(this.fadeLevel + (this.gameState === STATE_FADEOUT ? -this.timeDelta : this.timeDelta));

		this.gl.enable(this.gl.CULL_FACE);
		this.gl.cullFace(this.gl.BACK);
		this.gl.useProgram(this.shaderProgram);

		this.gl.uniform3f(this.uTranslation, 0, 0, 0);
		this.gl.uniform3f(this.uAmbientColor, 1, 1, 1);
		this.gl.uniformMatrix4fv(this.uPmatrix, false, this.projectionMatrix);
		this.gl.uniformMatrix4fv(this.uVmatrix, false, this.viewMatrix);
		this.gl.uniform3fv(this.uPlayerLightPosition, this.playerLightPosition);
		this.gl.uniform1f(this.uFrameTime, frameTime);

		this.gl.uniform1f(this.uSurfaceSensitivity, this.fadeLevel);
		this.gl.uniform1f(this.uFade, this.fadeLevel);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertex_buffer);

		this.gl.vertexAttribPointer(this.uPosition, 3, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(this.uPosition);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normal_buffer);
		this.gl.vertexAttribPointer(this.uNormal, 3, this.gl.FLOAT, true, 0, 0);
		this.gl.enableVertexAttribArray(this.uNormal);

		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colors_buffer);
		this.gl.vertexAttribPointer(this.uColor, 3, this.gl.FLOAT, false, 0, 0);
		this.gl.enableVertexAttribArray(this.uColor);

		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.index_buffer);
		this.gl.drawElements(this.gl.TRIANGLES, level.ibCount, this.gl.UNSIGNED_SHORT, level.ibStart * 2);

		for (let d of level.doors) {
			if (!d.open) {
				this.gl.drawElements(this.gl.TRIANGLES, d.ibCount, this.gl.UNSIGNED_SHORT, d.ibStart * 2);
			}
		}

		this.gl.uniform3f(this.uTranslation, -level.start.x * glScale, glScale, level.start.y * glScale);

		this.startLight = this.fadeLevel * clamp01(this.startLight + this.timeDelta * (this.gameState === STATE_FADEIN ? -2 : 3));
		this.gl.uniform1f(this.uSurfaceSensitivity, this.startLight / 3);
		this.gl.uniform3f(this.uAmbientColor, 0.2 * this.startLight, (1 - this.startLight) / 4, 0.5);
		this.gl.drawElements(this.gl.TRIANGLES, builtSprites.pad.ibCount, this.gl.UNSIGNED_SHORT, builtSprites.pad.ibStart * 2);

		this.gl.uniform1f(this.uSurfaceSensitivity, this.fadeLevel * 0.4);
		this.gl.uniform3f(this.uTranslation, -level.end.x * glScale, 3 * glScale, level.end.y * glScale);
		this.endLight = lerp(this.endLight, lerp(0.7, 1, 1 - abs(cos(frameTime * 1.5))), this.timeDelta * 4);
		this.gl.uniform3f(this.uAmbientColor, 0, this.endLight / 1.3, this.endLight);

		let endSprite = level.last ? builtSprites.core : builtSprites.pad;
		this.gl.drawElements(this.gl.TRIANGLES, endSprite.ibCount, this.gl.UNSIGNED_SHORT, endSprite.ibStart * 2);

		for (let s of level.switches) {
			let { uid, pressed } = s;
			let switchState = this.levelState.get(uid);
			if (!switchState) {
				this.levelState.set(uid, (switchState = { r: 1, g: 0, p: 0 }));
			}

			let { r, g, p } = switchState;
			switchState.r = lerp(r, pressed ? 0.1 : lerp(0.7, 1, 1 - abs(cos(frameTime * 3))), this.timeDelta * 4);
			switchState.g = lerp(g, pressed ? 0.3 : 0, this.timeDelta * 5);
			switchState.p = lerp(switchState.p, pressed ? 3.8 * glScale : 0, this.timeDelta * 8);

			this.gl.uniform1f(this.uSurfaceSensitivity, this.fadeLevel * g);

			this.gl.uniform3f(this.uTranslation, -s.x * glScale, p, s.y * glScale);
			this.gl.uniform3f(this.uAmbientColor, r, g, 0);
			this.gl.drawElements(this.gl.TRIANGLES, builtSprites.pad.ibCount, this.gl.UNSIGNED_SHORT, builtSprites.pad.ibStart * 2);
		}

		this.gl.uniform1f(this.uSurfaceSensitivity, 0);
		this.gl.uniform3f(this.uTranslation, 0, 0, 0);
	}

	titleScreen() {
		console.log("titleScreen");
	}

	endScreen() {
		console.log("endScreen");
	}

	calcViewMatrix(out = this.viewMatrix) {
		out.set(mat4Identity);
		mat4RotateX(out, this.cameraRotX);
		mat4RotateY(out, this.cameraRotY);
		mat4RotateZ(out, -PI);
		mat4Translate(out, this.cameraPos[0] * glScale, this.cameraPos[1] * glScale, this.cameraPos[2] * glScale);
	}

	calcProjectionMatrix() {
		let zMin = 0.1;
		let zMax = 100;
		let angle = 40;
		let ang = tan((angle * 0.5 * PI) / 180); //angle*.5
		this.projectionMatrix[0] = 0.5 / ang;
		this.projectionMatrix[5] = (0.5 * this.canvasRatio) / ang;
		this.projectionMatrix[10] = -(zMax + zMin) / (zMax - zMin);
		this.projectionMatrix[11] = -1;
		this.projectionMatrix[14] = (-2 * zMax * zMin) / (zMax - zMin);
	}
}
