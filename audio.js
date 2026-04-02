// PPP AUDIO PPP
let _ac = null;
const ac = () => {
	if (!_ac)
		try {
			_ac = new (window.AudioContext || window.webkitAudioContext)();
		} catch (e) {}
	return _ac;
};
export const tone = (f, d, t = "square", v = 0.06, del = 0) => {
	setTimeout(() => {
		try {
			const c = ac();
			if (!c) return;
			const o = c.createOscillator(),
				g = c.createGain();
			o.connect(g);
			g.connect(c.destination);
			o.type = t;
			o.frequency.value = f;
			g.gain.setValueAtTime(v, c.currentTime);
			g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
			o.start();
			o.stop(c.currentTime + d);
		} catch (_) {}
	}, del);
};
export const SFX = {
	paddle: () => {
		/* snappy two-tone paddle 'boop' */ tone(660, 0.03, "square", 0.06);
		tone(920, 0.045, "sine", 0.03, 28);
	},
	wall: () => tone(240, 0.025, "square", 0.035),
	score: () => {
		tone(520, 0.07);
		tone(780, 0.1, "square", 0.04, 70);
	},
	miss: () => tone(120, 0.35, "sawtooth", 0.06),
	abil: () => {
		tone(880, 0.05);
		tone(1100, 0.08, "square", 0.04, 50);
	},
	boss: () => {
		[110, 85, 65].forEach((f, i) => tone(f, 0.22, "sawtooth", 0.07, i * 160));
	},
	win: () => {
		[523, 659, 784, 1046].forEach((f, i) =>
			tone(f, 0.16, "square", 0.055, i * 100),
		);
	},
	sel: () => tone(660, 0.04, "square", 0.045),
	multi: () => {
		tone(600, 0.03, "square", 0.045);
		tone(900, 0.05, "square", 0.035, 30);
		tone(1200, 0.07, "square", 0.025, 60);
	},
	ghost: () => {
		tone(200, 0.12, "sine", 0.045);
		tone(400, 0.16, "sine", 0.03, 50);
	},
	wallp: () => {
		tone(300, 0.05, "square", 0.045);
		tone(150, 0.08, "square", 0.035, 30);
	},
	shrink: () => {
		tone(1000, 0.03, "square", 0.045);
		tone(600, 0.06, "square", 0.035, 25);
	},
	curve: () => {
		tone(400, 0.05, "sine", 0.05);
		tone(600, 0.08, "sine", 0.035, 40);
	},
	smash: () => {
		tone(150, 0.12, "sawtooth", 0.07);
		tone(80, 0.2, "sawtooth", 0.05, 40);
	},
	legendary: () => {
		[880, 1100, 1320, 1760].forEach((f, i) =>
			tone(f, 0.12, "sine", 0.05, i * 80),
		);
	},
};
