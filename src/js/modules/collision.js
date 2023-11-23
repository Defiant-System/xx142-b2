
function doesLineInterceptCircle(A, B, C, radius) {
	let dist
	let v1x = B.x - A.x
	let v1y = B.y - A.y
	let v2x = C.x - A.x
	let v2y = C.y - A.y
	// get the unit distance along the line of the closest point to
	// circle center
	let u = (v2x * v1x + v2y * v1y) / (v1y * v1y + v1x * v1x)

	// if the point is on the line segment get the distance squared
	// from that point to the circle center
	if (u >= 0 && u <= 1) {
		dist = (A.x + v1x * u - C.x) ** 2 + (A.y + v1y * u - C.y) ** 2
	} else {
		// if closest point not on the line segment
		// use the unit distance to determine which end is closest
		// and get dist square to circle
		dist = u < 0 ? (A.x - C.x) ** 2 + (A.y - C.y) ** 2 : (B.x - C.x) ** 2 + (B.y - C.y) ** 2
	}
	if (dist < radius * radius) {
		let wall = new Vec2(A.x + v1x * u, A.y + v1y * u) //position on wall
		let vec = C.sub(wall).normalize() //the vector from the wall towards the current circle position
		return wall.add(vec.mul(radius + 0.1)) //return the position that the circle should be in
	}
	return false
}
