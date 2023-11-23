
class Drawing {
	constructor(cvs) {
		this.cvs = cvs;
		this.gl = cvs[0].getContext("webgl");

		let width = cvs.parent().prop("offsetWidth"),
			height = cvs.parent().prop("offsetHeight");
		this.cvs.attr({ width, height });
	}
}
