
class Drawing {
	constructor(cvs) {
		this.cvs = cvs;
		this.gl = cvs[0].getContext("webgl");

		let width = cvs.parent().prop("offsetWidth"),
			height = cvs.parent().prop("offsetHeight");
		this.cvs.attr({ width, height });

		this.vertex_buffer = this.createGlBuffer(builtVertices);
		this.normal_buffer = this.createGlBuffer(builtNormals);
		this.colors_buffer = this.createGlBuffer(builtColors);
		this.index_buffer = this.createGlBuffer(builtIndices, gl.ELEMENT_ARRAY_BUFFER);

		let cameraRotX = 1;
		let cameraRotY = 0;
		let cameraPos = null;

		let viewMatrix = new Float32Array(16);
		let projectionMatrix = new Float32Array(16);
		let playerLightPosition = new Float32Array(3);

		let shaderProgram = this.gl.createProgram();
		this.createGlShasder(shaderProgram, shader_basic_vert, this.gl.VERTEX_SHADER);
		this.createGlShasder(shaderProgram, shader_basic_frag, this.gl.FRAGMENT_SHADER);
		this.gl.linkProgram(shaderProgram);

		if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
			throw new Error(this.gl.getProgramInfoLog(shaderProgram));
		}

		/* ====== Associating attributes to vertex shader =====*/
		let uPmatrix = this.gl.getUniformLocation(shaderProgram, 'Pmatrix');
		let uVmatrix = this.gl.getUniformLocation(shaderProgram, 'Vmatrix');
		let uPosition = this.gl.getAttribLocation(shaderProgram, 'position');
		let uNormal = this.gl.getAttribLocation(shaderProgram, 'normal');
		let uColor = this.gl.getAttribLocation(shaderProgram, 'color');
		let uPlayerLightPosition = this.gl.getUniformLocation(shaderProgram, 'playerLightPosition');
		let uTranslation = this.gl.getUniformLocation(shaderProgram, 'inTranslation');
		let uAmbientColor = this.gl.getUniformLocation(shaderProgram, 'inAmbientColor');
		let uSurfaceSensitivity = this.gl.getUniformLocation(shaderProgram, 'inSurfaceSensitivity');
		let uFrameTime = this.gl.getUniformLocation(shaderProgram, 'inFrameTime');
		let uFade = this.gl.getUniformLocation(shaderProgram, 'inFade');

		this.accumulator = 0;

		let timerUpdateTime = 0;
		let timerR = 0;
		let timerG = 0;
		let timerS = 0;
		let timerX = 0;
		let timeDelta = 1;
		let startLight = 0;

		let fadeLevel = 0;
		let endLight;
		let currentLevelId;
		let gameState = STATE_FADEOUT;
		let levelState = new Map();
	}

	createGlBuffer(items, type = this.gl.ARRAY_BUFFER) {
		let result = gl.createBuffer();
		gl.bindBuffer(type, result);
		gl.bufferData(type, items, gl.STATIC_DRAW);
		return result;
	}

	createGlShasder(program, input, type) {
		let shader = gl.createShader(type);
		gl.shaderSource(shader, input);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.log(`Shader compilation failed: ${gl.getShaderInfoLog(shader)}`);
		}
		gl.attachShader(program, shader);
	}

	interpolate(position, movementVector) {
		return position.sub(movementVector.mul(1 - settings_tps * this.accumulator));
	}

	resetCamera() {
		cameraPos = null;
	}

	setCamera(position, movementVector) {
		let currentPlayerPos = interpolate(position, movementVector);
		let desiredCameraPos = [currentPlayerPos.x, 250, -currentPlayerPos.y - 100];

		if (cameraPos === null) {
			cameraPos = desiredCameraPos;
		}

		let cameraMovementVector = Vec3.sub(desiredCameraPos, cameraPos);
		let length = Vec3.len(cameraMovementVector);
		if (length > 0) {
			cameraPos = Vec3.add(cameraPos, Vec3.mul(Vec3.normalize(cameraMovementVector), Math.pow(length, 2) * 0.001));
		}

		cameraRotX = 1 + (cameraPos[2] - desiredCameraPos[2]) / 1000;
		cameraRotY = -(cameraPos[0] - desiredCameraPos[0]) / 3000;

		playerLightPosition[0] = -currentPlayerPos.x * glScale;
		playerLightPosition[2] = currentPlayerPos.y * glScale;
	}

	bg() {
		calcViewMatrix();

		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.clearColor(0, 0, 0, 1);
		gl.clearDepth(1.0);

		gl.viewport(0.0, 0.0, canvasWidth, canvasHeight);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	timer(time) {
		let t = 1 - time / settings_timeToDie;
		let s = Math.ceil(13 - time);

		if (timerS !== s || time - timerUpdateTime > 0.2) {
			if (timerX) {
				elementT.className = '';
			}

			timerUpdateTime = time;

			let v = new Vec2(t, 1 - t);
			v = v.normalize();

			let r = round(255 * v.y);
			let g = round(255 * v.x);

			if (r !== timerR || g !== timerG) {
				timerR = r;
				timerG = g;

				let b = round(128 * v.x * v.x);
				elementT.style.color = `rgb(${r},${g},${b})`;
			}

			if (timerS !== s) {
				timerS = s;
				if (s < 4) {
					timerX = 1;
					elementT.className = 'x';
				}
				elementT.innerText = s;
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
		p._r = r = angleLerp(r !== undefined ? r : a, a, timeDelta * 12);
		return PI / 2 - r;
	}

	player(player) {
		let pos = interpolate(player.position, player.movementVector);
		calcViewMatrix();
		mat4Translate(viewMatrix, -pos.x * glScale, -3.1 * glScale, pos.y * glScale);
		mat4RotateY(viewMatrix, playerRotation(player, player.drawMovementVector));
		gl.uniformMatrix4fv(uVmatrix, false, viewMatrix);
		gl.uniform3f(uAmbientColor, 1, 1, 1);
		gl.drawElements(gl.TRIANGLES, builtSprites.player.ibCount, gl.UNSIGNED_SHORT, builtSprites.player.ibStart * 2);
	}

	ghost(ghost) {
		if (ghost.dead) {
			return false;
		}
		let pos = interpolate(ghost.position, ghost.movementVector);
		calcViewMatrix();
		mat4Translate(viewMatrix, -pos.x * glScale, -3 * glScale, pos.y * glScale);
		mat4RotateY(viewMatrix, playerRotation(ghost, ghost.movementVector));
		gl.uniformMatrix4fv(uVmatrix, false, viewMatrix);
		gl.drawElements(gl.TRIANGLES, builtSprites.ghost.ibCount, gl.UNSIGNED_SHORT, builtSprites.ghost.ibStart * 2);
		return true;
	}

	level(level, frameTime, currentTimeDelta, currentCameState) {
		gameState = currentCameState;
		timeDelta = currentTimeDelta;
		if (level.id !== currentLevelId) {
			currentLevelId = level.id;
			endLight = 0;
			levelState.clear();
		}

		fadeLevel = clamp01(fadeLevel + (gameState === STATE_FADEOUT ? -timeDelta : timeDelta));

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);
		gl.useProgram(shaderProgram);

		gl.uniform3f(uTranslation, 0, 0, 0);
		gl.uniform3f(uAmbientColor, 1, 1, 1);
		gl.uniformMatrix4fv(uPmatrix, false, projectionMatrix);
		gl.uniformMatrix4fv(uVmatrix, false, viewMatrix);
		gl.uniform3fv(uPlayerLightPosition, playerLightPosition);
		gl.uniform1f(uFrameTime, frameTime);

		gl.uniform1f(uSurfaceSensitivity, fadeLevel);
		gl.uniform1f(uFade, fadeLevel);

		gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

		gl.vertexAttribPointer(uPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(uPosition);

		gl.bindBuffer(gl.ARRAY_BUFFER, normal_buffer);
		gl.vertexAttribPointer(uNormal, 3, gl.FLOAT, true, 0, 0);
		gl.enableVertexAttribArray(uNormal);

		gl.bindBuffer(gl.ARRAY_BUFFER, colors_buffer);
		gl.vertexAttribPointer(uColor, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(uColor);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
		gl.drawElements(gl.TRIANGLES, level.ibCount, gl.UNSIGNED_SHORT, level.ibStart * 2);

		for (let d of level.doors) {
			if (!d.open) {
				gl.drawElements(gl.TRIANGLES, d.ibCount, gl.UNSIGNED_SHORT, d.ibStart * 2);
			}
		}

		gl.uniform3f(uTranslation, -level.start.x * glScale, glScale, level.start.y * glScale);

		startLight = fadeLevel * clamp01(startLight + timeDelta * (gameState === STATE_FADEIN ? -2 : 3));
		gl.uniform1f(uSurfaceSensitivity, startLight / 3);
		gl.uniform3f(uAmbientColor, 0.2 * startLight, (1 - startLight) / 4, 0.5);
		gl.drawElements(gl.TRIANGLES, builtSprites.pad.ibCount, gl.UNSIGNED_SHORT, builtSprites.pad.ibStart * 2);

		gl.uniform1f(uSurfaceSensitivity, fadeLevel * 0.4);
		gl.uniform3f(uTranslation, -level.end.x * glScale, 3 * glScale, level.end.y * glScale);
		endLight = lerp(endLight, lerp(0.7, 1, 1 - abs(cos(frameTime * 1.5))), timeDelta * 4);
		gl.uniform3f(uAmbientColor, 0, endLight / 1.3, endLight);

		let endSprite = level.last ? builtSprites.core : builtSprites.pad;
		gl.drawElements(gl.TRIANGLES, endSprite.ibCount, gl.UNSIGNED_SHORT, endSprite.ibStart * 2);

		for (let s of level.switches) {
			let { uid, pressed } = s;
			let switchState = levelState.get(uid);
			if (!switchState) {
				levelState.set(uid, (switchState = { r: 1, g: 0, p: 0 }));
			}

			let { r, g, p } = switchState;
			switchState.r = lerp(r, pressed ? 0.1 : lerp(0.7, 1, 1 - abs(cos(frameTime * 3))), timeDelta * 4);
			switchState.g = lerp(g, pressed ? 0.3 : 0, timeDelta * 5);
			switchState.p = lerp(switchState.p, pressed ? 3.8 * glScale : 0, timeDelta * 8);

			gl.uniform1f(uSurfaceSensitivity, fadeLevel * g);

			gl.uniform3f(uTranslation, -s.x * glScale, p, s.y * glScale);
			gl.uniform3f(uAmbientColor, r, g, 0);
			gl.drawElements(gl.TRIANGLES, builtSprites.pad.ibCount, gl.UNSIGNED_SHORT, builtSprites.pad.ibStart * 2);
		}

		gl.uniform1f(uSurfaceSensitivity, 0);
		gl.uniform3f(uTranslation, 0, 0, 0);
	}

	titleScreen() {

	}

	endScreen() {

	}

	calcViewMatrix(out = viewMatrix) {
		out.set(mat4Identity);
		mat4RotateX(out, cameraRotX);
		mat4RotateY(out, cameraRotY);
		mat4RotateZ(out, -PI);
		mat4Translate(out, cameraPos[0] * glScale, cameraPos[1] * glScale, cameraPos[2] * glScale);
	}

	calcProjectionMatrix() {
		let zMin = 0.1;
		let zMax = 100;
		let a = canvasWidth / canvasHeight;
		let angle = 40;
		let ang = tan((angle * 0.5 * PI) / 180); //angle*.5
		projectionMatrix[0] = 0.5 / ang;
		projectionMatrix[5] = (0.5 * a) / ang;
		projectionMatrix[10] = -(zMax + zMin) / (zMax - zMin);
		projectionMatrix[11] = -1;
		projectionMatrix[14] = (-2 * zMax * zMin) / (zMax - zMin);
	}
}