/* Consolidated single-file runtime: game-data + audio + fool + main */

// --- CONSTANTS ---
const GW = 800,
	GH = 500,
	BALL_SZ = 10,
	PAD_W = 12,
	BASE_PAD_H = 80; // slightly larger base paddles
const PX_HOME = 40,
	EX = GW - 40,
	HORIZ = 50,
	PTS_WIN = 5,
	MAX_WAVE = 12,
	TRAIL = 24,
	BASE_SPD = 340;
const MAX_BALL_SPD = 2200;
// Visual/particle caps (raised to allow richer effects)
const MAX_SPARKS = 350,
	MAX_MULTI = 14,
	MAX_BOLTS = 16;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rng = (a, b) => a + Math.random() * (b - a);
const easeOut = (t) => 1 - (1 - t) ** 3;
function simBallY(bx, by, vx, vy, tx) {
	if (vx <= 0) return by;
	let px = bx,
		py = by,
		pvx = vx,
		pvy = vy;
	for (let i = 0; i < 500; i++) {
		px += pvx * 0.008;
		py += pvy * 0.008;
		if (py < 5) {
			py = 5;
			pvy = Math.abs(pvy);
		}
		if (py > GH - 5) {
			py = GH - 5;
			pvy = -Math.abs(pvy);
		}
		if (px >= tx) return py;
	}
	return py;
}
function simYAtX(bx, by, vx, vy, tx) {
	if (!Number.isFinite(vx) || Math.abs(vx) < 1) return by;
	let px = bx,
		py = by,
		pvx = vx,
		pvy = vy;
	for (let i = 0; i < 700; i++) {
		px += pvx * 0.008;
		py += pvy * 0.008;
		if (py < 5) {
			py = 5;
			pvy = Math.abs(pvy);
		}
		if (py > GH - 5) {
			py = GH - 5;
			pvy = -Math.abs(pvy);
		}
		if ((pvx > 0 && px >= tx) || (pvx < 0 && px <= tx)) return py;
	}
	return py;
}
function pickIncomingThreatY(g, targetX, dir) {
	let bestY = null,
		bestEta = Infinity;
	const take = (bx, by, vx, vy) => {
		if (dir < 0 && vx >= -1) return;
		if (dir > 0 && vx <= 1) return;
		const eta = (targetX - bx) / Math.max(1, Math.abs(vx));
		if (eta <= 0 || eta > 3.4) return;
		const y = simYAtX(bx, by, vx, vy, targetX);
		if (eta < bestEta) {
			bestEta = eta;
			bestY = y;
		}
	};
	take(g.bx, g.by, g.bvx, g.bvy);
	for (let i = 0; i < g.multiBalls.length; i++) {
		const mb = g.multiBalls[i];
		if ((mb.zapT || 0) > 0) continue;
		take(mb.x, mb.y, mb.vx, mb.vy);
	}
	return bestY;
}

// Rally speed multiplier helper
function getRallyMul(hits) {
	if (!hits || hits <= 0) return 1;
	// Growth eases out so rallies speed up without becoming chaotic too fast.
	const extra = Math.min(0.12, Math.log2(hits + 1) * 0.012);
	return 1 + extra;
}

// --- DIFFICULTY RATINGS ---
const DIFF_RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"];
const DIFF_COLORS = {
	F: "#446644",
	"F-": "#8c8c8c",
	"�": "#e6dcff",
	E: "#558855",
	D: "#669966",
	C: "#88aa88",
	B: "#66aaff",
	A: "#5588ff",
	S: "#ffaa44",
	SS: "#ff6644",
	SSS: "#ff44ff",
};
const DIFF_GLOW = {
	F: "68,102,68",
	"F-": "140,140,140",
	"�": "230,220,255",
	E: "85,136,85",
	D: "102,153,102",
	C: "136,170,136",
	B: "102,170,255",
	A: "85,136,255",
	S: "255,170,68",
	SS: "255,102,68",
	SSS: "255,68,255",
};
// Reward tier per difficulty
const DIFF_REWARD = {
	F: "common",
	"F-": "common",
	"�": "klein",
	E: "common",
	D: "uncommon",
	C: "uncommon",
	B: "rare",
	A: "rare",
	S: "epic",
	SS: "legendary",
	SSS: "secret",
};
// Which upgrade rarities are AVAILABLE at each difficulty
const DIFF_TIERS = {
	"F-": ["common", "uncommon"],
	F: ["common", "uncommon"],
	E: ["common", "uncommon", "rare"],
	D: ["uncommon", "rare"],
	C: ["uncommon", "rare", "epic"],
	B: ["rare", "epic"],
	A: ["rare", "epic", "legendary"],
	S: ["epic", "legendary", "mythical"],
	SS: ["legendary", "mythical", "secret"],
	SSS: ["legendary", "mythical", "secret", "klein"],
	"�": ["mythical", "secret", "klein"],
};
const DIFF_BALL_MUL = {
	"F-": 1.18,
	F: 1.24,
	E: 1.32,
	D: 1.42,
	C: 1.54,
	B: 1.62,
	A: 1.78,
	S: 1.92,
	SS: 2.08,
	SSS: 2.22,
	"�": 2.38,
};
const BASE_BALL_SPEED_CAP = 760;
const FOOL_SEQUENCES = [
	"SEER",
	"CLOWN",
	"MAGICIAN",
	"FACELESS",
	"MARIONETTIST",
	"BIZARRO SORCERER",
	"SCHOLAR OF YORE",
	"MIRACLE INVOKER",
	"ATTENDANT OF MYSTERIES",
	"THE FOOL",
];
const FOOL_SEQ_KEY = [
	"seer",
	"clown",
	"magician",
	"faceless",
	"marionettist",
	"bizarro",
	"scholar",
	"miracle",
	"attendant",
	"fool",
];
const FOOL_ASCENT_LINES = {
	SEER: [
		"Sequence 9, Seer. Your future submits.",
		"I open one eye, and your path collapses.",
	],
	CLOWN: [
		"Sequence 8, Clown. Dignity is optional.",
		"Laugh now; I prefer honest fear.",
	],
	MAGICIAN: [
		"Sequence 7, Magician. Reality is stagecraft.",
		"You saw movement; I changed meaning.",
	],
	FACELESS: [
		"Sequence 6, Faceless. Names no longer bind.",
		"Find me, if certainty still comforts you.",
	],
	MARIONETTIST: [
		"Sequence 5, Marionettist. Strings descend.",
		"Gesture all you want; I own direction.",
	],
	"BIZARRO SORCERER": [
		"Sequence 4, Bizarro Sorcerer. Reason folds.",
		"Rules persist only by my permission.",
	],
	"SCHOLAR OF YORE": [
		"Sequence 3, Scholar of Yore. Time remembers me.",
		"I borrow an older victory.",
	],
	"MIRACLE INVOKER": [
		"Sequence 2, Miracle Invoker. Defeat is reversible.",
		"You scored. I disagreed.",
	],
	"ATTENDANT OF MYSTERIES": [
		"Sequence 1, Attendant. The veil obeys.",
		"I conceal mercy from the unworthy.",
	],
	"THE FOOL": [
		"Sequence 0, The Fool. Curtain absolute.",
		"A god of paradox takes the board.",
	],
};
const FOOL_START_LINES = [
	"You came looking for weak prey.",
	"Mercy was your first mistake.",
	"The stage was set before you arrived.",
	"Do not confuse silence with fear.",
	"Your confidence is already behind schedule.",
	"I watched you choose the easy door.",
	"You wanted victory, not truth.",
	"The curtain rises. Try not to blink.",
	"I am calm because your ending is known.",
	"Step closer. Regret needs distance.",
	"Welcome, challenger. Leave your pride at the edge.",
];
const FOOL_ENTRY_LINES = [
	"You crossed the threshold. Now endure what waits behind the mask.",
	"The audience is silent because your fate has already spoken.",
	"You did not arrive for victory; you arrived for judgment.",
	"Stand your ground, if you can. The throne does not move.",
	"You sought an easy hunt and found a final sequence.",
];
const FOOL_START_WARNING_LINES = [
	"You can inflict only one point of damage per wave.",
	"All your tricks are useless against me.",
	"I begin at Sequence 9. Your first point forces Sequence 8.",
];
const FOOL_MECHANIC_LINES = [
	"I grant you one point of damage per wave, no more.",
	"I erase extra scoring tricks the moment they touch me.",
	"I ascend by a sequence every time you score.",
	"Break my rhythm if you can; I built it to break you.",
];
const FOOL_DEFEAT_LINES = [
	"You were warned in plain language.",
	"You chased weakness and found judgment.",
	"Defeat suits your certainty.",
	"Your hands moved; your fate did not.",
	"Another hunter taught humility.",
	"The easy fight did not exist.",
	"You lost before first contact.",
	"Your final angle was predictable.",
	"Pride is heavy at the bottom.",
	"I did not need full power.",
	"You broke on your own momentum.",
	"The stage keeps no sympathy.",
	"Return when honesty hurts less.",
	"You mistook cruelty for strength.",
	"Your effort was real; your result was not.",
	"I accept your silence as surrender.",
	"You wanted control. You met design.",
	"This ending had your name from the start.",
	"Bow out. The audience is bored.",
	"Next time, bring resolvenot appetite.",
];
const FOOL_SCORE_PLAYER_LINES = [
	"You pierced inevitability for a second.",
	"A clean strike. Keep your pulse steady.",
	"You scored through pressure, not luck.",
	"That angle had conviction.",
	"You forced the script to blink.",
	"So you can wound divinity.",
	"Good. Make me respect your hands.",
	"You scoredand the room got colder.",
	"A single point with sovereign intent.",
	"Your will carried that exchange.",
	"You earned that point in full.",
	"Interesting. You can read the fog.",
	"That was elegant under fire.",
	"You hit like you meant history.",
	"One point. Infinite consequence.",
	"I felt that in the marrow of fate.",
	"Impressive. Do it again without fear.",
	"You sharpened yourself on my edge.",
	"That point has aura.",
	"Good strike. The throne noticed.",
];
const FOOL_SCORE_ENEMY_LINES = [
	"There. Order restored.",
	"Kneel to sequence.",
	"You moved first. I moved last.",
	"This is the weight of hierarchy.",
	"Your defense was ceremonial.",
	"You fell exactly where I placed you.",
	"A clean punishment.",
	"You are late to your own save.",
	"The board belongs to my intent.",
	"I take points, not requests.",
	"Your panic has a pattern.",
	"One more step into the fog.",
	"This is what precision feels like.",
	"I break plans without touching them.",
	"Your options are narrowing.",
	"That angle was dead before launch.",
	"Pressure makes truth visible.",
	"The stage tilts toward me.",
	"I collect errors like trophies.",
	"Another point to inevitability.",
];
const FOOL_FOOLED_WIN_LINES = [
	"You were the fool.",
	"You were playing against yourself all along.",
	"You were never worthy to change me.",
	"You touched the throne and called it victory.",
];
const FOOL_SEQ_AMBIENT = {
	seer: [
		"Every angle you seek has already failed.",
		"Prediction is mercy; I give little.",
		"Your next move arrived earlier than you.",
		"Intent is louder than action.",
		"You are transparent in motion.",
	],
	clown: [
		"Your cruelty wears a smiling mask.",
		"You laugh to hide your shaking hands.",
		"Mockery is the language of small men.",
		"Applause for effort, not result.",
		"You came to jeer; now perform.",
	],
	magician: [
		"Perception is a leash.",
		"You saw a path, not the trap.",
		"I remove certainty with one gesture.",
		"The obvious answer is usually mine.",
		"Watch closely; understand nothing.",
	],
	faceless: [
		"Strike harder; you still hit a mask.",
		"Identity is a borrowed costume.",
		"Name me, and lose me.",
		"You cannot wound what you cannot define.",
		"I have more faces than your patience.",
	],
	marionettist: [
		"Raise your hands; I already did.",
		"Resistance is choreography.",
		"Your will is thread and tension.",
		"Move as you wish; land where I choose.",
		"I pull once. You obey twice.",
	],
	bizarro: [
		"Reason is decorative here.",
		"Straight lines bend around me.",
		"You call it chaos; I call it order.",
		"Logic is a local superstition.",
		"The map is wrong on purpose.",
	],
	scholar: [
		"I cite a past where you miss.",
		"History is editable for those who qualify.",
		"Yesterday answers to my voice.",
		"Old seconds are still sharp.",
		"You are late to your own moment.",
	],
	miracle: [
		"Impossibility is only poor timing.",
		"A miracle is certainty with patience.",
		"Your point existed briefly.",
		"I revoke outcomes, not effort.",
		"Hope is a fragile witness.",
	],
	attendant: [
		"Fog is kindness to unready eyes.",
		"Mystery is a gate, not a veil.",
		"Truth arrives only when invited.",
		"I hide what would break you.",
		"Questions are safer than answers.",
	],
	fool: [
		"Kneel to the final ambiguity.",
		"I am the joke and the verdict.",
		"You sought prey and found a throne.",
		"Your courage expires before mine.",
		"The play ends where I smile.",
	],
};
const FOOL_SPECIALS = {
	seer: { name: "FUTURE FORESIGHT", dur: 2.9, cd: 11.2 },
	clown: { name: "CLOWN DERISION", dur: 1.8, cd: 11.8 },
	magician: { name: "MAGICIAN'S BLINK", dur: 1.8, cd: 10.8 },
	faceless: { name: "FACELESS SHIFT", dur: 2.4, cd: 11.1 },
	marionettist: { name: "MARIONETTIST THEATRE", dur: 5.4, cd: 12.6 },
	bizarro: { name: "BIZARRO CARNIVAL", dur: 4.2, cd: 13.1 },
	trickroom: { name: "TRICK ROOM", dur: 3.8, cd: 12.2 },
	scholar: { name: "SCHOLAR OF YORE", dur: 2.8, cd: 12.0 },
	miracle: { name: "MIRACLE INVOKER", dur: 2.4, cd: 12.3 },
	oraclebreak: { name: "FATE FRACTURE", dur: 3.2, cd: 13.2 },
	attendant: { name: "ATTENDANT OF MYSTERIES", dur: 4.2, cd: 13.6 },
	judgment: { name: "FALSE SALVATION", dur: 3.8, cd: 14.0 },
	fool: { name: "DOMAIN OF THE FOOL", dur: 4.6, cd: 14.6 },
};
const FOOL_SPECIAL_LINES = {
	seer: [
		"I saw this exchange minutes ago.",
		"Prediction is mercy, and you get none.",
		"Your next angle already failed.",
	],
	clown: [
		"You picked easy prey and still tremble.",
		"Smile wider. It helps the collapse.",
		"Your confidence is costume jewelry.",
	],
	magician: [
		"A blink rewrites your chance.",
		"You watched the trick, not the hand.",
		"Reality edits itself when I nod.",
	],
	faceless: [
		"You strike a mask and call it progress.",
		"Name me and lose me.",
		"Identity is just bait for your aim.",
	],
	marionettist: [
		"Dance. The strings are already tied.",
		"Your inputs are decorative.",
		"I pull once; you obey twice.",
	],
	bizarro: [
		"Reason has left the stage. You remain.",
		"Straight lines bend around me.",
		"Logic is only local here.",
	],
	trickroom: [
		"Left is right. Right is regret.",
		"Direction obeys me, not geometry.",
		"You move correctly and still lose.",
	],
	scholar: [
		"I cite a past where you never scored.",
		"Yesterday signs my verdict.",
		"History bends before contact.",
	],
	miracle: [
		"A miracle is my habit, not your hope.",
		"Outcomes are reversible for me.",
		"You scored briefly. I disagreed.",
	],
	oraclebreak: [
		"I fracture your certainties one future at a time.",
		"Your map dies first.",
		"Prediction shatters on entry.",
	],
	attendant: [
		"Mysteries conceal what your eyes do not deserve.",
		"Fog is kindness to the unready.",
		"Questions survive longer than you.",
	],
	judgment: [
		"Salvation is false. Collapse is honest.",
		"Mercy was never loaded.",
		"Verdict arrives before impact.",
	],
	fool: [
		"THE FOOL descends. Your role is to lose.",
		"You sought prey and met a throne.",
		"Aura is law here.",
	],
};
const TIER_NAMES = {
	common: "COMMON",
	uncommon: "UNCOMMON",
	rare: "RARE",
	epic: "EPIC",
	legendary: "LEGENDARY",
	mythical: "MYTHICAL",
	secret: "SECRET",
	klein: "ARCANA",
};
const TIER_COLORS = {
	common: "#667788",
	uncommon: "#55aa77",
	rare: "#5588ff",
	epic: "#ffaa44",
	legendary: "#ff5555",
	mythical: "#ff44ff",
	secret: "#00ffcc",
	klein: "#d8d2ff",
};
const TIER_GLOW = {
	common: "102,119,136",
	uncommon: "85,170,119",
	rare: "85,136,255",
	epic: "255,170,68",
	legendary: "255,85,85",
	mythical: "255,68,255",
	secret: "0,255,204",
	klein: "216,210,255",
};
const TIER_ICON = {
	common: "\u25C7",
	uncommon: "\u25C8",
	rare: "\u2605",
	epic: "\u2726",
	legendary: "\u2742",
	mythical: "\u2748",
	secret: "\u2756",
	klein: "\u2736",
};
const TIER_ORDER = [
	"common",
	"uncommon",
	"rare",
	"epic",
	"legendary",
	"mythical",
	"secret",
	"klein",
];

// --- PALETTES ---
const PCOL = {
	classic: { p: "#ffffff", g: "rgba(255,255,255,", t: [1, 1, 1] },
	oracle: { p: "#44ddff", g: "rgba(68,221,255,", t: [0.27, 0.87, 1] },
	paradox: { p: "#c7b3ff", g: "rgba(199,179,255,", t: [0.78, 0.7, 1] },
	inferno: { p: "#cc88ff", g: "rgba(204,136,255,", t: [0.8, 0.53, 1] },
	frost: { p: "#88ccff", g: "rgba(136,204,255,", t: [0.53, 0.8, 1] },
	storm: { p: "#ffee44", g: "rgba(255,238,68,", t: [1, 0.93, 0.27] },
	voidp: { p: "#ff44aa", g: "rgba(255,68,170,", t: [1, 0.27, 0.67] },
};

// --- PADDLES ---
const PADDLES = [
	{
		id: "classic",
		name: "STANDARD",
		hMul: 1.1,
		desc: "No special tricks. Pure pong. Slightly larger paddle.",
		abil: "NONE",
		akey: "",
		ainfo: "",
		cd: 999,
	},
	{
		id: "oracle",
		name: "ORACLE",
		hMul: 1,
		desc: "Future foresight. Briefly projects the ball path so you can read bounces before they happen.",
		abil: "FUTURE FORESIGHT",
		akey: "Q",
		ainfo: "Projected path window",
		cd: 8,
	},
	{
		id: "paradox",
		name: "PARADOX",
		hMul: 1,
		desc: "Paradox snap. Teleports the ball backward in its path, then relaunches it on a new line toward the enemy side.",
		abil: "PARADOX SNAP",
		akey: "Q",
		ainfo: "Rewind teleport + relaunch",
		cd: 9,
	},
	{
		id: "inferno",
		name: "PHANTOM",
		hMul: 0.95,
		desc: "Shadow strike. Blinks the ball forward, skipping past blockers and puppets with a speed burst.",
		abil: "SHADOW STRIKE",
		akey: "Q",
		ainfo: "Blink ball forward + speed burst",
		cd: 7,
	},
	{
		id: "frost",
		name: "GLACIER",
		hMul: 1.05,
		desc: "Absolute-zero field. Enemy half slows hard and briefly freezes enemy control.",
		abil: "ABSOLUTE ZERO",
		akey: "Q",
		ainfo: "Slow zone + brief freeze",
		cd: 8,
	},
	{
		id: "storm",
		name: "STORM",
		hMul: 0.9,
		desc: "Fires a lightning bolt from your paddle that stuns the enemy.",
		abil: "THUNDER",
		akey: "Q",
		ainfo: "Fires stun bolt instantly",
		cd: 5,
	},
	{
		id: "voidp",
		name: "VOID",
		hMul: 1,
		desc: "Warps the ball's path, curving it hard toward enemy weak spots for 3 seconds.",
		abil: "WARP FIELD",
		akey: "Q",
		ainfo: "Ball curves toward gaps 3s",
		cd: 7,
	},
];

// --- ENEMIES with difficulty --- (multiple per tier for variety)
const ENEMIES = [
	// F-tier (buffed: still easy but put up a real fight)
	{ id: "basic", name: "ROOKIE", tag: "", diff: "F", mod: (c) => { c.aiSpd *= 1.4; c.aiReact *= 0.8; } },
	{
		id: "sleepy",
		name: "DROWSY",
		tag: "zz",
		diff: "F",
		mod: (c) => {
			c.aiSpd *= 1.25;
			c.aiReact *= 0.7;
		},
	},
	// E-tier (buffed slightly)
	{
		id: "wide",
		name: "WALL",
		tag: "=",
		diff: "E",
		mod: (c) => {
			c.aiSpd *= 1.2;
			c.aiReact *= 0.75;
		},
	},
	{
		id: "stubborn",
		name: "BRICK",
		tag: "[]",
		diff: "E",
		mod: (c) => {
			c.aiSpd *= 1.15;
			c.aiReact *= 0.7;
		},
	},
	// D-tier (now includes Clown and Marionettist for early variety)
	{
		id: "fast",
		name: "SPEEDSTER",
		tag: ">>",
		diff: "D",
		mod: (c) => {
			c.aiSpd *= 1.35;
			c.aiReact *= 0.75;
		},
	},
	{
		id: "jitter",
		name: "TWITCHER",
		tag: "~~",
		diff: "D",
		mod: (c) => {
			c.aiSpd *= 1.2;
			c.aiReact *= 0.7;
			c.jitter = true;
		},
	},
	{
		id: "clown",
		name: "CLOWN",
		tag: "JOKE",
		diff: "D",
		mod: (c) => {
			c.aiSpd *= 1.18;
			c.aiReact = Math.min(c.aiReact + 0.04, 0.6);
		},
	},
	{
		id: "marionettist",
		name: "MARIONETTIST",
		tag: "STRINGS",
		diff: "D",
		mod: (c) => {
			c.aiSpd *= 1.14;
			c.aiReact = Math.min(c.aiReact + 0.05, 0.6);
		},
	},
	// C-tier (now includes Fortress and Juggernaut, nerfed to fit)
	{
		id: "tricky",
		name: "TRICKSTER",
		tag: "~",
		diff: "C",
		mod: (c) => {
			c.trickAng = true;
		},
	},
	{
		id: "mimic",
		name: "MIMIC",
		tag: "<>",
		diff: "C",
		mod: (c) => {
			c.trickAng = true;
			c.aiSpd *= 1.1;
		},
	},
	{
		id: "tank",
		name: "FORTRESS",
		tag: "##",
		diff: "C",
		mod: (c) => {
			c.aiSpd *= 0.9;
			c.aiReact = Math.min(c.aiReact + 0.04, 0.65);
		},
	},
	{
		id: "jugg",
		name: "JUGGERNAUT",
		tag: "###",
		diff: "C",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.03, 0.55);
		},
	},
	// B-tier
	{
		id: "sniper",
		name: "SNIPER",
		tag: "+",
		diff: "B",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.1, 0.85);
		},
	},
	{
		id: "hunter",
		name: "HUNTER",
		tag: ">+",
		diff: "B",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.08, 0.82);
			c.aiSpd *= 1.15;
		},
	},
	// A-tier
	{
		id: "thunder",
		name: "THUNDERLORD",
		tag: "\u26A1",
		diff: "A",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.12, 0.92);
			c.aiSpd *= 1.16;
			c.trickAng = true;
		},
	},
	// S-tier
	{
		id: "accel",
		name: "CHAOS",
		tag: "!!",
		diff: "S",
		mod: (c) => {
			c.chaos = true;
			c.aiSpd *= 1.1;
		},
	},
	{
		id: "warden",
		name: "WARDEN",
		tag: "!#",
		diff: "S",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.15, 0.97);
			c.chaos = true;
			c.trickAng = true;
		},
	},
	// SS-tier
	{
		id: "apex",
		name: "APEX",
		tag: "\u2620",
		diff: "SS",
		mod: (c) => {
			c.chaos = true;
			c.trickAng = true;
			c.aiReact = Math.min(c.aiReact + 0.2, 0.98);
			c.aiSpd *= 1.3;
		},
	},
	// SSS-tier
	{
		id: "void",
		name: "THE VOID",
		tag: "\u2588",
		diff: "SSS",
		mod: (c) => {
			c.ghost = true;
			c.chaos = true;
			c.trickAng = true;
			c.aiReact = Math.min(c.aiReact + 0.18, 0.98);
			c.aiSpd *= 1.25;
		},
	},
	// Special hidden challenger (listed below SSS, still F- rank)
	{
		id: "thefool",
		name: "THE FOOL",
		tag: "<�",
		diff: "F-",
		mod: (c) => {
			c.aiSpd = 220;
			c.aiReact = 0.18;
			c.eH = BASE_PAD_H * 0.92;
		},
	},
];

function getEnemiesForDiff(diff) {
	return ENEMIES.filter((e) => e.diff === diff);
}

// --- ENEMY ABILITIES ---
// Each ability: id, name, desc, icon, cd (cooldown), dur (active duration), minDiff (minimum rank index to appear)
const E_ABILS = {
	none: { id: "none", name: "", desc: "", icon: "", cd: 999 },
	dash: {
		id: "dash",
		name: "DASH",
		desc: "Surges to ball at 3x speed",
		icon: "\u21A0",
		cd: 4,
		dur: 0.5,
	},
	blink: {
		id: "blink",
		name: "PHASE BLINK",
		desc: "Ball and enemy paddle blink in and out of visibility",
		icon: "\u29BF",
		cd: 9,
		dur: 3.5,
	},
	lightning: {
		id: "lightning",
		name: "LIGHTNING",
		desc: "Channels, stuns ball briefly, then launches it at you",
		icon: "\u26A1",
		cd: 10,
		dur: 1.2,
	},
	thunderball: {
		id: "thunderball",
		name: "THUNDER PHANTOM",
		desc: "For a short window, enemy paddle hits launch a bouncing thunder phantom that stuns you on contact",
		icon: "\u26A1",
		cd: 8,
		dur: 2.6,
	},
	clowncurse: {
		id: "clowncurse",
		name: "CLOWN DERISION",
		desc: "Reverses your controls briefly and erupts confetti chaos",
		icon: "\u2726",
		cd: 16,
		dur: 2.8,
	},
	marionette: {
		id: "marionette",
		name: "MARIONETTE THEATRE",
		desc: "Summons two string-bound puppets that block your shots",
		icon: "\u2699",
		cd: 9.6,
		dur: 4.2,
	},
	voidpulse: {
		id: "voidpulse",
		name: "VOID PULSE",
		desc: "Reverses ball at 2x, shoves and briefly stuns player",
		icon: "\u29BF",
		cd: 9,
		dur: 0.3,
	},
	rampage: {
		id: "rampage",
		name: "RAMPAGE",
		desc: "Fires 1 enemy phantom ball that scores if it passes you",
		icon: "\u2622",
		cd: 10,
		dur: 2.5,
	},
	accel: {
		id: "accel",
		name: "OVERDRIVE",
		desc: "Ball accelerates to 1.5x speed for 1.5s",
		icon: "\u00BB",
		cd: 10,
		dur: 1.5,
	},
	clone: {
		id: "clone",
		name: "CLONE",
		desc: "Spawns a phantom copy of paddle that blocks too",
		icon: "\u2261",
		cd: 12,
		dur: 3,
	},
};

// Map enemy IDs to their ability (F/E = none)
const ENEMY_ABIL_MAP = {
	basic: "none",
	sleepy: "none",
	wide: "none",
	stubborn: "none",
	thefool: "none",
	fast: "blink",
	jitter: "blink",
	tricky: "dash",
	mimic: "dash",
	clown: "clowncurse",
	marionettist: "marionette",
	tank: "none",
	jugg: "accel",
	sniper: "dash",
	hunter: "lightning",
	thunder: "thunderball",
	accel: "clone",
	warden: "lightning",
	apex: "voidpulse",
	void: "rampage",
};

// --- AUDIO ---
let _ac = null;
const ac = () => {
	if (!_ac)
		try {
			_ac = new (window.AudioContext || window.webkitAudioContext)();
		} catch (e) {}
	return _ac;
};
const tone = (f, d, t = "square", v = 0.06, del = 0) => {
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
const SFX = {
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

const MENU_MUSIC_SRC = "8 Bit Menu - David Renda.mp3";
const MENU_MUSIC_VOL = 0.42;
const MENU_MUSIC_FADE_IN_MS = 1000;
const MENU_MUSIC_FADE_OUT_MS = 500;
let menuMusic = null;
let menuMusicFadeRaf = 0;
let menuMusicUnlocked = false;

function ensureMenuMusic() {
	if (menuMusic) return menuMusic;
	menuMusic = new Audio(MENU_MUSIC_SRC);
	menuMusic.loop = true;
	menuMusic.preload = "auto";
	menuMusic.volume = 0;
	return menuMusic;
}

function stopMenuMusicFade() {
	if (!menuMusicFadeRaf) return;
	cancelAnimationFrame(menuMusicFadeRaf);
	menuMusicFadeRaf = 0;
}

function fadeMenuMusicTo(target, durationMs) {
	const m = ensureMenuMusic();
	stopMenuMusicFade();
	const startVol = m.volume;
	const start = performance.now();
	const dur = Math.max(1, durationMs || 1);

	const tick = (now) => {
		const t = Math.min((now - start) / dur, 1);
		m.volume = startVol + (target - startVol) * t;
		if (t < 1) {
			menuMusicFadeRaf = requestAnimationFrame(tick);
			return;
		}
		menuMusicFadeRaf = 0;
		if (target <= 0.001) {
			m.volume = 0;
			m.pause();
		}
	};

	menuMusicFadeRaf = requestAnimationFrame(tick);
}

function playMenuMusicIfAllowed() {
	const m = ensureMenuMusic();
	if (!menuMusicUnlocked) return;
	const p = m.play();
	if (p && typeof p.catch === "function") p.catch(() => {});
}

function syncMenuMusicForScreen(nextScreen, prevScreen) {
	const inGameplay = nextScreen === null;
	if (inGameplay) {
		fadeMenuMusicTo(0, MENU_MUSIC_FADE_OUT_MS);
		return;
	}
	playMenuMusicIfAllowed();
	const fromMatch = prevScreen === null;
	fadeMenuMusicTo(MENU_MUSIC_VOL, fromMatch ? MENU_MUSIC_FADE_IN_MS : 350);
}

function unlockMenuMusic() {
	menuMusicUnlocked = true;
	syncMenuMusicForScreen(curScreen, null);
}

["pointerdown", "keydown", "touchstart"].forEach((evt) => {
	window.addEventListener(evt, unlockMenuMusic, { once: true });
});


function foolStageToKey(stage) {
	return (
		FOOL_SEQ_KEY[
			Math.max(0, Math.min((stage || 1) - 1, FOOL_SEQ_KEY.length - 1))
		] || "seer"
	);
}

function nextFromBag(g, bagKey, pool) {
	if (!g || !pool || !pool.length) return "";
	if (!g[bagKey] || !Array.isArray(g[bagKey]) || g[bagKey].length === 0) {
		g[bagKey] = [...pool].sort(() => Math.random() - 0.5);
	}
	return g[bagKey].pop() || pool[Math.floor(Math.random() * pool.length)] || "";
}

function nextTypeDelay(ch) {
	let add = 0.018;
	if (ch === " " || ch === "\t") add = 0.032;
	else if (ch === "," || ch === ";" || ch === ":") add = 0.1;
	else if (ch === "." || ch === "!" || ch === "?" || ch === "&") add = 0.2;
	else if (ch === "" || ch === "-") add = 0.14;
	return add;
}

function triggerFoolScoreVoice(g, isPlayerScore) {
	if (!g || g.cfg.enemy.id !== "thefool") return;
	if (g.foolScoreVoiceT > 0) return;
	if (
		g.foolAscPending ||
		g.foolAscT > 0 ||
		(g.foolSpecT > 0 && g.foolSpecTextT > 0) ||
		(g.foolDialogActive && g.foolDialogBlocking)
	)
		return;
	const line = isPlayerScore
		? nextFromBag(g, "foolScoreBagP", FOOL_SCORE_PLAYER_LINES)
		: nextFromBag(g, "foolScoreBagE", FOOL_SCORE_ENEMY_LINES);
	if (line) {
		g.foolScoreVoiceT = 4.5;
		foolSpeak(g, [line], 2.8, true, false);
	}
}

function triggerFoolScoreAscPulse(g, isPlayerScore) {
	if (!g || g.cfg.enemy.id !== "thefool") return;
	g.foolAscPulse = Math.max(g.foolAscPulse || 0, 1.15);
}

function triggerFoolSwap(g) {
	if (!g || g.cfg.enemy.id !== "thefool" || g.foolSwapTriggered) return;
	g.foolSwapTriggered = true;
	g.foolAscPending = false;
	g.foolAscPendingFrom = "";
	g.foolAscPendingTo = "";
	g.foolAscPendingSeq = "";
	g.foolAscPendingDelay = 0;
	g.foolAscT = 0;
	g.foolSpecTextT = 0;
	g.foolSpecSay = "";
	g.foolSpecSayShow = 0;
	g.foolSpecTypeT = 0;
	g.foolSidesSwapped = false;
	g.foolSwapT = 7.6;
	g.foolDistortT = Math.max(g.foolDistortT, 14);
	g.ballHideT = Math.max(g.ballHideT, 1.2);
	g.flash = 0.35;
	g.flashCol = [0.92, 0.92, 1];
	g.shake = 0.2;
	g.chromaShift = Math.max(g.chromaShift, 0.75);
	g.pScore = Math.max(0, g.winScore - 1);
	foolSpeak(g, FOOL_FOOLED_WIN_LINES, 3.5, true, true);
}

function foolSpeak(g, lines, dur = 2.6, force = false, blocking = false) {
	if (!g || !Array.isArray(lines) || !lines.length) return;
	if (!force && g.foolAscPending) return;
	if (!force && g.foolDialogActive && g.foolDialogBlocking) return;
	const raw = lines[Math.floor(Math.random() * lines.length)];
	const line = "" + raw + "";
	if (!g.foolDialogQueue) g.foolDialogQueue = [];
	if (!blocking) {
		if (
			!force &&
			(g.foolLineLockT > 0 ||
				g.foolAscPending ||
				g.foolAscT > 0 ||
				(g.foolSpecT > 0 && g.foolSpecTextT > 0) ||
				(g.foolDialogActive && g.foolDialogBlocking))
		)
			return;
		g.foolLine = line;
		g.foolLineShow = 0;
		g.foolLineTypeT = 0.02;
		g.foolLineT = dur;
		g.foolLineMax = dur;
		g.foolLineLockT = Math.max(g.foolLineLockT || 0, Math.min(2.4, dur * 0.72));
		return;
	}
	const openLine = (txt) => {
		g.foolDialogActive = true;
		g.foolDialogBlocking = true;
		g.foolDialogLine = txt;
		g.foolDialogShow = 0;
		g.foolDialogTypeT = 0.02;
		g.foolDialogPulse = 0;
		g.foolDialogFade = 0;
		g.foolDialogAutoT = 1.05;
	};
	if (g.foolDialogActive && g.foolDialogBlocking) {
		const last = g.foolDialogQueue[g.foolDialogQueue.length - 1] || "";
		if (!force && ((g.foolDialogLine || "") === line || last === line)) return;
		if (force) g.foolDialogQueue.unshift(line);
		else if (g.foolDialogQueue.length < 6) g.foolDialogQueue.push(line);
	} else {
		g.foolDialogQueue.length = 0;
		openLine(line);
	}
}

function queueFoolBlockingLines(g, lines) {
	if (!g || !Array.isArray(lines) || !lines.length) return;
	if (!g.foolSeenLines) g.foolSeenLines = Object.create(null);
	if (!g.foolRuleFlags) g.foolRuleFlags = Object.create(null);
	const seen = new Set();
	const packed = lines
		.filter(Boolean)
		.map((txt) => String(txt).trim())
		.filter((txt) => {
			const key = txt.toLowerCase();
			const isOnePointRule =
				/one\s*point|onepoint/.test(key) &&
				/wave|turn|damage|allow|grant|inflict|score|no more/.test(key);
			if (seen.has(key)) return false;
			if (g.foolSeenLines[key]) return false;
			if (isOnePointRule && g.foolRuleFlags.onePointRule) return false;
			seen.add(key);
			g.foolSeenLines[key] = 1;
			if (isOnePointRule) g.foolRuleFlags.onePointRule = 1;
			return true;
		})
		.map((txt) => "" + txt + "");
	if (!packed.length) return;
	g.foolDialogActive = true;
	g.foolDialogBlocking = true;
	g.foolDialogLine = packed[0];
	g.foolDialogShow = 0;
	g.foolDialogTypeT = 0.012;
	g.foolDialogPulse = 0;
	g.foolDialogFade = 0;
	g.foolDialogAutoT = 1.05;
	g.foolDialogQueue = [...packed.slice(1)];
}

function advanceFoolDialogue(g) {
	if (!g || !g.foolDialogActive || !g.foolDialogBlocking) return false;
	if (g.foolDialogQueue && g.foolDialogQueue.length) {
		g.foolDialogLine = g.foolDialogQueue.shift();
		g.foolDialogShow = 0;
		g.foolDialogTypeT = 0.012;
		g.foolDialogPulse = 0;
		g.foolDialogAutoT = 1.05;
	} else {
		g.foolDialogActive = false;
		g.foolDialogBlocking = false;
		g.foolDialogLine = "";
		g.foolDialogAutoT = 0;
		if (g.cfg.enemy.id === "thefool" && g.foolIntroPending) {
			g.foolIntroPending = false;
			g.foolIntroTopT = 1.25;
			g.foolPaceLockT = Math.max(g.foolPaceLockT || 0, 1.25);
		}
	}
	return true;
}

function getUnlockedFoolSpecials(g) {
	const stage = g.foolStage || 1;
	const ids = [];
	if (stage >= 1) ids.push("seer");
	if (stage >= 2) ids.push("clown");
	if (stage >= 3) ids.push("magician");
	if (stage >= 4) ids.push("faceless");
	if (stage >= 5) ids.push("marionettist");
	if (stage >= 6) {
		ids.push("bizarro");
		ids.push("trickroom");
	}
	if (stage >= 7) ids.push("scholar");
	if (stage >= 8) {
		ids.push("miracle");
		ids.push("oraclebreak");
	}
	if (stage >= 9) {
		ids.push("attendant");
		ids.push("judgment");
	}
	if (stage >= 10) {
		ids.push("fool");
	}
	return ids;
}

function pickFoolSpecial(g, ready) {
	if (!ready || !ready.length) return "";
	const weightMap = {
		marionettist: 2.5,
		trickroom: 2.25,
		clown: 1.45,
		fool: 1.3,
		oraclebreak: 1.2,
	};
	let total = 0;
	const weighted = ready.map((id) => {
		let w = weightMap[id] || 1;
		if (g && g.foolLastSpec === id) w *= 0.35;
		if ((g?.foolStage || 1) < 5 && id === "seer") w *= 0.8;
		total += w;
		return { id, w };
	});
	if (total <= 0) return ready[Math.floor(Math.random() * ready.length)] || "";
	let r = Math.random() * total;
	for (const item of weighted) {
		r -= item.w;
		if (r <= 0) return item.id;
	}
	return weighted[weighted.length - 1]?.id || ready[0] || "";
}

function startFoolSpecial(g, id) {
	const def = FOOL_SPECIALS[id];
	if (!g || !def) return;
	g.foolSpec = id;
	g.foolLastSpec = id;
	g.foolSpecT = def.dur;
	g.foolSpecCDs[id] = def.cd;
	g.foolSpecLabel = def.name;
	g.foolSpecTextT = Math.max(2.2, Math.min(3.2, def.dur + 0.8));
	const sayPool = FOOL_SPECIAL_LINES[id] || [
		"Remain still and lose with grace.",
	];
	const bagKey = "foolSpecBag_" + id;
	g.foolSpecSay = nextFromBag(g, bagKey, sayPool) || "";
	g.foolSpecSayShow = 0;
	g.foolSpecTypeT = 0.045;
	g.flash = Math.max(g.flash, 0.18);
	g.flashCol = [0.78, 0.78, 0.95];
	g.shake = Math.max(g.shake, 0.08);
	g.foolPaceLockT = Math.max(g.foolPaceLockT || 0, 1.1);
	addSparks(g, EX, g.ey, 14, 110, [0.82, 0.82, 0.95]);
	if (id === "marionettist" || id === "bizarro" || id === "fool") {
		g.foolPuppets.length = 0;
		const puppets = [];
		const lanes = id === "fool" ? 10 : id === "bizarro" ? 9 : 8;
		for (let i = 0; i < lanes; i++) {
			const ny = (GH * (i + 1)) / (lanes + 1);
			const nx = GW * 0.54 + (i % 2) * 42 + rng(-8, 8);
			puppets.push({
				x: nx,
				y: ny,
				ax: nx + rng(-22, 22),
				w: 10 + rng(0, 3),
				h: 50 + rng(-4, 12),
				a: 0.52,
				broken: false,
				fade: 1,
			});
		}
		g.foolPuppets = puppets;
	}
	if (id === "miracle" || id === "fool")
		g.foolMiracleCharges = Math.max(
			g.foolMiracleCharges || 0,
			id === "fool" ? 3 : 2,
		);
	if (id === "scholar") g.foolScholarTick = 0.35;
	if (id === "seer") g.foolSeerTick = 0.28;
	if (id === "clown") g.foolClownTick = 0.24;
	if (id === "magician") g.foolMagicianTick = 0.2;
	if (id === "faceless") g.foolFacelessTick = 0.34;
	if (id === "fool") g.foolFoolTick = 0.18;
	if (id === "attendant") g.foolConcealTick = 0.18;
	if (id === "trickroom") g.foolTrickTick = 0.2;
	if (id === "oraclebreak") g.foolOracleBreakTick = 0.2;
	if (id === "judgment") g.foolJudgmentTick = 0.24;
}

function applyFoolSequence(g, stage) {
	if (!g || g.cfg.enemy.id !== "thefool") return;
	const s = clamp(stage, 1, 10);
	g.foolTargetReact = Math.min(0.22 + s * 0.073, 0.993);
	g.foolTargetSpd = Math.min(220 + s * 32, 640);
	g.foolSeqLabel = FOOL_SEQUENCES[s - 1] || "SEER";

	g.foolSeer = s >= 1;
	g.foolClown = s >= 2;
	g.foolMagician = s >= 3;
	g.foolFaceless = s >= 4;
	g.foolMarionettist = s >= 5;
	g.foolBizarro = s >= 6;
	g.foolScholar = s >= 7;
	g.foolMiracle = s >= 8;
	g.foolAttendant = s >= 9;
	g.foolNearGod = s >= 10;

	g.eAbil = E_ABILS.none;
	g.foolFog = true;
	if (g.foolBizarro) {
		g.foolClone = true;
		g.cloneY = g.ey;
	}
	if (g.foolMiracle) {
		g.foolMiracleCharges = Math.max(g.foolMiracleCharges || 0, 1);
	}
	if (g.foolAttendant) {
		g.foolConcealTick = Math.max(g.foolConcealTick || 0, 1.2);
	}
	if (g.foolNearGod) {
		g.foolDistortT = Math.max(g.foolDistortT, 12);
		g.foolMiracleCharges = Math.max(g.foolMiracleCharges || 0, 2);
	}
}

function beginFoolAscension(g, fromLabel, toLabel, toSeq) {
	if (!g || g.cfg.enemy.id !== "thefool") return;
	g.foolSpecTextT = 0;
	g.foolSpecSay = "";
	g.foolSpecSayShow = 0;
	g.foolSpecTypeT = 0;
	const ascAnimHold = 0.24,
		ascAnimDur = 1.0,
		ascPreQuoteGap = 0.72,
		ascQuoteDur = 1.05,
		ascPostGap = 0.35;
	const ascTotal =
		ascAnimHold + ascAnimDur + ascPreQuoteGap + ascQuoteDur + ascPostGap;
	g.foolAscPulse = Math.max(g.foolAscPulse || 0, 1.4);
	g.foolAscFromLabel = fromLabel;
	g.foolAscToLabel = toLabel;
	g.foolAscLabel = g.foolAscToLabel;
	g.foolAscT = ascTotal;
	g.foolAscMax = ascTotal;
	g.foolPaceLockT = Math.max(g.foolPaceLockT || 0, ascTotal);
	g.foolAscDialog =
		"" +
		nextFromBag(
			g,
			"foolAscSeqBag_" + toSeq,
			FOOL_ASCENT_LINES[toSeq] || ["The curtain rises."],
		) +
		"";
	g.foolAscDialogShow = 0;
	g.foolAscDialogTypeT = 0.014;
	g.foolLine = "";
	g.foolLineT = 0;
	g.flash = 0.24;
	g.flashCol = [0.78, 0.78, 0.98];
	addSparks(g, EX, g.ey, 14, 120, [0.8, 0.8, 0.95]);
	g.shake = Math.max(g.shake, 0.08);
	tone(260 + (g.foolStage || 1) * 35, 0.08, "sine", 0.03);
}

function onFoolPlayerScore(g) {
	if (!g || g.cfg.enemy.id !== "thefool" || g.done) return;
	const fromStage = clamp(g.foolStage || 1, 1, 10);
	const stage = clamp(fromStage + 1, 1, 10);
	g.foolStage = stage;
	applyFoolSequence(g, stage);
	const fromSeq =
		FOOL_SEQUENCES[Math.min(fromStage - 1, FOOL_SEQUENCES.length - 1)] ||
		"SEER";
	const toSeq =
		FOOL_SEQUENCES[Math.min(stage - 1, FOOL_SEQUENCES.length - 1)] || "SEER";
	const fromNum = 10 - fromStage;
	const toNum = 10 - stage;
	const fromLabel = "SEQUENCE " + fromNum + "  " + fromSeq;
	const toLabel = "SEQUENCE " + toNum + "  " + toSeq;
	const abilityBannerActive = g.foolSpecT > 0 && g.foolSpecTextT > 0;
	if (abilityBannerActive) {
		g.foolSpecTextT = 0;
		g.foolSpecSay = "";
		g.foolSpecSayShow = 0;
		g.foolSpecTypeT = 0;
		g.foolAscPending = true;
		g.foolAscPendingFrom = fromLabel;
		g.foolAscPendingTo = toLabel;
		g.foolAscPendingSeq = toSeq;
		g.foolAscPendingDelay = 0.04;
		g.foolPaceLockT = Math.max(g.foolPaceLockT || 0, 0.35);
	} else {
		beginFoolAscension(g, fromLabel, toLabel, toSeq);
	}
}

function applyFoolGoal(g, amount) {
	if (!g || g.cfg.enemy.id !== "thefool")
		return { win: false, prevented: false };
	amount = 1;
	g.goalLockT = Math.max(g.goalLockT || 0, 0.22);
	if (g.foolPointGate) {
		g.multiBalls.length = 0;
		if (g.startPause <= 0) resetBall(g, -1);
		return { win: false, prevented: true };
	}
	g.foolPointGate = true;
	g.multiBalls.length = 0;
	g.pScore += 1;
	triggerFoolScoreAscPulse(g, true);
	onFoolPlayerScore(g);
	if (g.pScore >= g.winScore) {
		if (!g.foolSwapTriggered) {
			triggerFoolSwap(g);
			if (!g.done && g.startPause <= 0) resetBall(g, -1);
			return { win: false, prevented: true };
		}
		g.done = true;
		g.result = "win";
		return { win: true, prevented: false };
	}
	return { win: false, prevented: false };
}

window.SFX = SFX;



function getEnemyAbil(enemyId) {
	return E_ABILS[ENEMY_ABIL_MAP[enemyId] || "none"] || E_ABILS.none;
}

function getBaseBallSpeedForDiff(diff) {
	return Math.min(
		BASE_BALL_SPEED_CAP,
		Math.round(BASE_SPD * (DIFF_BALL_MUL[diff] || 1)),
	);
}

function spawnThunderPhantom(g, x, y, speed, target) {
	const ang = Math.random() * Math.PI * 2;
	let vx = Math.cos(ang) * speed;
	if (Math.abs(vx) < speed * 0.35) {
		vx = (Math.random() > 0.5 ? 1 : -1) * speed * 0.45;
	}
	g.bolts.push({
		x,
		y,
		vx,
		vy: Math.sin(ang) * speed,
		life: 4,
		trail: [],
		zig: 0.1,
		target,
		thunderBall: true,
	});
	if (g.bolts.length > MAX_BOLTS) g.bolts.splice(0, g.bolts.length - MAX_BOLTS);
}

const E_UPS = [
	{
		id: "ef",
		name: "FASTER",
		desc: "Enemy speed +20%",
		icon: "\u00BB",
		fn: (g) => {
			g.aiSpd *= 1.2;
		},
	},
	{
		id: "es",
		name: "SMARTER",
		desc: "Enemy react +15%",
		icon: "\u25C6",
		fn: (g) => {
			g.aiReact = Math.min(g.aiReact * 1.15, 0.96);
		},
	},
	{
		id: "eb",
		name: "BALL SPD+",
		desc: "Ball base +8%",
		icon: "\u25CF",
		fn: (g) => {
			g.bs *= 1.08;
		},
	},
	{
		id: "ea",
		name: "AGGRO",
		desc: "Sharper returns",
		icon: "\u2220",
		fn: (g) => {
			g.trickAng = true;
		},
	},
	{
		id: "eg",
		name: "GHOST",
		desc: "Enemy flickers invisible",
		icon: "?",
		fn: (g) => {
			g.cfg.ghost = true;
		},
	},
];

// --- UPGRADE POOL (ability-only) ---
const ALL_CARDS = [
	// COMMON
	// {
	// 	id: "common_quickhands",
	// 	name: "QUICK HANDS",
	// 	desc: "Ability cooldowns recover 12% faster",
	// 	tier: "common",
	// 	type: "ability",
	// 	fn: (s) => { s.cdMul *= 0.88; },
	// },
	// {
	// 	id: "common_longreach",
	// 	name: "LONG REACH",
	// 	desc: "Paddle height +10%",
	// 	tier: "common",
	// 	type: "ability",
	// 	fn: (s) => { s.ph = Math.min(s.ph * 1.1, BASE_PAD_H * 1.6); },
	// },
	{
		id: "common_edgework",
		name: "EDGE WORK",
		desc: "Paddle edge contacts add stronger angle kick",
		tier: "common",
		type: "ability",
		fn: (s) => {
			s.edge = true;
		},
	},
	{
		id: "velocitysurge",
		name: "VELOCITY SURGE",
		desc: "When ball exceeds 50% base speed, your paddle grows 20% and moves 25% faster",
		tier: "common",
		type: "ability",
		fn: (s) => {
			s.velocitySurge = true;
		},
	},
	{
		id: "straight_shot",
		name: "STRAIGHT SHOT",
		desc: "Return the ball straight for a 25% speed boost lasting 1 second",
		tier: "common",
		type: "ability",
		fn: (s) => { s.straightShot = true; },
	},
	// UNCOMMON
	// {
	// 	id: "bounceback",
	// 	name: "SNAPBACK",
	// 	desc: "Ball speeds up an EXTRA 5% each time it bounces off a wall",
	// 	tier: "uncommon",
	// 	type: "ability",
	// 	fn: (s) => { s.rico = true; },
	// },
	// {
	// 	id: "rally_cooldown",
	// 	name: "RALLY RHYTHM",
	// 	desc: "Every rally hit reduces ability cooldown by 0.2s",
	// 	tier: "uncommon",
	// 	type: "ability",
	// 	fn: (s) => { s.cdRally = true; },
	// },
	{
		id: "homing",
		name: "HUNTER BALL",
		desc: "Ball curves toward gaps in enemy defense",
		tier: "uncommon",
		type: "ability",
		fn: (s) => {
			s.homing = true;
		},
	},
	{
		id: "speed_burst",
		name: "ADRENALINE",
		desc: "Random chance the ball surges 35% faster for 0.22s when flying toward enemy",
		tier: "uncommon",
		type: "ability",
		fn: (s) => { s.speedBurst = true; },
	},
	{
		id: "lockdown",
		name: "LOCKDOWN",
		desc: "Enemy cannot move for 0.6s while any ability or special is active",
		tier: "uncommon",
		type: "ability",
		fn: (s) => { s.lockdown = true; },
	},
	{
		id: "phantom_thunder",
		name: "THUNDER PHANTOM",
		desc: "Every 2 rally hits, fires 3 thunder phantoms that stun enemy",
		tier: "uncommon",
		type: "ability",
		fn: (s) => { s.phantomThunder = true; },
	},
	{
		id: "phantom_slow",
		name: "TWIN GHOSTS",
		desc: "Every 2 rally hits, spawns 3 green phantoms that slow enemy",
		tier: "uncommon",
		type: "ability",
		fn: (s) => { s.phantomSlow = true; },
	},
	{
		id: "phantom_fire",
		name: "INFERNO PHANTOM",
		desc: "Every 2 rally hits, fires 3 fire phantoms that apply burn ticks",
		tier: "uncommon",
		type: "ability",
		fn: (s) => { s.phantomFire = true; },
	},
	// {
	// 	id: "reflex_slow",
	// 	name: "REFLEX SLOW",
	// 	desc: "Whenever enemy uses an ability, time slows for 1 second",
	// 	tier: "uncommon",
	// 	type: "ability",
	// 	fn: (s) => { s.reflexSlow = true; },
	// },
	// RARE
	{
		id: "gravity2",
		name: "DEAD ZONE",
		desc: "Ball is strongly pulled toward the enemy goal at all times",
		tier: "rare",
		type: "ability",
		fn: (s) => {
			s.singularity = true;
		},
	},
	{
		id: "redirect",
		name: "REDIRECT",
		desc: "After your return, the ball curves once toward the enemy goal",
		tier: "rare",
		type: "ability",
		fn: (s) => {
			s.redirect = true;
		},
	},
	{
		id: "concussion",
		name: "FREEZE",
		desc: "Each paddle hit freezes the enemy for 0.25s and slows them for 0.35s",
		tier: "rare",
		type: "ability",
		fn: (s) => {
			s.concussion = true;
		},
	},
	// {
	// 	id: "tailwind",
	// 	name: "TAILWIND",
	// 	desc: "Ball velocity +15% when flying toward enemy, normal when returning",
	// 	tier: "rare",
	// 	type: "ability",
	// 	fn: (s) => { s.tailwind = true; },
	// },
	{
		id: "delusio",
		name: "DELUSIO",
		desc: "Every hit makes the enemy lose track of the ball for 0.5 seconds",
		tier: "rare",
		type: "ability",
		fn: (s) => { s.delusio = true; },
	},
	{
		id: "mirage",
		name: "MIRAGE",
		desc: "Each hit spawns a decoy ball the enemy tracks. Vanishes at midfield, revealing the real ball",
		tier: "rare",
		type: "ability",
		fn: (s) => { s.mirage = true; },
	},
	{
		id: "storm_strike",
		name: "STORM STRIKE",
		desc: "Every 2nd hit fires a lightning bolt that stuns the enemy",
		tier: "rare",
		type: "ability",
		fn: (s) => { s.stormStrike = true; },
	},
	// {
	// 	id: "spin_drag",
	// 	name: "SPIN DRAG",
	// 	desc: "The more spin you put on a return, the slower the enemy moves (up to 10%)",
	// 	tier: "rare",
	// 	type: "ability",
	// 	fn: (s) => { s.spinDrag = true; },
	// },
	// {
	// 	id: "midline_focus",
	// 	name: "MIDLINE FOCUS",
	// 	desc: "When the ball passes midfield toward you, time slows slightly",
	// 	tier: "rare",
	// 	type: "ability",
	// 	fn: (s) => { s.midlineSlow = true; },
	// },
	// EPIC
	{
		id: "vampire",
		name: "VAMPIRE",
		desc: "Heal 1 life every time you score a goal",
		tier: "epic",
		type: "ability",
		fn: (s) => {
			s.vampire = true;
		},
	},
	{
		id: "clone",
		name: "DOPPELGANGER",
		desc: "A phantom paddle mirrors you on your side",
		tier: "epic",
		type: "ability",
		fn: (s) => {
			s.doppel = true;
		},
	},
	{
		id: "rally_decay",
		name: "ATTRITION",
		desc: "The longer the rally, the worse the enemy plays. Scales with combo count",
		tier: "epic",
		type: "ability",
		fn: (s) => { s.rallyDecay = true; },
	},
	{
		id: "oracle_eye",
		name: "ORACLE SIGHT",
		desc: "Predictive vision: reveals a projected ball path during rallies.",
		tier: "uncommon",
		type: "ability",
		fn: (s) => {
			s.oracleSight = true;
		},
	},
	// LEGENDARY
	{
		id: "multicast",
		name: "ECHO CAST",
		desc: "Your paddle ability triggers twice per use",
		tier: "legendary",
		type: "ability",
		fn: (s) => {
			s.multicast = true;
		},
	},
	{
		id: "aicap",
		name: "LIMITER",
		desc: "Enemy AI reaction capped and top speed reduced, but they can still adapt",
		tier: "legendary",
		type: "ability",
		fn: (s) => {
			s.aiCap = true;
		},
	},
	{
		id: "angel_steps",
		name: "ANGEL STEPS",
		desc: "When you'd miss, auto-teleport to save the ball. 2 uses per game.",
		tier: "rare",
		type: "ability",
		fn: (s) => { s.angelSteps = 2; },
	},
	// MYTHICAL / SECRET
	{
		id: "sec_storm",
		name: "STORM CALLER",
		desc: "Passive lightning rain: ~3 bolts/sec strike randomly near enemy paddle",
		tier: "mythical",
		type: "ability",
		fn: (s) => {
			s.stormCaller = true;
		},
	},
	{
		id: "sec_paradox_engine",
		name: "PARADOX ENGINE",
		desc: "Every 0.5s while ball flies toward enemy, its trajectory shifts randomly",
		tier: "secret",
		type: "ability",
		fn: (s) => { s.paradoxEngine = true; },
	},
	{
		id: "sec_null",
		name: "NULL",
		desc: "Disables all enemy special abilities for 40s every 20s",
		tier: "secret",
		type: "ability",
		fn: (s) => { s.nullField = true; },
	},
	{
		id: "sec_master",
		name: "MASTER OF SKILL",
		desc: "Strip ALL abilities. Ball 50% faster. Your hits TRIPLE speed. Enemy hits reset. Every rally = permanent +20% base speed.",
		tier: "mythical",
		type: "ability",
		fn: (s) => {
			s.masterSkill = true;
			s.bs *= 1.5;
			s.concussion = false;
			s.homing = false;
			s.timewarp = false;
			s.multicast = false;
			s.transcend = false;
			s.doppel = false;
			s.singularity = false;
			s.dblScore = false;
			s.vampire = false;
			s.echoHit = false;
			s.stormCaller = false;
			s.cdMul = 999;
		},
	},
];

// --- CARD SELECTION ---
// Shared weighted sampler used by both getCardsForTier and getCardsForDiff.
// pool       pre-filtered array of card definitions
// maxIdx     TIER_ORDER index of the highest allowed tier
// count      how many distinct cards to return
// topWeight  weight given to cards at the highest tier (caller tunes this)
function pickCards(pool, maxIdx, count, topWeight) {
	const weighted = [];
	pool.forEach((c) => {
		const ci = TIER_ORDER.indexOf(c.tier);
		const w = ci >= maxIdx ? topWeight : ci >= maxIdx - 1 ? 2 : 1;
		const typeMul = c.type === "ability" ? 2.2 : 0.45;
		const copies = Math.max(1, Math.round(w * typeMul));
		for (let i = 0; i < copies; i++) weighted.push(c);
	});
	const shuffled = [...weighted].sort(() => Math.random() - 0.5);
	const seen = new Set();
	const result = [];
	for (const c of shuffled) {
		if (!seen.has(c.id)) {
			seen.add(c.id);
			result.push(c);
			if (result.length >= count) break;
		}
	}
	// fill remainder from pool if needed
	if (result.length < count) {
		for (const c of [...pool].sort(() => Math.random() - 0.5)) {
			if (!seen.has(c.id)) {
				seen.add(c.id);
				result.push(c);
				if (result.length >= count) break;
			}
		}
	}
	return result;
}

// Post-wave reward: picks from all cards up to maxTier
function getCardsForTier(maxTier, count, ownedAbilityIds = []) {
	const tierIdx = TIER_ORDER.indexOf(maxTier);
	const owned = new Set(ownedAbilityIds || []);
	const pool = ALL_CARDS.filter(
		(c) =>
			c.type === "ability" &&
			TIER_ORDER.indexOf(c.tier) <= tierIdx &&
			!owned.has(c.id),
	);
	return pickCards(pool, tierIdx, count, 3);
}

// Mid-wave upgrade: picks from cards allowed at the given enemy difficulty
function getCardsForDiff(diff, count, ownedAbilityIds = []) {
	const tiers = DIFF_TIERS[diff] || ["common"];
	const maxIdx = Math.max(...tiers.map((t) => TIER_ORDER.indexOf(t)));
	const owned = new Set(ownedAbilityIds || []);
	const pool = ALL_CARDS.filter(
		(c) => c.type === "ability" && tiers.includes(c.tier) && !owned.has(c.id),
	);
	return pickCards(pool, maxIdx, count, 4);
}

function waveCfg(wv) {
	const boss = wv > 1 && wv % 3 === 0;
	const rankIdx = Math.min(Math.floor(wv / 1.5), DIFF_RANKS.length - 1);
	const diff = boss
		? DIFF_RANKS[Math.min(rankIdx + 1, DIFF_RANKS.length - 1)]
		: DIFF_RANKS[rankIdx];
	// Smooth scaling: no cliff between tiers, gradual ramp
	let aiSpd = 100 + wv * 14 + (boss ? 25 : 0);
	let aiReact = clamp(0.03 + wv * 0.02 + (boss ? 0.04 : 0), 0, 0.97);
	// High ranks still get a bump
	if (rankIdx >= 6) {
		aiSpd += 60 + (rankIdx - 6) * 40;
		aiReact = clamp(aiReact + 0.12, 0, 0.97);
	}
	const eH = BASE_PAD_H;
	const pool = getEnemiesForDiff(diff);
	const enemy =
		pool.length > 0
			? pool[Math.floor(Math.random() * pool.length)]
			: ENEMIES[0];
	const cfg = {
		wv,
		boss,
		diff,
		aiSpd,
		aiReact,
		eH,
		enemy,
		trickAng: false,
		ghost: false,
		chaos: false,
		jitter: false,
	};
	enemy.mod(cfg);
	return cfg;
}

function softenLowRankAi(cfg) {
	// no longer used but kept for dev mode compatibility
}

// --- GAME STATE ---
let curScreen = "menu",
	paused = false,
	padId = "classic",
	wave = 1,
	savedState = null,
	enemyUps = [],
	curCards = [],
	curEUp = null,
	curDiff = null,
	g = null,
	keysDown = {},
	chosenOppCfg = null;

// --- TUTORIAL SYSTEM ---
const TUT_STEPS = [
	{
		id: "move",
		title: "MOVEMENT",
		body: "Use W / S to move your paddle up and down.",
		keys: ["W", "S"],
		keyLabel: "W / S    MOVE UP & DOWN",
		highlight: "paddle",
		trigger(g, tut) { return g.startPause <= 0; },
		done(g, tut) { return Math.abs(g.py - tut.startPy) >= 40; },
	},
	{
		id: "shift",
		title: "HORIZONTAL SHIFT",
		body: "Use A / D to shift forward or back.",
		keys: ["A", "D"],
		keyLabel: "A / D    SHIFT LEFT & RIGHT",
		highlight: "paddle",
		noBlock: true,
		trigger(g, tut) { return true; },
		done(g, tut) { return Math.abs(g.px - PX_HOME) >= 18; },
	},
	{
		id: "precision",
		title: "PRECISION MODE",
		body: "Hold SPACE for slower, precise movement.",
		keys: ["SPACE"],
		keyLabel: "HOLD SPACE    HALF SPEED",
		highlight: "paddle",
		trigger(g, tut) { return tut.rallyHits >= 1; },
		done(g, tut) { return tut.spaceHeldMoving >= 0.5; },
	},
	{
		id: "spin",
		title: "SPIN",
		body: "Hit the ball while moving to add curve.",
		keys: ["W", "S"],
		keyLabel: "HIT WHILE MOVING TO CURVE",
		highlight: "ball",
		noBlock: true,
		trigger(g, tut) { return tut.rallyHits >= 2; },
		done(g, tut) { return tut.spinApplied; },
	},
	{
		id: "rally",
		title: "RALLY SPEED",
		body: "Each hit speeds up the ball. Stay sharp!",
		keys: [],
		keyLabel: "WATCH THE BALL ACCELERATE",
		highlight: "hud",
		noBlock: true,
		trigger(g, tut) { return tut.rallyHits >= 3; },
		done(g, tut) { return tut.autoTimer >= 3.0; },
		autoAdvance: true,
	},
	{
		id: "ability",
		title: "PADDLE ABILITIES",
		body: "Some paddles have abilities  press Q to activate.",
		keys: ["Q"],
		keyLabel: "Q    ACTIVATE ABILITY",
		highlight: null,
		noBlock: true,
		trigger(g, tut) { return true; },
		done(g, tut) { return tut.abilityUsed || (g && g.padId === "classic"); },
	},
	{
		id: "win",
		title: "WIN THE MATCH",
		body: "Score 5 points to defeat your opponent!",
		keys: [],
		keyLabel: "SCORE 5 POINTS TO WIN",
		highlight: null,
		noBlock: true,
		trigger(g, tut) { return true; },
		done(g, tut) { return g && g.done && g.result === "win"; },
	},
];

let tut = null;

function newTutorial() {
	return {
		active: true,
		stepIdx: 0,
		phase: "intro",   // "intro" | "enemySelect" | "wait" | "overlay" | "active" | "check" | "done"
		introAlpha: 0,
		startPy: GH / 2,
		startPx: PX_HOME,
		rallyHits: 0,
		spaceHeldMoving: 0,
		spinApplied: false,
		autoTimer: 0,
		cardPicked: false,
		overlayAlpha: 0,
		hintAlpha: 0,
		completedSteps: [],
		completeFlash: 0,
		doneOverlayT: 0,
		cardTooltip: false,
		checkTimer: 0,
		checkAlpha: 0,
		checkStepTitle: "",
		overlayShowT: 0,
		keysHeldAtOverlay: {},
		gameStarted: false,
		abilityUsed: false,
	};
}

function startTutorial(pid) {
	const usePad = pid || "classic";
	padId = usePad;
	wave = 1;
	savedState = null;
	enemyUps = [];
	tut = newTutorial();
	tut.keysHeldAtOverlay = { ...keysDown };
	showScreen(null); // show canvas for intro overlay
}

function startTutorialGame() {
	// Called after enemy select (or on loss restart)  creates the actual game
	const tip = document.getElementById("tut-opp-tip");
	if (tip) tip.remove();
	// Reset tutorial tracking state for fresh game
	tut.rallyHits = 0;
	tut.spaceHeldMoving = 0;
	tut.spinApplied = false;
	tut.autoTimer = 0;
	tut.abilityUsed = false;
	tut.stepIdx = 0;
	tut.completedSteps = [];
	tut.hintAlpha = 0;
	tut.overlayAlpha = 0;
	const usePad = padId || "classic";
	const enemy = ENEMIES.find(e => e.id === "basic") || ENEMIES[0];
	const tutCfg = {
		wv: 1,
		boss: false,
		diff: "F",
		aiSpd: 55,
		aiReact: 0.04,
		eH: BASE_PAD_H,
		enemy,
		trickAng: false,
		ghost: false,
		chaos: false,
		jitter: false,
	};
	enemy.mod(tutCfg);
	tutCfg.aiSpd = 110;
	tutCfg.aiReact = 0.06;
	chosenOppCfg = tutCfg;
	g = newGame(usePad, 1, null, [], tutCfg);
	g.winScore = PTS_WIN;
	g.bs *= 0.82;
	g.ballSpd *= 0.82;
	g.waveBaseBs = g.bs;
	g.rallyBase = g.bs;
	chosenOppCfg = null;
	tut.startPy = g.py;
	tut.startPx = g.px;
	tut.gameStarted = true;
	tut.phase = "wait";
	showScreen(null);
}

function tutStep() {
	if (!tut || !tut.active) return null;
	return TUT_STEPS[tut.stepIdx] || null;
}

function advanceTutStep() {
	if (!tut || !tut.active) return;
	const step = tutStep();
	if (step) tut.completedSteps.push(step.id);
	// Enter "check" phase  show green checkmark before moving on
	tut.checkStepTitle = step ? step.title : "";
	tut.checkTimer = 1.2; // duration of checkmark display
	tut.checkAlpha = 0;
	tut.phase = "check";
	tut.completeFlash = 0.4;
	tone(660, 0.06, "sine", 0.05);
	tone(880, 0.04, "sine", 0.04, 60);
}

function dismissTutOverlay(key) {
	if (!tut) return false;
	if (tut.overlayShowT < 0.5) return false;
	// Reject if the key was already held when overlay appeared
	if (key && tut.keysHeldAtOverlay[key]) return false;
	if (tut.phase === "intro") {
		tut.phase = "enemySelect";
		tut.overlayShowT = 0;
		tone(660, 0.03, "square", 0.035);
		showTutorialEnemySelect();
		return true;
	}
	if (tut.phase !== "overlay") return false;
	tut.phase = "active";
	tut.hintAlpha = 1;
	tut.startPy = g ? g.py : GH / 2;
	tut.startPx = g ? g.px : PX_HOME;
	tut.spaceHeldMoving = 0;
	tut.autoTimer = 0;
	tut.overlayShowT = 0;
	tone(660, 0.03, "square", 0.035);
	return true;
}

function skipTutorial() {
	if (!tut || !tut.active) return;
	finishTutorial();
}

function finishTutorial() {
	if (!tut) return;
	tut.active = false;
	tut.doneOverlayT = 0;
	_tutorialDone = true;
	const tip = document.getElementById("tut-card-tip");
	if (tip) tip.remove();
	const oppTip = document.getElementById("tut-opp-tip");
	if (oppTip) oppTip.remove();
	const tutSkip = document.getElementById("tut-skip-btn");
	if (tutSkip) tutSkip.remove();
	tut = null;
	// Route to real opponent select for the actual game
	wave = 1;
	savedState = null;
	enemyUps = [];
	showOpponentSelect();
}

function showTutorialEnemySelect() {
	// Show the opponent select screen with a single easy enemy + tutorial tooltip
	$("opp-wave-num").textContent = 1;
	const wb = $("opp-enemy-warn");
	wb.innerHTML = "";

	const enemy = ENEMIES.find(e => e.id === "basic") || ENEMIES[0];
	const cfg = {
		wv: 1, boss: false, diff: "F", aiSpd: 110, aiReact: 0.06,
		eH: BASE_PAD_H, enemy,
		trickAng: false, ghost: false, chaos: false, jitter: false,
	};
	enemy.mod(cfg);
	cfg.aiSpd = 110;
	cfg.aiReact = 0.06;
	const dc = DIFF_COLORS[cfg.diff] || "#fff";
	const dg = DIFF_GLOW[cfg.diff] || "255,255,255";

	const grid = $("opp-grid");
	grid.innerHTML = "";

	const d = document.createElement("div");
	d.className = "opp-card card-enter";
	d.style.setProperty("--dc", dc);
	d.style.setProperty("--i", 0);

	let html = `<div style="font-size:9px;letter-spacing:4px;color:#8f8;margin-bottom:8px;font-weight:700;">TUTORIAL</div>`;
	html += `<div class="opp-diff" style="color:${dc}">${cfg.diff}</div>`;
	html += `<div class="opp-name">${cfg.enemy.name}</div>`;
	html += `<div class="opp-tag">${cfg.enemy.tag || "\u00A0"}</div>`;

	const spdR = Math.min(Math.round(cfg.aiSpd / 80), 9);
	const iqR = Math.min(Math.round(cfg.aiReact * 10), 9);
	const szR = Math.min(Math.round(cfg.eH / 20), 9);
	html += `<div class="opp-stats"><div class="opp-stat">SPD ${spdR}</div><div class="opp-stat">IQ ${iqR}</div><div class="opp-stat">SZ ${szR}</div></div>`;
	html += `<div class="opp-fight">FIGHT</div>`;

	d.innerHTML = html;
	d.onmouseenter = () => {
		d.style.borderColor = dc;
		d.style.boxShadow = `0 0 30px rgba(${dg},.16),0 14px 40px rgba(0,0,0,.5),inset 0 0 20px rgba(${dg},.04)`;
	};
	d.onmouseleave = () => {
		d.style.borderColor = "";
		d.style.boxShadow = "";
	};
	d.onclick = () => {
		SFX.sel();
		startTutorialGame();
	};
	grid.appendChild(d);

	// Add tutorial tooltip below the card
	const tip = document.createElement("div");
	tip.id = "tut-opp-tip";
	tip.style.cssText = "text-align:center;color:#8f8;font-size:13px;letter-spacing:2px;margin-top:18px;font-family:inherit;animation:pulse 1.5s ease-in-out infinite;";
	tip.textContent = "\u25B2  SELECT YOUR OPPONENT TO BEGIN  \u25B2";
	grid.parentNode.appendChild(tip);

	// Add skip tutorial button on enemy select
	const skipBtn = document.createElement("div");
	skipBtn.id = "tut-skip-btn";
	skipBtn.style.cssText = "text-align:center;color:#aab;font-size:12px;letter-spacing:4px;margin-top:14px;cursor:pointer;padding:6px 18px;border:1px solid #444;border-radius:3px;display:inline-block;transition:all 0.2s;";
	skipBtn.textContent = "[ESC] SKIP TUTORIAL";
	skipBtn.onmouseenter = () => { skipBtn.style.color = "#fff"; skipBtn.style.borderColor = "#888"; };
	skipBtn.onmouseleave = () => { skipBtn.style.color = "#aab"; skipBtn.style.borderColor = "#444"; };
	skipBtn.onclick = () => { SFX.sel(); skipTutorial(); };
	grid.parentNode.appendChild(skipBtn);

	showScreen("opp-screen");
	initCardPhysics(grid);
}

function updateTutorial(dt) {
	if (!tut || !tut.active) return;

	// Enemy select and intro phases don't need a game
	if (tut.phase === "enemySelect") return;
	if (tut.phase === "intro") {
		tut.introAlpha = Math.min(1, tut.introAlpha + dt * 5);
		tut.overlayShowT += dt;
		return;
	}

	if (!g) return;
	const step = tutStep();
	if (!step) return;

	if (tut.completeFlash > 0) tut.completeFlash -= dt * 2;

	// Overlay phase  fade in, physics paused
	if (tut.phase === "overlay") {
		tut.overlayAlpha = Math.min(1, tut.overlayAlpha + dt * 5);
		tut.overlayShowT += dt;
		return;
	}

	// Check phase  show green checkmark, then advance to next step
	if (tut.phase === "check") {
		tut.checkAlpha = Math.min(1, tut.checkAlpha + dt * 6);
		tut.checkTimer -= dt;
		if (tut.checkTimer <= 0) {
			// Actually advance to next step
			tut.autoTimer = 0;
			tut.hintAlpha = 0;
			tut.stepIdx++;
			if (tut.stepIdx >= TUT_STEPS.length) {
				finishTutorial();
				return;
			}
			tut.phase = "wait";
			tut.overlayAlpha = 0;
			tut.startPy = g ? g.py : GH / 2;
			tut.startPx = g ? g.px : PX_HOME;
			tut.spaceHeldMoving = 0;
			tut.spinApplied = false;
		}
		return;
	}

	// Wait phase  silently wait for trigger, physics run
	if (tut.phase === "wait") return;

	// Active phase  hint shown, check done condition
	if (tut.phase === "active") {
		if (keysDown[" "] && (keysDown["w"] || keysDown["s"] || keysDown["arrowup"] || keysDown["arrowdown"])) {
			tut.spaceHeldMoving += dt;
		}
		if (step.autoAdvance) tut.autoTimer += dt;
		tut.hintAlpha = Math.min(1, tut.hintAlpha + dt * 4);

		if (step.done(g, tut)) {
			advanceTutStep();
			return;
		}
	}
}

function checkTutTrigger(dt) {
	if (!tut || !tut.active || !g) return;
	const step = tutStep();
	if (!step) return;
	if (tut.phase !== "wait") return;

	if (step.trigger(g, tut)) {
		if (step.noBlock) {
			// Skip overlay, go straight to active hint
			tut.phase = "active";
			tut.hintAlpha = 0;
			tut.startPy = g.py;
			tut.startPx = g.px;
		} else {
			// Don't show blocking overlay if ball is near/approaching player paddle
			if (g.bx < 250 && g.bvx < 0) return;
			// Show blocking overlay, pause physics
			tut.phase = "overlay";
			tut.overlayAlpha = 0;
			tut.overlayShowT = 0;
			// Snapshot currently held keys so we can require a fresh press to dismiss
			tut.keysHeldAtOverlay = { ...keysDown };
		}
	}
}

// Trim sparks to avoid runaway CPU usage
function addSparks(g, x, y, n = 8, sp = 120, col = null) {
	for (let i = 0; i < n; i++) {
		const a = Math.random() * Math.PI * 2,
			s = 30 + Math.random() * sp;
		g.sparks.push({
			x,
			y,
			vx: Math.cos(a) * s,
			vy: Math.sin(a) * s,
			life: 0.15 + Math.random() * 0.3,
			max: 0.45,
			col,
		});
	}
	if (g.sparks.length > MAX_SPARKS)
		g.sparks.splice(0, g.sparks.length - MAX_SPARKS);
}

function applyRallyHitSpeed(g, mul = getRallyMul((g.rallyHits || 0) + 1)) {
	g.rallyHits++;
	const baseSpd = g.waveBaseBs || g.bs;
	const softcapThresh = baseSpd * 4; // 300% increase = 4x base
	if (g.rallyBase >= softcapThresh) {
		// Past softcap: additive increase only (small flat amount)
		const additive = baseSpd * 0.02; // +2% of base per hit
		g.rallyBase += additive;
		g.ballSpd += additive;
	} else {
		g.rallyBase *= mul;
		g.ballSpd *= mul;
		// Clamp to softcap boundary so we don't overshoot
		if (g.rallyBase > softcapThresh) {
			g.ballSpd = g.ballSpd / g.rallyBase * softcapThresh;
			g.rallyBase = softcapThresh;
		}
	}
	if (g.cdRally) g.abCD = Math.max(0, g.abCD - 0.2);
}

function getServePauseForSpeed(spd) {
	const minPause = 1.0,
		maxPause = 1.3;
	const norm = clamp(
		((spd || BASE_SPD) - BASE_SPD) /
			Math.max(1, BASE_BALL_SPEED_CAP - BASE_SPD),
		0,
		1,
	);
	return lerp(minPause, maxPause, norm);
}

function getEnemyOpenLaneY(g) {
	const topOpen = Math.max(0, g.ey - g.eH / 2);
	const botOpen = Math.max(0, GH - (g.ey + g.eH / 2));
	if (topOpen >= botOpen) return clamp(12 + topOpen * 0.55, 14, GH - 14);
	return clamp(GH - (12 + botOpen * 0.55), 14, GH - 14);
}

function resetBall(g, dir) {
	// Carry 15% of last rally's speed gain into next point
	const baseSpd = g.waveBaseBs || g.bs;
	const carrySpd = baseSpd + (g.rallyBase - baseSpd) * 0.15;
	g.rallyBase = carrySpd;
	g.rallyHits = 0;
	g._playerHits = 0;
	g.ballSpd = carrySpd;
	g.bx = GW / 2;
	g.by = GH / 2 + rng(-60, 60);
	g.bvx = 0;
	g.bvy = 0;
	g.pendingDir = dir;
	g.pendingVy = rng(-160, 160);
	const servePause = getServePauseForSpeed(g.rallyBase);
	g.startPause = servePause;
	g.startPauseMax = servePause;
	g.shUsed = false;
	g.combo = 0;
	g.trail = [];
	g.spin = 0;
	g.curveNext = false;
	g.smashNext = false;
	g._pierce = false;
	g.phaseT = 0;
	g.ghostBall = false;
	g.ghostT = 0;
	g.pStunT = 0;
	g.doppelBuf = [];
	g.doppelY = g.py;

	// The very best enemies should wear down over the course of a long
	// exchange. after each rally we nudge their reaction speed and paddle
	// velocity slightly toward easier values, giving a skilled player a
	// fighting chance if they can keep the ball alive. we only apply the
	// effect when the configured difficulty is S or harder so lowtier AI
	// isn't affected.
	const diffIdxRaw = DIFF_RANKS.indexOf(g.cfg.diff);
	const diffIdx = diffIdxRaw >= 0 ? diffIdxRaw : DIFF_RANKS.length - 1;
	const maxIdx = DIFF_RANKS.length - 1;
	const sIdx = DIFF_RANKS.indexOf("S");
	if (diffIdx < sIdx) return;
	// base decay per rank: best (SSS) 0.985, each step down subtracts 0.005
	const baseDecay = 0.985 - (maxIdx - diffIdx) * 0.005;
	const aiDecay = baseDecay;
	g.aiSpd = Math.max(80, g.aiSpd * aiDecay);
	g.aiReact = Math.max(0.02, g.aiReact * aiDecay);
}

function newGame(pid, wv, sv, eUps, oppCfg) {
	const pad = PADDLES.find((p) => p.id === pid);
	const cfg = oppCfg || waveCfg(wv);
	const ownsAngelSteps =
		(sv?.ownedAbilityIds || []).includes("angel_steps") || (sv?.angelSteps ?? 0) > 0;
	const am = sv?.aiMod ?? 1;
	const rankSpdMul = getBaseBallSpeedForDiff(cfg.diff) / BASE_SPD;
	const bs = (sv?.bs ?? BASE_SPD) * rankSpdMul;
	const rallyBase = sv?.rallyBase ?? bs;
	const initServePause = getServePauseForSpeed(rallyBase);
	const _iDir = Math.random() > 0.5 ? 1 : -1,
		_iVy = rng(-160, 160);
	const ng = {
		padId: pid,
		pad,
		cfg,
		t: 0,
		bx: GW / 2,
		by: GH / 2 + rng(-40, 40),
		bvx: 0,
		bvy: 0,
		pendingDir: _iDir,
		pendingVy: _iVy,
		startPause: initServePause,
		startPauseMax: initServePause,
		bs,
		waveBaseBs: bs,
		rallyBase,
		ballSpd: rallyBase,
		rallyHits: 0,
		trail: [],
		px: PX_HOME,
		py: GH / 2,
		ph: sv?.ph ?? BASE_PAD_H * pad.hMul,
		pSpd: sv?.pSpd ?? 480,
		horizMul: sv?.horizMul ?? 1,
		ey: GH / 2,
		eH: cfg.eH,
		eHBase: cfg.eH,
		aiSpd: cfg.aiSpd * am,
		aiMod: am,
		aiReact: cfg.aiReact,
		pScore: 0,
		eScore: 0,
		lives: sv?.lives ?? 3,
		shields: sv?.shields ?? 0,
		shUsed: false,
		cdMul: sv?.cdMul ?? 1,
		cdRally: sv?.cdRally ?? false,
		midlineSlow: sv?.midlineSlow ?? false,
		tailwind: sv?.tailwind ?? false,
		reflexSlow: sv?.reflexSlow ?? false,
		redirect: sv?.redirect ?? false,
		velocitySurge: sv?.velocitySurge ?? false,
		concussion: sv?.concussion ?? false,
		// Velocity surge runtime
		_surgeActive: false,
		// Concussion runtime
		concussStunT: 0,
		concussSlowT: 0,
		// Redirect runtime
		_redirectUsed: false,
		// Reflex slow runtime
		_reflexSlowT: 0,
		// Center combo system
		centerCombo: 0,
		centerComboFlash: 0,
		centerComboPop: "",
		centerComboPopT: 0,
		// Abilities (passive)
		edge: sv?.edge ?? false,
		rico: sv?.rico ?? false,
		dblScore: false,
		vampire: sv?.vampire ?? false,
		oracleSight: sv?.oracleSight ?? false,
		perfectPilot: sv?.perfectPilot ?? false,
		homing: sv?.homing ?? false,
		timewarp: sv?.timewarp ?? false,
		multicast: sv?.multicast ?? false,
		transcend: false,
		doppel: sv?.doppel ?? false,
		singularity: sv?.singularity ?? false,
		// Secret abilities
		aiCap: sv?.aiCap ?? false,
		triScore: false,
		echoHit: false,
		// New secret combat abilities
		stormCaller: sv?.stormCaller ?? false,
		phantomStrike: false,
		mirrorMatch: false,
		// New abilities
		lockdown: sv?.lockdown ?? false,
		phantomThunder: sv?.phantomThunder ?? false,
		phantomSlow: sv?.phantomSlow ?? false,
		phantomFire: sv?.phantomFire ?? false,
		stormStrike: sv?.stormStrike ?? false,
		_stormStrikeCount: 0,
		angelSteps: ownsAngelSteps ? Math.max(2, sv?.angelSteps ?? 0) : 0,
		paradoxEngine: sv?.paradoxEngine ?? false,
		_paradoxTick: 0,
		nullField: sv?.nullField ?? false,
		_nullActiveT: 40,
		_nullCooldownT: 0,
		// New abilities
		delusio: sv?.delusio ?? false,
		_delusioT: 0,
		speedBurst: sv?.speedBurst ?? false,
		_speedBurstT: 0,
		rallyDecay: sv?.rallyDecay ?? false,
		spinDrag: sv?.spinDrag ?? false,
		_spinDragMul: 1,
		straightShot: sv?.straightShot ?? false,
		_straightShotT: 0,
		mirage: sv?.mirage ?? false,
		_mirageDecoy: null,
		// Lockdown runtime
		lockdownFreezeT: 0,
		// Fire phantom burn tracking
		_burnT: 0,
		_burnTickT: 0,
		// Angel Steps flash
		_angelFlashT: 0,
		mirrorBuf: [],
		doppelBuf: [],
		doppelY: GH / 2,
		// Active state
		abCD: 0,
		curveNext: false,
		multiBalls: [],
		ghostBall: false,
		ghostT: 0,
		_pierce: false,
		placedWall: null,
		wallT: 0,
		shrinkT: 0,
		smashNext: false,
		freezeT: 0,
		// New paddle ability states
		foresightT: 0, // Oracle: future foresight window
		phaseNext: false, // Phantom: next hit pierces
		phaseT: 0,
		blizzardT: 0, // Frost: freeze everything
		thunderNext: false, // Storm: next hit spawns lightning
		bolts: [], // Storm: active lightning bolt projectiles
		gravWell: null,
		gravWellT: 0, // Void: gravity well position + timer
		warpFieldT: 0, // Void: warp field duration
		// Master of Skill state
		masterSkill: sv?.masterSkill ?? false,
		siphon: sv?.siphon ?? false,
		_masterBaseSpd: 0, // stores speed before player hit boost
		_masterHitBoosted: false, // whether player hit boost is active
		shake: 0,
		shX: 0,
		shY: 0,
		shPhaseX: rng(0, Math.PI * 2),
		shPhaseY: rng(0, Math.PI * 2),
		flash: 0,
		flashCol: [1, 1, 1],
		ghostA: 1,
		combo: 0,
		sparks: [],
		hitFlash: 0,
		scoreFlash: 0,
		scoreFlashSide: 0,
		chromaShift: 0,
		devUnlose: sv?.devUnlose ?? false,
		done: false,
		result: null,
		doneT: 0,
		kleinEndActive: false,
		kleinEndPhase: 0,
		kleinEndT: 0,
		kleinEndReady: false,
		kleinEndQuote: "",
		trickAng: cfg.trickAng,
		chaos: cfg.chaos,
		jitter: cfg.jitter || false,
		// Enemy ability state
		eAbil: getEnemyAbil(cfg.enemy.id),
		eAbilCD: 2,
		eAbilActive: 0,
		eAbilPhase: "idle",
		_eAbilFlash: 0,
		_eAbilFlashName: "",
		// Warden thunderstorm special
		wStormActive: false,
		wStormT: 0,
		wStormNextBolt: 0,
		wStormCD: 0,
		// Lightning-specific: channel time, stun time, bolt coords
		ltChannel: 0,
		ltStun: 0,
		ltBoltX: 0,
		ltBoltY: 0,
		ltLaunchVx: 0,
		ltLaunchVy: 0,
		ltBolts: [],
		// Bulk-specific
		bulkT: 0,
		bulkScale: 1,
		// Pull-specific
		pullT: 0,
		// Timestop-specific
		tsT: 0,
		tsBallVx: 0,
		tsBallVy: 0,
		// Voidpulse-specific
		vpT: 0,
		vpX: 0,
		vpY: 0,
		pStunT: 0,
		// Blink flash
		blinkFlash: 0,
		// Spin return
		spinNext: false,
		spinCurveT: 0,
		// Continuous spin (paddle-imparted curve)
		spin: 0,
		spinVisAngle: 0,
		prevEy: GH / 2,
		eVelY: 0,
		// Dash
		dashT: 0,
		dashSpd: 0,
		// Blink
		blinkT: 0,
		overdriveT: 0,
		cloneT: 0,
		cloneY: 0,
		// Paddle velocity tracking (for momentum transfer)
		prevPy: GH / 2,
		pVelY: 0,
		// AI target caching (anti-jitter)
		aiTgt: GH / 2,
		aiTgtTimer: 0,
		aiRandOff: 0,
		aiBallDir: 0,
		// Visual enhancement: floating score pop-ups and ability flashes
		scorePops: [],
		abilFlash: 0,
		eAbilAlertT: 0,
		eAbilAlertName: "",
		eAbilAlertCol: [1,0.3,0.3],
		lastCombo: 0,
		ownedAbilityIds: new Set(sv?.ownedAbilityIds || []),
		rankSpdMul,
		goalLockT: 0,
		winScore: PTS_WIN,
		foolStage: 0,
		foolClone: false,
		ballHideT: 0,
		ctrlInvertT: 0,
		foolFog: false,
		foolDistortT: 0,
		foolNearGod: false,
		foolTargetReact: 0,
		foolTargetSpd: 0,
		foolAscPulse: 0,
		foolLine: "",
		foolLineShow: 0,
		foolLineTypeT: 0,
		foolLineT: 0,
		foolLineMax: 0,
		foolSeer: false,
		foolClown: false,
		foolMagician: false,
		foolFaceless: false,
		foolMarionettist: false,
		foolBizarro: false,
		foolScholar: false,
		foolMiracle: false,
		foolAttendant: false,
		foolPuppetTick: 0,
		foolConcealTick: 0,
		foolScholarTick: 0,
		foolMiracleCharges: 0,
		foolAmbientTick: 3.5,
		foolSpec: "",
		foolSpecT: 0,
		foolSpecLabel: "",
		foolSpecTextT: 0,
		foolPuppets: [],
		foolSpecCDs: {},
		foolSpecGapT: 0,
		foolSpecSay: "",
		foolSpecSayShow: 0,
		foolSpecTypeT: 0,
		foolTrickTick: 0,
		foolOracleBreakTick: 0,
		foolJudgmentTick: 0,
		foolSeerTick: 0,
		foolClownTick: 0,
		foolMagicianTick: 0,
		foolFacelessTick: 0,
		foolFoolTick: 0,
		foolDialogActive: false,
		foolDialogBlocking: false,
		foolDialogQueue: [],
		foolDialogLine: "",
		foolDialogShow: 0,
		foolDialogTypeT: 0,
		foolDialogPulse: 0,
		foolDialogFade: 0,
		foolDialogAutoT: 0,
		foolSeenLines: Object.create(null),
		foolRuleFlags: Object.create(null),
		foolLineLockT: 0,
		foolScoreVoiceT: 0,
		foolQuoteLockT: 0,
		foolLastSpec: "",
		foolStartAmbientBag: [],
		foolIntroPending: false,
		foolIntroTopT: 0,
		foolScoreBagP: [],
		foolScoreBagE: [],
		foolSwapTriggered: false,
		foolSidesSwapped: false,
		foolSwapT: 0,
		foolLoseLine: "",
		foolPointGate: false,
		foolAscLabel: "",
		foolAscFromLabel: "",
		foolAscToLabel: "",
		foolAscT: 0,
		foolAscMax: 0,
		foolAscDialog: "",
		foolAscDialogShow: 0,
		foolAscDialogTypeT: 0,
		foolAscPending: false,
		foolAscPendingFrom: "",
		foolAscPendingTo: "",
		foolAscPendingSeq: "",
		foolAscPendingDelay: 0,
		foolPaceLockT: 0,
	};
	if (cfg.enemy.id === "thefool") {
		ng.pScore = -5;
		ng.eScore = 0;
		ng.winScore = PTS_WIN;
		ng.foolStage = 1;
		ng.aiSpd = Math.max(ng.aiSpd, 220);
		ng.aiReact = Math.max(ng.aiReact, 0.18);
		ng.foolTargetSpd = ng.aiSpd;
		ng.foolTargetReact = ng.aiReact;
		ng.foolStartAmbientBag = [...FOOL_START_LINES].sort(
			() => Math.random() - 0.5,
		);
		applyFoolSequence(ng, 1);
		const enteringLine =
			nextFromBag(ng, "foolStartEntryBag", FOOL_ENTRY_LINES) ||
			"You sought an easy hunt and found a final sequence.";
		queueFoolBlockingLines(ng, [FOOL_MECHANIC_LINES[0], enteringLine]);
		ng.foolIntroPending = true;
	}
	// Apply AI cap (secret)
	if (ng.aiCap) {
		ng.aiReact = Math.min(ng.aiReact, 0.72);
		ng.aiSpd *= 0.9;
	}
	if (eUps) for (const eu of eUps) eu.fn(ng);
	if (ng.aiCap) {
		ng.aiReact = Math.min(ng.aiReact, 0.72);
		ng.aiSpd = Math.min(ng.aiSpd, 380);
	}
	ng.waveBaseBs = ng.bs;
	return ng;
}

function saveGame(g) {
	const waveBase = g.waveBaseBs || g.bs;
	return {
		bs: waveBase / (g.rankSpdMul || 1),
		rallyBase: waveBase / (g.rankSpdMul || 1),
		ph: g.ph,
		pSpd: g.pSpd,
		cdMul: g.cdMul,
		cdRally: g.cdRally,
		midlineSlow: g.midlineSlow,
		tailwind: g.tailwind,
		reflexSlow: g.reflexSlow,
		redirect: g.redirect,
		velocitySurge: g.velocitySurge,
		concussion: g.concussion,
		edge: g.edge,
		rico: g.rico,
		shields: g.shields,
		lives: g.lives,
		aiMod: g.aiMod,
		horizMul: g.horizMul,
		dblScore: g.dblScore,
		vampire: g.vampire,
		oracleSight: g.oracleSight,
		perfectPilot: g.perfectPilot,
		homing: g.homing,
		timewarp: g.timewarp,
		multicast: g.multicast,
		transcend: g.transcend,
		doppel: g.doppel,
		singularity: g.singularity,
		aiCap: g.aiCap,
		triScore: g.triScore,
		echoHit: g.echoHit,
		stormCaller: g.stormCaller,
		phantomStrike: g.phantomStrike,
		mirrorMatch: g.mirrorMatch,
		lockdown: g.lockdown,
		phantomThunder: g.phantomThunder,
		phantomSlow: g.phantomSlow,
		phantomFire: g.phantomFire,
		stormStrike: g.stormStrike,
		angelSteps: g.angelSteps,
		paradoxEngine: g.paradoxEngine,
		nullField: g.nullField,
		delusio: g.delusio,
		speedBurst: g.speedBurst,
		rallyDecay: g.rallyDecay,
		spinDrag: g.spinDrag,
		straightShot: g.straightShot,
		mirage: g.mirage,
		masterSkill: g.masterSkill,
		siphon: g.siphon,
		ownedAbilityIds: Array.from(g.ownedAbilityIds || []),
	};
}

function isKleinLossState(g) {
	if (!g || g.result !== "lose") return false;
	return (
		g.cfg?.diff === "�" || (g.cfg?.enemy?.id === "thefool" && g.foolNearGod)
	);
}

// --- UPDATE ---
function update(dt) {
	// Tutorial pre-game phases (intro, enemySelect)  tick even without g
	if (!g && tut && tut.active) {
		updateTutorial(dt);
		return;
	}
	if (!g) return;
	// Tutorial: done overlay countdown  just clean up tut reference
	if (tut && !tut.active && tut.doneOverlayT > 0) {
		tut.doneOverlayT -= dt;
		if (tut.doneOverlayT <= 0) {
			tut = null;
		}
		return;
	}
	if (g.done) {
		g.doneT += dt;
		if (isKleinLossState(g)) {
			if (!g.kleinEndActive) {
				g.kleinEndActive = true;
				g.kleinEndPhase = 0;
				g.kleinEndT = 0;
				g.kleinEndReady = false;
				g.kleinEndQuote =
					g.foolLoseLine && g.foolLoseLine.trim()
						? g.foolLoseLine
						: "The Arcana closes over you.";
			}
			if (!g.kleinEndReady) {
				g.kleinEndT += dt;
				if (g.kleinEndPhase === 0 && g.kleinEndT >= 0.78) {
					g.kleinEndPhase = 1;
					g.kleinEndT = 0;
				} else if (g.kleinEndPhase === 1 && g.kleinEndT >= 2.25) {
					g.kleinEndPhase = 2;
					g.kleinEndT = 0;
				} else if (g.kleinEndPhase === 2 && g.kleinEndT >= 0.74) {
					g.kleinEndReady = true;
				}
			} else {
				handleContinue();
			}
		}
		return;
	}
	// Tutorial: block physics during intro/overlay/enemySelect, tick check phase
	if (tut && tut.active) {
		if (tut.phase === "intro" || tut.phase === "enemySelect") {
			updateTutorial(dt);
			return;
		}
		if (tut.phase === "check") {
			updateTutorial(dt);
			// Don't return  let physics keep running during checkmark
		}
		checkTutTrigger(dt);
		if (tut.phase === "overlay") {
			updateTutorial(dt);
			return;
		}
	}
	g.t += dt;
	if (g.goalLockT > 0) g.goalLockT -= dt;
	if (g.abCD > 0) g.abCD -= dt;
	if (g.shake > 0) {
		g.shake -= dt;
		const amp = g.shake * 20;
		const tx = Math.sin(g.t * 42 + (g.shPhaseX || 0)) * amp;
		const ty = Math.cos(g.t * 37 + (g.shPhaseY || 0)) * amp;
		g.shX = lerp(g.shX, tx, dt * 22);
		g.shY = lerp(g.shY, ty, dt * 22);
	} else {
		g.shX = lerp(g.shX, 0, dt * 18);
		g.shY = lerp(g.shY, 0, dt * 18);
	}
	if (g.flash > 0) g.flash -= dt * 3.4;
	if (g.hitFlash > 0) g.hitFlash -= dt * 5.4;
	if (g.scoreFlash > 0) g.scoreFlash -= dt * 1.85;
	if (g.chromaShift > 0) g.chromaShift -= dt * 4.2;
	if (g.abilFlash > 0) g.abilFlash -= dt * 7;
	if (g.eAbilAlertT > 0) g.eAbilAlertT -= dt;
	if (g._eAbilFlash > 0) g._eAbilFlash -= dt;
	// Update floating score pop-ups
	for (let i = g.scorePops.length - 1; i >= 0; i--) {
		const sp = g.scorePops[i];
		if (typeof sp.max !== "number") sp.max = Math.max(0.001, sp.life || 0.8);
		if (typeof sp.vy !== "number") sp.vy = -(90 + rng(0, 18));
		if (typeof sp.scale !== "number") sp.scale = 0.95;
		sp.vy = lerp(sp.vy, -40, dt * 4.5);
		sp.y += sp.vy * dt;
		sp.scale = lerp(sp.scale, 1.08, dt * 4);
		sp.life -= dt;
		if (sp.life <= 0) g.scorePops.splice(i, 1);
	}
	g.ghostA = g.cfg.ghost ? 0.15 + Math.abs(Math.sin(g.t * 6)) * 0.65 : 1;
	// Start-of-point pause: ball frozen, waiting to launch
	if (g.cfg.enemy.id === "thefool" && g.foolAscPending && g.foolAscT <= 0) {
		const abilityBannerActive = g.foolSpecT > 0 && g.foolSpecTextT > 0;
		if (!abilityBannerActive) {
			if (g.foolAscPendingDelay > 0) g.foolAscPendingDelay -= dt;
			if (g.foolAscPendingDelay <= 0) {
				beginFoolAscension(
					g,
					g.foolAscPendingFrom,
					g.foolAscPendingTo,
					g.foolAscPendingSeq || "SEER",
				);
				g.foolAscPending = false;
				g.foolAscPendingFrom = "";
				g.foolAscPendingTo = "";
				g.foolAscPendingSeq = "";
			}
		}
	}
	const holdFoolServe =
		g.cfg.enemy.id === "thefool" &&
		(g.foolAscT > 0 ||
			g.foolAscPending ||
			(g.foolDialogActive && g.foolDialogBlocking) ||
			g.foolIntroTopT > 0);
	if (holdFoolServe) {
		g.foolServeHoldT = (g.foolServeHoldT || 0) + dt;
	} else {
		g.foolServeHoldT = 0;
	}
	const forceServe = g.foolServeHoldT > 8;
	if (g.startPause > 0 && (!holdFoolServe || forceServe)) {
		g.startPause -= dt;
		if (g.startPause <= 0) {
			const spd = g.ballSpd; // Already set by resetBall based on previous rally
			g.bvx = g.pendingDir * spd;
			g.bvy = typeof g.pendingVy === "number" ? g.pendingVy : rng(-160, 160);
		}
	}
	if (g.ghostT > 0) {
		g.ghostT -= dt;
		if (g.ghostT <= 0) g.ghostBall = false;
	}
	if (g.wallT > 0) {
		g.wallT -= dt;
		if (g.wallT <= 0) g.placedWall = null;
	}
	if (g.shrinkT > 0) {
		g.shrinkT -= dt;
	}
	if (g.freezeT > 0) {
		g.freezeT -= dt;
	}
	if (g.pStunT > 0) {
		g.pStunT -= dt;
	}
	if (g.ctrlInvertT > 0) g.ctrlInvertT -= dt;
	if (g.ballHideT > 0) g.ballHideT -= dt;
	if (g.foolDistortT > 0) g.foolDistortT -= dt;
	if (g.foolAscPulse > 0) g.foolAscPulse -= dt;
	if (g.foolLineT > 0) g.foolLineT -= dt;
	if (g.foolLineLockT > 0) g.foolLineLockT -= dt;
	if (g.foolScoreVoiceT > 0) g.foolScoreVoiceT -= dt;
	if (g.foolSpecTextT > 0) g.foolSpecTextT -= dt;
	if (g.foolLine && g.foolLineT > 0 && g.foolLineShow < g.foolLine.length) {
		g.foolLineTypeT -= dt;
		while (g.foolLineTypeT <= 0 && g.foolLineShow < g.foolLine.length) {
			const ch = g.foolLine[g.foolLineShow] || "";
			g.foolLineShow++;
			g.foolLineTypeT += nextTypeDelay(ch);
		}
	}
	if (
		g.foolDialogActive &&
		g.foolDialogBlocking &&
		g.foolDialogLine &&
		g.foolDialogShow < g.foolDialogLine.length
	) {
		g.foolDialogTypeT -= dt;
		while (
			g.foolDialogTypeT <= 0 &&
			g.foolDialogShow < g.foolDialogLine.length
		) {
			const ch = g.foolDialogLine[g.foolDialogShow] || "";
			g.foolDialogShow++;
			g.foolDialogTypeT += nextTypeDelay(ch);
		}
	}
	if (
		g.foolAscT > 0 &&
		g.foolAscDialog &&
		g.foolAscDialogShow < g.foolAscDialog.length
	) {
		g.foolAscDialogTypeT -= dt;
		while (
			g.foolAscDialogTypeT <= 0 &&
			g.foolAscDialogShow < g.foolAscDialog.length
		) {
			const ch = g.foolAscDialog[g.foolAscDialogShow] || "";
			g.foolAscDialogShow++;
			g.foolAscDialogTypeT += nextTypeDelay(ch);
		}
	}

	if (g.foolSpecSay && g.foolSpecTextT > 0) {
		g.foolSpecTypeT -= dt;
		while (g.foolSpecTypeT <= 0 && g.foolSpecSayShow < g.foolSpecSay.length) {
			const ch = g.foolSpecSay[g.foolSpecSayShow] || "";
			g.foolSpecSayShow++;
			let add = 0.018;
			if (ch === " " || ch === "\t") add = 0.05;
			else if (ch === "," || ch === ";" || ch === ":") add = 0.16;
			else if (ch === "." || ch === "!" || ch === "?" || ch === "&") add = 0.34;
			else if (ch === "" || ch === "-") add = 0.24;
			g.foolSpecTypeT += add;
		}
	}
	if (g.foolSpecGapT > 0) g.foolSpecGapT -= dt;
	const foolQuoteActive =
		(g.foolDialogActive && g.foolDialogBlocking) ||
		(g.foolLineT > 0 && !!g.foolLine) ||
		(g.foolAscT > 0 && !!g.foolAscDialog) ||
		(g.foolSpecTextT > 0 && !!g.foolSpecSay);
	if (foolQuoteActive) g.foolQuoteLockT = 1;
	else if (g.foolQuoteLockT > 0) g.foolQuoteLockT -= dt;
	if (g.foolAscT > 0) g.foolAscT -= dt;
	if (g.foolIntroTopT > 0) g.foolIntroTopT -= dt;
	if (g.foolSwapT > 0) g.foolSwapT -= dt;
	if (g.foolPaceLockT > 0) g.foolPaceLockT -= dt;
	if (g.foolDialogActive && g.foolDialogBlocking) {
		g.foolDialogPulse = (g.foolDialogPulse || 0) + dt;
		g.foolDialogFade = Math.min(1, (g.foolDialogFade || 0) + dt * 0.5);
		const fullLen = (g.foolDialogLine || "").length;
		if (fullLen > 0 && g.foolDialogShow >= fullLen) {
			g.foolDialogAutoT = (g.foolDialogAutoT || 1.05) - dt;
			if (g.foolDialogAutoT <= 0) advanceFoolDialogue(g);
		} else g.foolDialogAutoT = 1.05;
		return;
	}
	if (g.cfg.enemy.id === "thefool") {
		const foolBusy =
			g.foolAscT > 0 ||
			(g.foolDialogActive && g.foolDialogBlocking) ||
			(g.foolSpecT > 0 && g.foolSpecTextT > 0) ||
			g.foolSwapT > 0 ||
			g.startPause > 0 ||
			g.foolPaceLockT > 0;
		if (
			g.foolPointGate &&
			g.startPause > 0 &&
			g.multiBalls.length === 0
		)
			g.foolPointGate = false;
		g.foolAmbientTick -= dt;
		if (g.foolAmbientTick <= 0 && !foolBusy) {
			if (
				g.foolStartAmbientBag &&
				g.foolStartAmbientBag.length &&
				Math.random() < 0.35
			) {
				const startLine = g.foolStartAmbientBag.pop();
				if (startLine) foolSpeak(g, [startLine], 3.7, false, false);
			} else {
				const key = foolStageToKey(g.foolStage || 1);
				foolSpeak(
					g,
					FOOL_SEQ_AMBIENT[key] || FOOL_SEQ_AMBIENT.seer,
					3.9,
					false,
					false,
				);
			}
			g.foolAmbientTick = 13.5 + Math.random() * 5.8;
			g.foolPaceLockT = Math.max(g.foolPaceLockT, 0.75);
		}
		if (g.foolTargetSpd > 0) g.aiSpd = lerp(g.aiSpd, g.foolTargetSpd, dt * 1.8);
		if (g.foolTargetReact > 0)
			g.aiReact = lerp(g.aiReact, g.foolTargetReact, dt * 1.6);
		if (g.foolClone) {
			const clX = EX - 35;
			const threatY = pickIncomingThreatY(g, clX, 1);
			const aim = threatY === null ? g.by : lerp(g.by, threatY, 0.76);
			g.cloneY = lerp(g.cloneY, aim, dt * 8.5);
			g.cloneY = clamp(g.cloneY, g.eH / 2, GH - g.eH / 2);
		}
		if (g.foolSwapT > 0) {
			if (Math.random() < dt * 9) {
				g.flash = Math.max(g.flash, 0.08);
				g.flashCol = [0.9, 0.9, 1];
			}
			g.foolDistortT = Math.max(g.foolDistortT, 0.32);
			g.ballHideT = Math.max(g.ballHideT, 0.08);
		}
		for (const k of Object.keys(g.foolSpecCDs || {})) {
			if (g.foolSpecCDs[k] > 0) g.foolSpecCDs[k] -= dt;
		}
		if (g.foolSpecT > 0) {
			g.foolSpecT -= dt;
			const sid = g.foolSpec;
			if (sid === "seer") {
				g.aiReact = Math.max(g.aiReact, 0.97);
				g.foolSeerTick -= dt;
				if (g.foolSeerTick <= 0 && g.startPause <= 0) {
					const edgeTarget =
						g.py + (Math.random() < 0.5 ? -1 : 1) * g.ph * 0.48;
					g.bvy += clamp((edgeTarget - g.by) * 1.35, -120, 120);
					g.bvy = clamp(g.bvy, -g.ballSpd * 1.6, g.ballSpd * 1.6);
					addSparks(g, g.bx, g.by, 5, 55, [0.82, 0.9, 1]);
					g.foolSeerTick = 0.34 + Math.random() * 0.22;
				}
			} else if (sid === "clown") {
				if (g.ctrlInvertT < 0.9) g.ctrlInvertT = 0.9;
				g.foolClownTick -= dt;
				if (g.foolClownTick <= 0 && g.startPause <= 0) {
					const fakeY = clamp(g.by + rng(-80, 80), 12, GH - 12);
					g.scorePops.push({
						x: GW * 0.5 + rng(-50, 50),
						y: fakeY,
						text: "FAKE",
						life: 0.28,
					});
					g.py = clamp(g.py + rng(-34, 34), g.ph / 2, GH - g.ph / 2);
					g.pStunT = Math.max(g.pStunT, 0.1);
					g.flash = Math.max(g.flash, 0.08);
					g.flashCol = [0.86, 0.74, 1];
					g.foolClownTick = 0.46 + Math.random() * 0.24;
				}
			} else if (sid === "magician") {
				g.foolMagicianTick -= dt;
				if (g.foolMagicianTick <= 0 && g.startPause <= 0) {
					g.ey = clamp(g.by + rng(-30, 30), g.eH / 2, GH - g.eH / 2);
					g.ballHideT = Math.max(g.ballHideT, 0.12);
					g.blinkFlash = Math.max(g.blinkFlash, 0.7);
					g.foolMagicianTick = 0.26 + Math.random() * 0.2;
				}
			} else if (sid === "faceless") {
				g.foolFacelessTick -= dt;
				if (g.foolFacelessTick <= 0 && g.startPause <= 0) {
					g.ey = clamp(g.ey + rng(-80, 80), g.eH / 2, GH - g.eH / 2);
					g.blinkFlash = Math.max(g.blinkFlash, 0.55);
					g.foolFacelessTick = 0.5 + Math.random() * 0.28;
				}
			} else if (
				sid === "marionettist" ||
				sid === "bizarro" ||
				sid === "fool"
			) {
				for (let i = 0; i < g.foolPuppets.length; i++) {
					const p = g.foolPuppets[i];
					if (!p.broken) p.a = 0.45 + 0.2 * Math.sin(g.t * 5 + i);
				}
			}
			if (sid === "scholar") {
				g.foolScholarTick -= dt;
				if (
					g.foolScholarTick <= 0 &&
					g.startPause <= 0 &&
					g.trail.length > 10
				) {
					const idx = Math.max(
						0,
						g.trail.length - 10 - Math.floor(Math.random() * 8),
					);
					const past = g.trail[idx];
					if (past) {
						g.bx = past.x;
						g.by = past.y;
						g.chromaShift = Math.max(g.chromaShift, 0.35);
						addSparks(g, g.bx, g.by, 10, 80, [0.85, 0.85, 1]);
					}
					g.foolScholarTick = 1.4 + Math.random() * 1.3;
				}
			}
			if (sid === "attendant") {
				g.foolConcealTick -= dt;
				if (g.foolConcealTick <= 0 && g.startPause <= 0) {
					g.ballHideT = 0.4;
					g.foolConcealTick = 0.85 + Math.random() * 1;
				}
			}
			if (sid === "trickroom") {
				g.foolTrickTick -= dt;
				if (g.foolTrickTick <= 0 && g.startPause <= 0) {
					g.ctrlInvertT = Math.max(g.ctrlInvertT, 1.25);
					g.bvy += (Math.random() - 0.5) * 280;
					g.bvy = clamp(g.bvy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
					g.flash = Math.max(g.flash, 0.1);
					g.flashCol = [0.86, 0.74, 1];
					g.foolTrickTick = 0.35 + Math.random() * 0.22;
				}
			}
			if (sid === "oraclebreak") {
				g.foolOracleBreakTick -= dt;
				if (g.foolOracleBreakTick <= 0 && g.startPause <= 0) {
					g.bvx *= Math.max(0.88, 1 - Math.random() * 0.08);
					g.bvy += (Math.random() - 0.5) * 230;
					g.bvy = clamp(g.bvy, -g.ballSpd * 1.8, g.ballSpd * 1.8);
					g.chromaShift = Math.max(g.chromaShift, 0.45);
					g.foolOracleBreakTick = 0.55 + Math.random() * 0.35;
				}
			}
			if (sid === "judgment") {
				g.foolJudgmentTick -= dt;
				if (g.foolJudgmentTick <= 0 && g.startPause <= 0) {
					g.abCD = Math.max(g.abCD, (g.pad?.cd ?? 8) * g.cdMul * 0.75);
					g.pStunT = Math.max(g.pStunT, 0.14);
					g.flash = Math.max(g.flash, 0.12);
					g.flashCol = [0.98, 0.84, 0.9];
					addSparks(g, g.px, g.py, 8, 90, [0.95, 0.8, 0.9]);
					g.foolJudgmentTick = 0.7 + Math.random() * 0.4;
				}
			}
			if (sid === "fool") {
				g.foolDistortT = Math.max(g.foolDistortT, 0.2);
				if (g.ctrlInvertT < 0.5) g.ctrlInvertT = 0.5;
				g.foolFoolTick -= dt;
				if (g.foolFoolTick <= 0) {
					g.flash = Math.max(g.flash, 0.065);
					g.flashCol = [0.85, 0.85, 1];
					g.foolFoolTick = 0.14 + Math.random() * 0.1;
				}
			}
			if (g.foolSpecT <= 0) {
				g.foolSpec = "";
				g.foolSpecSay = "";
				g.foolSpecSayShow = 0;
				g.foolSpecTypeT = 0;
				g.foolSpecGapT = 1.45;
			}
		} else if (
			g.startPause <= 0 &&
			g.foolSpecGapT <= 0 &&
			g.foolAscT <= 0 &&
			g.foolSwapT <= 0 &&
			!(g.foolDialogActive && g.foolDialogBlocking) &&
			g.foolQuoteLockT <= 0
		) {
			const pool = getUnlockedFoolSpecials(g);
			const ready = pool.filter((id) => (g.foolSpecCDs[id] || 0) <= 0);
			if (ready.length) {
				const sid = pickFoolSpecial(g, ready);
				startFoolSpecial(g, sid);
			} else {
				g.foolSpecGapT = 0.65;
			}
		}
	}
	if (g.foolPuppets.length) {
		for (let i = g.foolPuppets.length - 1; i >= 0; i--) {
			const p = g.foolPuppets[i];
			if (p.broken) {
				p.fade -= dt * 2.2;
				if (p.fade <= 0) g.foolPuppets.splice(i, 1);
			} else p.a = 0.45 + 0.2 * Math.sin(g.t * 5 + i);
		}
	}
	// Compute enemy paddle height: shrink halves, bulk grows slightly, all capped
	if (g.shrinkT > 0) g.eH = g.eHBase * 0.5;
	else if (g.bulkT > 0) g.eH = g.eHBase * 1.4;
	else g.eH = g.eHBase;
	g.eH = Math.min(g.eH, BASE_PAD_H * 1.4); // hard cap so paddle never gets huge
	for (let i = g.sparks.length - 1; i >= 0; i--) {
		const p = g.sparks[i];
		p.x += p.vx * dt;
		p.y += p.vy * dt;
		p.vx *= 0.92;
		p.vy *= 0.92;
		p.life -= dt;
		if (p.life <= 0) g.sparks.splice(i, 1);
	}

	// New ability timers
	if (g.foresightT > 0) g.foresightT -= dt;
	if (g.blizzardT > 0) g.blizzardT -= dt;
	if (g.phaseT > 0) {
		g.phaseT -= dt;
		if (g.phaseT <= 0) g.phaseNext = false;
	}
	if (g.gravWellT > 0) {
		g.gravWellT -= dt;
		if (g.gravWellT <= 0) g.gravWell = null;
	}
	// Warp field: curve ball hard toward enemy weak spot
	if (g.warpFieldT > 0) {
		g.warpFieldT -= dt;
		if (g.bvx > 0) {
			// Ball going toward enemy: curve toward gap in defense
			const gapY = getEnemyOpenLaneY(g);
			const dy = gapY - g.by;
			const curveStr = 420;
			g.bvy += Math.sign(dy) * Math.min(Math.abs(dy), curveStr) * dt;
			// Small forward push
			g.bvx += 40 * dt;
		} else {
			// Ball coming back: gentle curve to help player catch it
			const dy = g.py - g.by;
			g.bvy += Math.sign(dy) * Math.min(Math.abs(dy) * 0.5, 120) * dt;
		}
		// Normalize speed so warp doesn't make ball too fast/slow
		const curSpd = Math.hypot(g.bvx, g.bvy);
		if (curSpd > g.ballSpd * 1.15) {
			const r = (g.ballSpd * 1.15) / curSpd;
			g.bvx *= r;
			g.bvy *= r;
		}
	}
	// Gravity well: direction-based behavior (legacy, still used by DEAD ZONE upgrade)
	if (g.gravWell && g.gravWellT > 0) {
		const dx = g.gravWell.x - g.bx,
			dy = g.gravWell.y - g.by;
		const dist = Math.max(Math.hypot(dx, dy), 15);
		if (g.bvx < 0) {
			// Ball heading toward player: strong pull to loop ball around well
			const force = 3200 / (dist + 30);
			g.bvx += (dx / dist) * force * dt;
			g.bvy += (dy / dist) * force * dt;
			// If ball passes through well center, push it right (toward enemy)
			if (dist < 20) {
				g.bvx = Math.abs(g.bvx) + 100 * dt;
			}
		} else {
			// Ball heading toward enemy: curve it to dodge enemy paddle
			const force = 1800 / (dist + 40);
			// Perpendicular deflection (curve around enemy, not straight into them)
			const perp = g.by < g.ey ? -1 : 1;
			g.bvy += perp * force * dt * 0.7;
			g.bvx += (dx / dist) * force * dt * 0.3;
			// Prevent vertical sticking: if ball is too vertical, push horizontal
			const ratio = Math.abs(g.bvy) / (Math.abs(g.bvx) + 1);
			if (ratio > 3) g.bvx += Math.sign(g.bvx) * 200 * dt;
		}
	}
	// Lightning/thunder projectiles: bounce and STUN on contact (never score directly)
	for (let i = g.bolts.length - 1; i >= 0; i--) {
		const b = g.bolts[i];
		b.life -= dt;
		b.x += b.vx * dt;
		b.y += b.vy * dt;
		b.trail.push({ x: b.x, y: b.y });
		if (b.trail.length > 8) b.trail.shift();
		// Zigzag
		b.zig -= dt;
		if (b.zig <= 0) {
			b.zig = 0.12 + Math.random() * 0.1;
			b.vy = (Math.random() - 0.5) * 250;
		}
		if (b.y < 10) {
			b.y = 10;
			b.vy = Math.abs(b.vy);
		}
		if (b.y > GH - 10) {
			b.y = GH - 10;
			b.vy = -Math.abs(b.vy);
		}
		// hit player paddle? (warden storm or enemy bolts directed left)
		if (
			(!b.target || b.target === "player") &&
			b.vx < 0 &&
			b.x < PX_HOME + PAD_W / 2 + 4 &&
			b.x > PX_HOME - PAD_W / 2 - 4 &&
			b.y > g.py - g.ph / 2 - 4 &&
			b.y < g.py + g.ph / 2 + 4
		) {
			// stun player briefly
			g.pStunT = Math.max(g.pStunT, 0.25);
			g.shake = 0.08;
			g.flash = 0.12;
			g.flashCol = [1, 0.93, 0.27];
			addSparks(g, g.px, g.py, 14, 100, [1, 0.93, 0.27]);
			tone(400, 0.06, "square", 0.04);
			tone(200, 0.1, "square", 0.03, 30);
			g.bolts.splice(i, 1);
			continue;
		}
		// Hit enemy paddle = STUN it briefly, not score
		if (
			(!b.target || b.target === "enemy") &&
			b.x > EX - PAD_W / 2 - 4 &&
			b.x < EX + PAD_W / 2 + 4 &&
			b.y > g.ey - g.eH / 2 - 4 &&
			b.y < g.ey + g.eH / 2 + 4
		) {
			g.freezeT = Math.max(g.freezeT, 0.25);
			g.shake = 0.08;
			g.flash = 0.12;
			g.flashCol = [1, 0.93, 0.27];
			addSparks(g, EX, g.ey, 14, 100, [1, 0.93, 0.27]);
			tone(400, 0.06, "square", 0.04);
			tone(200, 0.1, "square", 0.03, 30);
			g.bolts.splice(i, 1);
			continue;
		}
		// Fizzle out at edges (never score)
		if (b.x > GW || b.x < 0 || b.life <= 0) {
			g.bolts.splice(i, 1);
		}
	}

	// Mirror Match (secret): enemy copies player Y with 0.4s delay
	if (g.mirrorMatch) {
		g.mirrorBuf.push({ t: g.t, y: g.py });
		while (g.mirrorBuf.length > 0 && g.mirrorBuf[0].t < g.t - 1.2)
			g.mirrorBuf.shift();
		let delayed = null;
		for (let i = g.mirrorBuf.length - 1; i >= 0; i--) {
			if (g.mirrorBuf[i].t <= g.t - 0.4) {
				delayed = g.mirrorBuf[i];
				break;
			}
		}
		if (delayed) g._mirrorY = delayed.y;
	}
	const rallyMul = g.ballSpd / (g.rallyBase || 1);
	g.ballSpd = Math.min(g.ballSpd, MAX_BALL_SPD);
	g.rallyBase = Math.min(g.rallyBase, MAX_BALL_SPD);
	let twMul = 1;
	if (g.timewarp) {
		const nx = g.bx / GW; // 0=left, 1=right
		if (g.bvx > 0)
			twMul = lerp(1.15, 0.7, nx); // speeds near player, slows near enemy
		else twMul = lerp(0.75, 1.2, nx);
	}
	if (g.midlineSlow && g.bvx < 0 && g.bx > GW * 0.42 && g.bx < GW * 0.58) {
		twMul *= 0.82;
	}
	// Tailwind: 15% speed boost when ball heading toward enemy
	if (g.tailwind && g.bvx > 0) twMul *= 1.15;
	// Reflex Slow: time slow when enemy uses ability
	if (g._reflexSlowT > 0) {
		g._reflexSlowT -= dt;
		twMul *= 0.6;
	}
	// Blizzard: slow ball in enemy half
	if (g.blizzardT > 0 && g.bx > GW * 0.4) twMul *= 0.3;

	// Velocity Surge: when ball exceeds 50% of base speed, buff paddle
	if (g.velocitySurge) {
		const curBallSpd = Math.hypot(g.bvx, g.bvy);
		const surgeThresh = g.bs * 1.5;
		if (curBallSpd > surgeThresh && !g._surgeActive) {
			g._surgeActive = true;
			g.ph *= 1.2;
			g.pSpd *= 1.25;
			addSparks(g, g.px, g.py, 12, 100, [1, 0.8, 0.2]);
		} else if (curBallSpd <= surgeThresh && g._surgeActive) {
			g._surgeActive = false;
			g.ph /= 1.2;
			g.pSpd /= 1.25;
		}
	}
	// Concussion: decrement timers
	if (g.concussStunT > 0) g.concussStunT -= dt;
	if (g.concussSlowT > 0) g.concussSlowT -= dt;
	// Center combo flash decay
	if (g.centerComboFlash > 0) g.centerComboFlash -= dt;
	if (g.centerComboPopT > 0) g.centerComboPopT -= dt;

	// --- STORM CALLER: passive lightning rain ~3 bolts/sec near enemy ---
	if (g.stormCaller && g.startPause <= 0) {
		g._stormRainT = (g._stormRainT || 0) - dt;
		if (g._stormRainT <= 0) {
			g._stormRainT = 0.25 + Math.random() * 0.2; // ~3/sec with jitter
			const ty = g.ey + rng(-g.eH * 1.5, g.eH * 1.5);
			const bSpd = g.ballSpd * 1.3;
			g.bolts.push({
				x: EX - 80 - Math.random() * 60, y: ty,
				vx: bSpd * 0.8, vy: rng(-40, 40),
				life: 2.5, trail: [], zig: 0.15, target: "enemy",
			});
			if (g.bolts.length > MAX_BOLTS) g.bolts.splice(0, g.bolts.length - MAX_BOLTS);
			addSparks(g, EX - 80, ty, 4, 50, [1, 0.93, 0.27]);
		}
	}

	// --- PARADOX ENGINE: every 0.5s redirect ball toward enemy ---
	if (g.paradoxEngine && g.bvx > 0 && g.startPause <= 0) {
		g._paradoxTick -= dt;
		if (g._paradoxTick <= 0) {
			g._paradoxTick = 0.5;
			const spd = Math.hypot(g.bvx, g.bvy);
			const ang = (Math.random() - 0.5) * 1.2; // �0.6 radians
			g.bvx = Math.abs(Math.cos(ang)) * spd;
			g.bvy = Math.sin(ang) * spd;
		}
	}

	// --- LOCKDOWN: freeze enemy while their ability is active ---
	if (g.lockdown && g.eAbilActive > 0) {
		g.lockdownFreezeT = 0.6;
	}
	if (g.lockdownFreezeT > 0) g.lockdownFreezeT -= dt;

	// --- NULL: disable enemy abilities in cycles ---
	if (g.nullField) {
		if (g._nullActiveT > 0) {
			g._nullActiveT -= dt;
			// While active the ability system is suppressed (handled in ability section)
			if (g._nullActiveT <= 0) g._nullCooldownT = 20;
		} else if (g._nullCooldownT > 0) {
			g._nullCooldownT -= dt;
			if (g._nullCooldownT <= 0) g._nullActiveT = 40;
		}
	}

	// --- FIRE PHANTOM BURN TICKS ---
	if (g._burnT > 0) {
		g._burnT -= dt;
		g._burnTickT -= dt;
		if (g._burnTickT <= 0) {
			g._burnTickT = 0.7;
			g.freezeT = Math.max(g.freezeT, 0.3);
			addSparks(g, EX, g.ey, 6, 60, [1, 0.4, 0.1]);
			tone(250, 0.04, "sawtooth", 0.03);
		}
	}
	// Angel Steps flash decay
	if (g._angelFlashT > 0) g._angelFlashT -= dt;

	// --- DELUSIO: enemy tracks random position while active ---
	if (g._delusioT > 0) g._delusioT -= dt;

	// --- SPEED BURST (ADRENALINE): random chance when ball heading to enemy ---
	if (g.speedBurst && g.bvx > 0 && g.startPause <= 0 && g._speedBurstT <= 0) {
		if (Math.random() < dt * 1.5) { // ~1.5 chances/sec
			g._speedBurstT = 0.22;
			const boost = 1.35;
			g.bvx *= boost;
			g.bvy *= boost;
			addSparks(g, g.bx, g.by, 6, 80, [1, 0.7, 0.2]);
			tone(350, 0.04, "sine", 0.03);
		}
	}
	if (g._speedBurstT > 0) {
		g._speedBurstT -= dt;
		if (g._speedBurstT <= 0) {
			// Gradually normalize  the main normalization lerp handles the rest
		}
	}

	// --- STRAIGHT SHOT timer decay ---
	if (g._straightShotT > 0) {
		g._straightShotT -= dt;
		if (g._straightShotT <= 0) {
			// Main normalization lerp handles the gradual return
		}
	}

	// --- MIRAGE DECOY movement ---
	if (g._mirageDecoy && g._mirageDecoy.active) {
		const dc = g._mirageDecoy;
		dc.life -= dt;
		dc.x += dc.vx * dt;
		dc.y += dc.vy * dt;
		dc.trail.push({ x: dc.x, y: dc.y });
		if (dc.trail.length > 8) dc.trail.shift();
		// Bounce off top/bottom
		if (dc.y < BALL_SZ / 2) { dc.y = BALL_SZ / 2; dc.vy = Math.abs(dc.vy); }
		if (dc.y > GH - BALL_SZ / 2) { dc.y = GH - BALL_SZ / 2; dc.vy = -Math.abs(dc.vy); }
		// Vanish at midfield
		if (dc.x > GW / 2 || dc.life <= 0) {
			dc.active = false;
			addSparks(g, dc.x, dc.y, 8, 60, [1, 1, 0.5]);
		}
	}

	// Player - compute velocity from last frame position
	let sp = g.pSpd;
	if (keysDown[" "]) sp *= 0.5;
	const hMax = HORIZ * g.horizMul;
	const invert = g.ctrlInvertT > 0 ? -1 : 1;
	if (g.perfectPilot) {
		const pCatchX = g.px + PAD_W / 2 + 2;
		const threatY = pickIncomingThreatY(g, pCatchX, -1);
		const targetY = clamp(
			threatY === null ? g.by : threatY,
			g.ph / 2,
			GH - g.ph / 2,
		);
		g.py = targetY;
	} else if (g.pStunT <= 0) {
		if (keysDown["w"] || keysDown["arrowup"]) g.py -= sp * dt * invert;
		if (keysDown["s"] || keysDown["arrowdown"]) g.py += sp * dt * invert;
	}
	g.py = clamp(g.py, g.ph / 2, GH - g.ph / 2);
	if (g.perfectPilot) {
		const targetX = clamp(PX_HOME + 24, PAD_W / 2 + 6, GW / 2 - PAD_W / 2 - 20);
		g.px = targetX;
	} else if (g.pStunT <= 0) {
		if (keysDown["a"] || keysDown["arrowleft"]) g.px -= sp * 0.55 * dt * invert;
		if (keysDown["d"] || keysDown["arrowright"])
			g.px += sp * 0.55 * dt * invert;
		if (
			!keysDown["a"] &&
			!keysDown["arrowleft"] &&
			!keysDown["d"] &&
			!keysDown["arrowright"]
		)
			g.px = lerp(g.px, PX_HOME, dt * 4);
	}
	// limit horizontal wandering to the allowed range *and* keep the paddle inside the screen boundaries
	const minX = Math.max(PX_HOME - hMax, PAD_W / 2);
	const maxX = Math.min(PX_HOME + hMax, GW - PAD_W / 2);
	g.px = clamp(g.px, minX, maxX);
	// Track paddle velocity for momentum transfer on hit
	g.pVelY = (g.py - g.prevPy) / Math.max(dt, 0.001);
	g.prevPy = g.py;
	// Track enemy paddle velocity for spin on enemy returns
	g.eVelY = (g.ey - (g.prevEy ?? g.ey)) / Math.max(dt, 0.001);
	g.prevEy = g.ey;
	if (g.doppel) {
		const dpX = PX_HOME + 60;
		const threatY = pickIncomingThreatY(g, dpX, -1);
		const fallback = g.py + clamp(g.pVelY * 0.05, -28, 28);
		const doppelAim =
			threatY === null ? fallback : lerp(fallback, threatY, 0.72);
		g.doppelY = lerp(g.doppelY, doppelAim, dt * 12);
		g.doppelY = clamp(g.doppelY, g.ph * 0.4, GH - g.ph * 0.4);
	} else {
		g.doppelBuf.length = 0;
		g.doppelY = g.py;
	}

	// Ball movement with time warp (skip during timestop/lightning stun)
	const ballFrozen = g.tsT > 0 || g.eAbilPhase === "strike" || g.startPause > 0;
	if (!ballFrozen) {
		g.trail.push({ x: g.bx, y: g.by });
		if (g.trail.length > TRAIL) g.trail.shift();
	}

	if (!ballFrozen) {
		// preserve previous position for tunneling detection
		const prevBx = g.bx;
		const prevBy = g.by;
		g.bx += g.bvx * dt * twMul;
		g.by += g.bvy * dt * twMul;
		// fix cases where the ball jumps straight through a paddle at high speed
		const bs2 = BALL_SZ / 2;
		if (g.bvx < 0) {
			const pR = g.px + PAD_W / 2 + 2;
			if (prevBx > pR + bs2 && g.bx < pR - bs2) {
				const tHit = (prevBx - (pR + bs2)) / (prevBx - g.bx);
				const yHit = prevBy + (g.by - prevBy) * tHit;
				const pT = g.py - g.ph / 2,
					pB = g.py + g.ph / 2;
				if (yHit + bs2 >= pT && yHit - bs2 <= pB) {
					g.bx = pR + bs2 + 1;
					g.by = yHit;
					// immediately reverse velocity so ball bounces cleanly
					g.bvx = Math.abs(g.bvx);
					g.bvy += clamp(g.pVelY * 0.45, -g.ballSpd * 0.7, g.ballSpd * 0.7);
					// Impart spin on tunneling hit too
					{
						const spdRatio = BASE_SPD / Math.max(g.ballSpd, 1);
						g.spin = clamp(g.pVelY * 1.2 * spdRatio, -600, 600);
						g.spinVisAngle = 0;
					}
					applyRallyHitSpeed(g);
				}
			}
		} else if (g.bvx > 0) {
			const pL = EX - PAD_W / 2 - 2;
			if (prevBx < pL - bs2 && g.bx > pL + bs2) {
				const tHit = (pL - bs2 - prevBx) / (g.bx - prevBx);
				const yHit = prevBy + (g.by - prevBy) * tHit;
				const eT = g.ey - g.eH / 2,
					eB = g.ey + g.eH / 2;
				if (yHit + bs2 >= eT && yHit - bs2 <= eB) {
					g.bx = pL - bs2 - 1;
					g.by = yHit;
					// immediately reverse velocity so ball bounces cleanly
					g.bvx = -Math.abs(g.bvx);
					applyRallyHitSpeed(g);
				}
			}
		}

		if (g.curveNext && g.bvx > 0) {
			const curveTarget = Math.sign(g.bvy || 1) * g.ballSpd * 1.8;
			g.bvy = lerp(g.bvy, curveTarget, dt * 3.5);
		}
		// Homing: smooth drift toward gap in enemy defense
		if (g.homing && g.bvx > 0) {
			const gap = getEnemyOpenLaneY(g);
			const curSpd = Math.hypot(g.bvx, g.bvy);
			const speedScale = clamp(curSpd / BASE_SPD, 0.85, 2.8);
			const laneProg = clamp((g.bx - GW * 0.25) / (GW * 0.75), 0, 1);
			const laneScale = 1.0 + laneProg;
			const homingForce = 160 * speedScale * laneScale;
			const targetVy = Math.sign(gap - g.by) * homingForce;
			g.bvy = lerp(g.bvy, g.bvy + targetVy * dt, 0.9);
		}
		// Dead Zone: strong pull toward enemy goal
		if (g.singularity && g.bvx > 0 && Math.abs(g.spin) <= 5) {
			g.bvx += 120 * dt;
			g.bvy *= 0.995;
		} else if (g.singularity && g.bvx > 0) {
			g.bvx += 120 * dt;
		}
		// Redirect: gradual curve toward enemy goal after player return
		if (g.redirect && g.bvx > 0 && !g._redirectUsed && g.bx > GW * 0.18 && g.bx < GW * 0.82) {
			const goalY = getEnemyOpenLaneY(g);
			const curveStr = 160;
			g.bvy = lerp(g.bvy, g.bvy + Math.sign(goalY - g.by) * curveStr * dt, 0.85);
		}
		if (g.redirect && g.bvx > 0 && !g._redirectUsed && g.bx >= GW * 0.82) {
			g._redirectUsed = true;
		}
	}

	// NaN safety: reset ball if physics produced invalid values
	if (isNaN(g.bx) || isNaN(g.by) || isNaN(g.bvx) || isNaN(g.bvy)) {
		g.bx = GW / 2; g.by = GH / 2;
		g.bvx = 0; g.bvy = 0;
		g.startPause = 0.5; g.startPauseMax = 0.5;
		g.pendingDir = Math.random() > 0.5 ? 1 : -1;
		g.pendingVy = rng(-160, 160);
	}

	const bs2 = BALL_SZ / 2,
		col = PCOL[g.padId];
	if (g.by - bs2 < 0) {
		g.by = bs2;
		g.bvy = Math.abs(g.bvy);
		SFX.wall();
		addSparks(g, g.bx, 0, 4, 60, col.t);
		ricoB(g);
	}
	if (g.by + bs2 > GH) {
		g.by = GH - bs2;
		g.bvy = -Math.abs(g.bvy);
		SFX.wall();
		addSparks(g, g.bx, GH, 4, 60, col.t);
		ricoB(g);
	}
	if (g.placedWall) {
		const w = g.placedWall,
			wW = 8,
			wH = 60;
		if (
			g.bx + bs2 > w.x - wW / 2 &&
			g.bx - bs2 < w.x + wW / 2 &&
			g.by + bs2 > w.y - wH / 2 &&
			g.by - bs2 < w.y + wH / 2
		) {
			g.bvx = -g.bvx;
			g.bx = g.bvx > 0 ? w.x + wW / 2 + bs2 + 1 : w.x - wW / 2 - bs2 - 1;
			SFX.wall();
			addSparks(g, g.bx, g.by, 10, 80, col.t);
		}
	}

	// Combo explosion: enhanced particles when combo increases
	if (g.combo > g.lastCombo && g.combo > 0) {
		const comboInc = g.combo - g.lastCombo;
		const comboPaddleCol = PCOL[g.padId].t;
		addSparks(
			g,
			g.bx,
			g.by,
			Math.min(12 + comboInc * 3, 28),
			150 + comboInc * 30,
			comboPaddleCol,
		);
		g.shake = Math.min(0.15 + comboInc * 0.04, 0.35); // screen shake scales with combo
		g.chromaShift = Math.min(0.3 + comboInc * 0.1, 0.8); // chromatic aberration for intensity
	}
	g.lastCombo = g.combo;

	const cs = Math.hypot(g.bvx, g.bvy);
	// Only normalize when no ability is actively warping ball physics
	const skipNorm =
		g.tsT > 0 || g.eAbilPhase === "strike" || g.pullT > 0 || g.spinCurveT > 0 || Math.abs(g.spin) > 15
		|| g._speedBurstT > 0 || g._straightShotT > 0;
	if (!skipNorm && cs > 1) {
		const maxSpd = g.ballSpd * 2.8;
		if (cs > maxSpd) {
			const r = maxSpd / cs;
			g.bvx *= r;
			g.bvy *= r;
		} else {
			const r = lerp(1, g.ballSpd / cs, dt * 1.8);
			g.bvx *= r;
			g.bvy *= r;
		}
	}

	// Player hit
	if (g.bvx < 0) {
		const pL = g.px - PAD_W / 2 - 2,
			pR = g.px + PAD_W / 2 + 2,
			pT = g.py - g.ph / 2,
			pB = g.py + g.ph / 2;
		if (
			!(
				g.bx - bs2 > pR ||
				g.bx + bs2 < pL ||
				g.by + bs2 < pT ||
				g.by - bs2 > pB
			)
		) {
			let spd = g.ballSpd * 1.03;
			let piercing = false;
			if (g.smashNext) {
				spd = g.ballSpd * 2.5;
				g.smashNext = false;
				g.shake = 0.25;
				g.chromaShift = 1.2;
				addSparks(g, g.px + PAD_W, g.by, 28, 220, col.t);
				g.flash = 0.4;
				g.flashCol = col.t;
				SFX.smash();
				piercing = true;
			}
			if (g.transcend) piercing = true;
			if (g.phaseNext) {
				g.phaseNext = false;
				g.phaseT = 0;
				piercing = true;
				g.ghostBall = true;
				g.ghostT = 0.8;
				g.shake = 0.12;
				g.chromaShift = 0.5;
				g.flash = 0.2;
				g.flashCol = [0.8, 0.53, 1];
				addSparks(g, g.bx, g.by, 16, 120, [0.8, 0.53, 1]);
				tone(700, 0.06, "sine", 0.04);
			}
			// Flat wall reflection: reverse horizontal, preserve vertical
			g.bvx = Math.abs(g.bvx);
			// Transfer paddle velocity to ball (the only thing that changes vertical direction)
			g.bvy += clamp(g.pVelY * 0.45, -spd * 0.7, spd * 0.7);
			// Impart spin: paddle velocity creates mid-air curve
			{
				const spdRatio = BASE_SPD / Math.max(g.ballSpd, 1);
				g.spin = clamp(g.pVelY * 1.2 * spdRatio, -600, 600);
				g.spinVisAngle = 0;
			}
			// Edge master upgrade: add extra angle kick at paddle edges
			if (g.edge) {
				const rel = clamp((g.by - g.py) / (g.ph / 2), -1, 1);
				if (Math.abs(rel) > 0.6) g.bvy += rel * spd * 0.4;
			}
			// Normalize to target speed
			const curSpd = Math.hypot(g.bvx, g.bvy);
			if (curSpd > 0.1) {
				const r = spd / curSpd;
				g.bvx *= r;
				g.bvy *= r;
			}
			// Ensure bvx always points right (away from player)
			g.bvx = Math.abs(g.bvx);
			// Clamp bvy so ball doesn't go near-vertical
			const maxVy = spd * 0.92;
			if (Math.abs(g.bvy) > maxVy) {
				g.bvy = Math.sign(g.bvy) * maxVy;
				g.bvx = Math.sqrt(spd * spd - g.bvy * g.bvy);
			}
			g.bx = pR + bs2 + 1;
			const finalAng = Math.atan2(g.bvy, g.bvx); // used by afterimage
			g.combo++;
			g._playerHits = (g._playerHits || 0) + 1;
			applyRallyHitSpeed(g);
			// Tutorial: track rally hits and spin
			if (tut && tut.active) {
				tut.rallyHits++;
				if (Math.abs(g.spin) > 50) tut.spinApplied = true;
			}
			g.flash = Math.max(g.flash, 0.18);
			g.hitFlash = 1;
			g.shake = Math.max(g.shake, 0.03);
			// cleaner, slightly stronger player hit effect
			SFX.paddle();
			addSparks(g, g.px + PAD_W / 2, g.by, 8, 100, col.t);
			// Master of Skill: your hit = triple ball speed, every rally hit = +20% base permanently
			if (g.masterSkill) {
				g._masterBaseSpd = g.ballSpd;
				g._masterHitBoosted = true;
				g.bs = Math.min(g.bs * 1.2, MAX_BALL_SPD); // permanent 20% base increase per rally hit
				const boosted = g.ballSpd * 3;
				const msH = Math.hypot(g.bvx, g.bvy);
				if (msH > 0.01) {
					g.bvx = (Math.sign(g.bvx) * Math.abs(g.bvx) / msH) * boosted;
					g.bvy = (g.bvy / msH) * boosted;
				} else {
					g.bvx = boosted;
					g.bvy = 0;
				}
				g.shake = Math.max(g.shake, 0.1);
				g.chromaShift = Math.max(g.chromaShift, 0.3);
			}
			// Freeze (was Concussion): short stun + short slow on every hit
			if (g.concussion) {
				g.concussStunT = 0.25;
				g.concussSlowT = 0.35;
				g.freezeT = Math.max(g.freezeT, 0.25);
				addSparks(g, EX, g.ey, 10, 80, [1, 0.9, 0.3]);
				tone(180, 0.08, "sawtooth", 0.04);
			}
			// Redirect: after return, ball curves once toward enemy goal
			if (g.redirect) {
				g._redirectUsed = false; // arm the redirect for this return
				const goalY = getEnemyOpenLaneY(g);
				g.bvy += Math.sign(goalY - g.by) * Math.min(70, g.ballSpd * 0.14);
			}
			// Delusio: enemy loses track of ball for 0.5s
			if (g.delusio) {
				g._delusioT = 0.5;
			}
			// Spin Drag: measure spin ratio, apply as enemy slow
			if (g.spinDrag) {
				const spinRatio = Math.abs(g.bvy) / Math.max(Math.hypot(g.bvx, g.bvy), 1);
				g._spinDragMul = 1 - spinRatio * 0.1; // up to 10% slower
			}
			// Straight Shot: if return is mostly horizontal, +25% speed for 1s
			if (g.straightShot) {
				const straightness = Math.abs(g.bvx) / Math.max(Math.hypot(g.bvx, g.bvy), 1);
				if (straightness > 0.85) {
					g._straightShotT = 1.0;
					const boost = 1.25;
					g.bvx *= boost;
					g.bvy *= boost;
					addSparks(g, g.bx, g.by, 10, 100, [0.5, 0.9, 1]);
					tone(400, 0.06, "sine", 0.04);
				}
			}
			// Mirage: spawn decoy ball that AI tracks
			if (g.mirage) {
				const aSpd = g.ballSpd * 1.1;
				const aAng = Math.atan2(g.bvy, g.bvx) + (Math.random() - 0.5) * 0.4;
				g._mirageDecoy = {
					x: g.bx, y: g.by,
					vx: Math.abs(Math.cos(aAng) * aSpd),
					vy: Math.sin(aAng) * aSpd,
					life: 3.0, trail: [], active: true,
				};
			}
			// Center combo: detect center hit
			{
				const relHit = Math.abs(g.by - g.py) / (g.ph / 2);
				if (relHit < 0.25) {
					g.centerCombo++;
					g.centerComboFlash = 0.4;
					const label = g.centerCombo >= 10 ? "PERFECT " + g.centerCombo + "x"
						: g.centerCombo >= 5 ? "GREAT " + g.centerCombo + "x"
						: g.centerCombo >= 3 ? "NICE " + g.centerCombo + "x" : "";
					if (label) {
						g.centerComboPop = label;
						g.centerComboPopT = 1.0;
						// Bonus: each center combo past 3 gives tiny speed buff
						g.ballSpd *= 1.01;
						addSparks(g, g.px + PAD_W / 2, g.by, 6 + g.centerCombo, 80, [1, 1, 0.5]);
					}
				} else {
					g.centerCombo = 0;
				}
			}
			// Thunder: spawn 1 stun bolt on hit (stuns enemy paddle, doesn't score)
			if (g.thunderNext) {
				g.thunderNext = false;
				const bSpd = g.ballSpd * 1.5;
				g.bolts.push({
					x: g.bx,
					y: g.by,
					vx: bSpd,
					vy: rng(-100, 100),
					life: 4,
					trail: [],
					zig: 0.12,
					target: "enemy",
				});
				if (g.bolts.length > MAX_BOLTS)
					g.bolts.splice(0, g.bolts.length - MAX_BOLTS);
				g.shake = 0.08;
				g.flash = 0.15;
				g.flashCol = [1, 0.93, 0.27];
				g.chromaShift = 0.3;
				addSparks(g, g.bx, g.by, 12, 120, [1, 0.93, 0.27]);
				tone(100, 0.1, "sawtooth", 0.06);
				tone(250, 0.06, "square", 0.04, 30);
			}
			// Storm Strike: every 2nd player hit, lightning bolt
			if (g.stormStrike) {
				g._stormStrikeCount = (g._stormStrikeCount || 0) + 1;
				if (g._stormStrikeCount % 2 === 0) {
					const bSpd = g.ballSpd * 1.6;
					g.bolts.push({
						x: g.bx, y: g.by,
						vx: bSpd, vy: rng(-80, 80),
						life: 4, trail: [], zig: 0.1, target: "enemy",
					});
					if (g.bolts.length > MAX_BOLTS) g.bolts.splice(0, g.bolts.length - MAX_BOLTS);
					g.shake = Math.max(g.shake, 0.07);
					g.flash = Math.max(g.flash, 0.12);
					g.flashCol = [1, 0.93, 0.27];
					addSparks(g, g.bx, g.by, 10, 110, [1, 0.93, 0.27]);
					tone(120, 0.08, "sawtooth", 0.05);
				}
			}
			// Phantom Thunder Ball: now fires 3 random-direction stun phantoms every 2 rallies
			if (g.phantomThunder && g._playerHits > 0 && g._playerHits % 2 === 0) {
				const aSpd = g.ballSpd * 1.15;
				for (let ti = 0; ti < 3; ti++) {
					const aAng = (Math.random() - 0.5) * 1.2;
					g.multiBalls.push({
						x: g.bx, y: g.by,
						vx: Math.abs(Math.cos(aAng) * aSpd),
						vy: Math.sin(aAng) * aSpd,
						life: 6.5, trail: [],
						owner: "player", phantom: true, pType: "thunder",
					});
				}
				addSparks(g, g.bx, g.by, 8, 90, [1, 0.93, 0.27]);
				tone(200, 0.06, "square", 0.03);
			}
			// Twin Phantom Slow Balls: now 3 random-direction slow phantoms every 2 rallies
			if (g.phantomSlow && g._playerHits > 0 && g._playerHits % 2 === 0) {
				const aSpd = g.ballSpd * 1.0;
				for (let si = 0; si < 3; si++) {
					const aAng = (Math.random() - 0.5) * 1.2;
					g.multiBalls.push({
						x: g.bx, y: g.by,
						vx: Math.abs(Math.cos(aAng) * aSpd),
						vy: Math.sin(aAng) * aSpd,
						life: 6.5, trail: [],
						owner: "player", phantom: true, pType: "slow",
					});
				}
				addSparks(g, g.bx, g.by, 8, 80, [0.3, 1, 0.4]);
			}
			// Fire Phantom Ball: now fires 3 random-direction fire phantoms every 2 rallies
			if (g.phantomFire && g._playerHits > 0 && g._playerHits % 2 === 0) {
				const aSpd = g.ballSpd * 1.05;
				for (let fi = 0; fi < 3; fi++) {
					const aAng = (Math.random() - 0.5) * 1.2;
					g.multiBalls.push({
						x: g.bx, y: g.by,
						vx: Math.abs(Math.cos(aAng) * aSpd),
						vy: Math.sin(aAng) * aSpd,
						life: 6.5, trail: [],
						owner: "player", phantom: true, pType: "fire",
					});
				}
				addSparks(g, g.bx, g.by, 8, 90, [1, 0.5, 0.15]);
				tone(150, 0.06, "sawtooth", 0.04);
			}
			// Set piercing flag on ball (persists until first enemy blocker contact)
			if (piercing) g._pierce = true;
		}
	}
	if (g.curveNext && g.bx > GW * 0.65) g.curveNext = false;

	// Enemy hit
	const canBlock = true; // g.freezeT <= 0;
	if (
		g.bvx > 0 &&
		g.bx + bs2 > EX - PAD_W / 2 - 2 &&
		g.bx - bs2 < EX + PAD_W / 2 + 2 &&
		g.by + bs2 > g.ey - g.eH / 2 &&
		g.by - bs2 < g.ey + g.eH / 2 &&
		canBlock
	) {
		if (g._pierce) {
			g._pierce = false;
			g.bx = EX + PAD_W / 2 + bs2 + 2;
			g.shake = Math.max(g.shake, 0.06);
			addSparks(g, EX, g.by, 10, 90, [0.85, 0.6, 1]);
			tone(700, 0.04, "sine", 0.03);
		} else {
			const rel = clamp((g.by - g.ey) / (g.eH / 2), -1, 1);
			const am = g.trickAng ? 0.45 : 0.35;
			g.bvx = -Math.abs(Math.cos(rel * Math.PI * am) * g.ballSpd);
			g.bvy = Math.sin(rel * Math.PI * am) * g.ballSpd;
			g.bx = EX - PAD_W / 2 - bs2 - 2;
			// Enemy imparts spin based on its paddle velocity
			{
				const spdRatio = BASE_SPD / Math.max(g.ballSpd, 1);
				g.spin = clamp(g.eVelY * 1.0 * spdRatio, -500, 500);
				g.spinVisAngle = 0;
			}
			g.combo = 0;
			applyRallyHitSpeed(g);
			if (g.chaos) g.bs = Math.min(g.bs * 1.04, 600);
			// enemy hit feels cooler (bluer sparks, a touch more shake)
			SFX.paddle();
			g.shake = 0.03;
			addSparks(g, EX - PAD_W / 2, g.by, 8, 100, [0.5, 0.5, 1]);
			// knockback for enemy paddle when the ball is moving fast
			{
				const curSpd = Math.hypot(g.bvx, g.bvy);
				const KB_THRESH = BASE_SPD * 1.4; // only trigger above roughly 40% faster than base
				if (curSpd > KB_THRESH) {
					// weaker opponents (lower difficulty index) suffer more knockback
					const diffIdxRaw = DIFF_RANKS.indexOf(g.cfg.diff);
					const diffIdx = diffIdxRaw >= 0 ? diffIdxRaw : DIFF_RANKS.length - 1;
					const maxIdx = DIFF_RANKS.length - 1;
					// map 0->1.2, maxIdx->0.4 (can tweak these constants as desired)
					const kbMul = lerp(1.2, 0.4, diffIdx / maxIdx);
					// amount to push: proportional to how much speed exceeds threshold
					const amt = (curSpd - KB_THRESH) * 0.02 * kbMul;
					if (amt > 0) {
						// push vertically away from the ball impact point
						const dir = g.by < g.ey ? -1 : 1;
						g.ey = clamp(g.ey + dir * amt, g.eH / 2, GH - g.eH / 2);
					}
				}
			}
			// Master of Skill: enemy hit resets ball to base speed, +20% base permanently
			if (g.masterSkill && g._masterHitBoosted) {
				g._masterHitBoosted = false;
				g.bs = Math.min(g.bs * 1.2, MAX_BALL_SPD); // permanent 20% base increase per rally hit
				const resetSpd = Math.max(g.bs, g.rallyBase);
				const cur = Math.hypot(g.bvx, g.bvy);
				if (cur > 0.1) {
					const r = resetSpd / cur;
					g.bvx *= r;
					g.bvy *= r;
					g.ballSpd = resetSpd;
				}
			}
			// Spin return: if queued, apply curve to the return
			if (g.spinNext) {
				g.spinNext = false;
				g.spinCurveT = 0.7;
				g._spinDir = Math.sign(g.py - g.by) || (Math.random() > 0.5 ? 1 : -1);
				addSparks(g, EX, g.by, 8, 70, [0.8, 0.8, 0.3]);
			}
			if (g.eAbil.id === "thunderball" && g.eAbilActive > 0) {
				spawnThunderPhantom(g, EX - PAD_W / 2, g.by, BASE_SPD * 1.55, "player");
				g.flash = Math.max(g.flash, 0.12);
				g.flashCol = [1, 0.93, 0.27];
				addSparks(g, EX - PAD_W / 2, g.by, 10, 110, [1, 0.93, 0.27]);
				tone(420, 0.05, "square", 0.035);
			}
		}
	}

	// Doppelganger (phantom paddle on player side)
	if (g.doppel && g.bvx < 0) {
		const dpX = PX_HOME + 60,
			dpY = g.doppelY ?? g.py,
			dpT = dpY - g.ph * 0.4,
			dpB = dpY + g.ph * 0.4;
		const near =
			Math.abs(g.by - dpY) < g.ph * 0.52 && Math.abs(g.bx - dpX) < 30;
		if (
			(g.bx + bs2 > dpX - PAD_W / 2 &&
				g.bx - bs2 < dpX + PAD_W / 2 &&
				g.by > dpT &&
				g.by < dpB &&
				g.bx > PX_HOME + 20) ||
			(near && Math.random() < 0.22)
		) {
			g.bvx = -Math.abs(g.bvx);
			g.bx = dpX - PAD_W / 2 - bs2 - 1;
			// Doppelganger imparts spin from player paddle velocity
			{
				const spdRatio = BASE_SPD / Math.max(g.ballSpd, 1);
				g.spin = clamp(g.pVelY * 1.2 * spdRatio, -600, 600);
			}
			applyRallyHitSpeed(g);
			SFX.paddle();
			addSparks(g, dpX, g.by, 8, 100, col.t);
		}
	}

	// Clone (enemy ability) - second enemy paddle
	if ((g.cloneT > 0 || g.foolClone) && g.bvx > 0) {
		const clX = EX - 35;
		const near =
			Math.abs(g.by - g.cloneY) < g.eH * 0.55 && Math.abs(g.bx - clX) < 32;
		if (
			(g.bx + bs2 > clX - PAD_W / 2 - 2 &&
				g.bx - bs2 < clX + PAD_W / 2 + 2 &&
				g.by + bs2 > g.cloneY - g.eH / 2 &&
				g.by - bs2 < g.cloneY + g.eH / 2) ||
			(near && Math.random() < 0.22)
		) {
			if (g._pierce) {
				g._pierce = false;
				g.bx = clX + PAD_W / 2 + bs2 + 2;
				g.shake = Math.max(g.shake, 0.05);
				addSparks(g, clX, g.by, 8, 80, [0.85, 0.6, 1]);
			} else {
				g.bvx = -Math.abs(g.bvx);
				g.bx = clX - PAD_W / 2 - bs2 - 2;
				// Clone paddle imparts spin from enemy velocity
				{
					const spdRatio = BASE_SPD / Math.max(g.ballSpd, 1);
					g.spin = clamp(g.eVelY * 1.0 * spdRatio, -500, 500);
				}
				applyRallyHitSpeed(g);
				SFX.paddle();
				addSparks(g, clX - PAD_W / 2, g.by, 8, 100, [0.5, 0.5, 1]);
			}
		}
	}

	// Marionettist puppets (string-bound translucent paddles)
	if (g.foolPuppets.length && g.bvx > 0) {
		for (let i = 0; i < g.foolPuppets.length; i++) {
			const p = g.foolPuppets[i];
			if (p.broken) continue;
			const pw = p.w || 8,
				ph = p.h;
			if (
				g.bx + bs2 > p.x - pw / 2 &&
				g.bx - bs2 < p.x + pw / 2 &&
				g.by + bs2 > p.y - ph / 2 &&
				g.by - bs2 < p.y + ph / 2
			) {
				const rel = clamp((g.by - p.y) / (ph / 2), -1, 1);
				const spd = Math.max(Math.hypot(g.bvx, g.bvy), g.ballSpd * 1.04);
				g.bvx = -Math.abs(Math.cos(rel * Math.PI * 0.32) * spd);
				g.bvy = Math.sin(rel * Math.PI * 0.32) * spd;
				g.bx = p.x - pw / 2 - bs2 - 1;
				// Marionette puppet imparts spin from enemy velocity
				{
					const spdRatio = BASE_SPD / Math.max(g.ballSpd, 1);
					g.spin = clamp(g.eVelY * 1.0 * spdRatio, -500, 500);
				}
				applyRallyHitSpeed(g);
				p.broken = true;
				p.fade = 0.9;
				addSparks(g, p.x, p.y, 9, 90, [0.82, 0.82, 0.96]);
				break;
			}
		}
	}

	// Multi balls
	for (let i = g.multiBalls.length - 1; i >= 0; i--) {
		const mb = g.multiBalls[i];
		if (mb.preZapT > 0) mb.preZapT = Math.max(0, mb.preZapT - dt);
		if (mb.zapT > 0) {
			mb.zapT -= dt;
			mb.vx = 0;
			mb.vy = 0;
			if (Math.random() < dt * 14)
				addSparks(g, mb.x, mb.y, 1, 30, [0.8, 0.9, 1]);
			if (mb.zapT <= 0) {
				g.multiBalls.splice(i, 1);
			}
			continue;
		}
		const prevX = mb.x,
			prevY = mb.y;
		mb.life -= dt;
		mb.x += mb.vx * dt;
		mb.y += mb.vy * dt;
		mb.trail.push({ x: mb.x, y: mb.y });
		if (mb.trail.length > 6) mb.trail.shift();
		if (mb.y - bs2 < 0) {
			mb.y = bs2;
			mb.vy = Math.abs(mb.vy);
		}
		if (mb.y + bs2 > GH) {
			mb.y = GH - bs2;
			mb.vy = -Math.abs(mb.vy);
		}
		const owner = mb.owner || "player";
		// Swept enemy collision to prevent tunneling
		if (mb.vx > 0) {
			const eL = EX - PAD_W / 2 - 2;
			if (prevX < eL - bs2 && mb.x > eL + bs2) {
				const tHit = (eL - bs2 - prevX) / (mb.x - prevX);
				const yHit = prevY + (mb.y - prevY) * tHit;
				if (yHit + bs2 >= g.ey - g.eH / 2 && yHit - bs2 <= g.ey + g.eH / 2) {
					if (owner === "player") {
						// Phantom ball effects on enemy contact
						if (mb.phantom && mb.pType === "thunder") {
							g.freezeT = Math.max(g.freezeT, 0.25);
							g.shake = Math.max(g.shake, 0.08);
							addSparks(g, EX, yHit, 12, 100, [1, 0.93, 0.27]);
							tone(100, 0.1, "sawtooth", 0.06);
						} else if (mb.phantom && mb.pType === "slow") {
							g.concussSlowT = Math.max(g.concussSlowT || 0, 0.4);
							addSparks(g, EX, yHit, 8, 80, [0.3, 1, 0.4]);
						} else if (mb.phantom && mb.pType === "fire") {
							g._burnT = 4;
							g._burnTickT = 0;
							addSparks(g, EX, yHit, 12, 100, [1, 0.5, 0.15]);
							tone(150, 0.08, "sawtooth", 0.05);
						} else {
							addSparks(g, EX, yHit, 6, 70, [0.5, 0.85, 1]);
						}
						g.multiBalls.splice(i, 1);
						continue;
					}
					const spd = Math.hypot(mb.vx, mb.vy) || g.ballSpd;
					const rel = clamp((yHit - g.ey) / (g.eH / 2), -1, 1);
					mb.x = eL - bs2 - 1;
					mb.y = yHit;
					mb.vx = -Math.abs(Math.cos(rel * Math.PI * 0.35) * spd);
					mb.vy = Math.sin(rel * Math.PI * 0.35) * spd;
				}
			}
		}
		// Swept player collision to prevent tunneling
		if (mb.vx < 0) {
			const pR = g.px + PAD_W / 2 + 2;
			if (prevX > pR + bs2 && mb.x < pR - bs2) {
				const tHit = (prevX - (pR + bs2)) / (prevX - mb.x);
				const yHit = prevY + (mb.y - prevY) * tHit;
				if (yHit + bs2 >= g.py - g.ph / 2 && yHit - bs2 <= g.py + g.ph / 2) {
					const spd = Math.hypot(mb.vx, mb.vy) || g.ballSpd;
					mb.x = pR + bs2 + 1;
					mb.y = yHit;
					mb.vx = Math.abs(mb.vx);
					mb.vy += clamp(g.pVelY * 0.25, -spd * 0.5, spd * 0.5);
					SFX.paddle();
					addSparks(g, g.px + PAD_W / 2, mb.y, 6, 60, col.t);
				}
			}
		}
		// Clone paddle can block rightward multi balls
		if ((g.cloneT > 0 || g.foolClone) && mb.vx > 0) {
			const clX = EX - 35;
			if (
				mb.x + bs2 > clX - PAD_W / 2 - 2 &&
				mb.x - bs2 < clX + PAD_W / 2 + 2 &&
				mb.y + bs2 > g.cloneY - g.eH / 2 &&
				mb.y - bs2 < g.cloneY + g.eH / 2
			) {
				mb.vx = -Math.abs(mb.vx);
				mb.x = clX - PAD_W / 2 - bs2 - 2;
			}
		}
		if (g.foolPuppets.length && mb.vx > 0) {
			for (let j = 0; j < g.foolPuppets.length; j++) {
				const p = g.foolPuppets[j];
				if (p.broken) continue;
				const pw = p.w || 8,
					ph = p.h;
				if (
					mb.x + bs2 > p.x - pw / 2 &&
					mb.x - bs2 < p.x + pw / 2 &&
					mb.y + bs2 > p.y - ph / 2 &&
					mb.y - bs2 < p.y + ph / 2
				) {
					const rel = clamp((mb.y - p.y) / (ph / 2), -1, 1);
					const spd = Math.max(Math.hypot(mb.vx, mb.vy), g.ballSpd * 0.92);
					mb.vx = -Math.abs(Math.cos(rel * Math.PI * 0.32) * spd);
					mb.vy = Math.sin(rel * Math.PI * 0.32) * spd;
					mb.x = p.x - pw / 2 - bs2 - 1;
					p.broken = true;
					p.fade = 0.8;
					addSparks(g, p.x, p.y, 6, 60, [0.82, 0.82, 0.96]);
					break;
				}
			}
		}
		// Doppel paddle can block leftward multi balls
		if (g.doppel && mb.vx < 0) {
			const dpX = PX_HOME + 60,
				dpY = g.doppelY ?? g.py,
				dpT = dpY - g.ph * 0.4,
				dpB = dpY + g.ph * 0.4;
			if (
				mb.x + bs2 > dpX - PAD_W / 2 &&
				mb.x - bs2 < dpX + PAD_W / 2 &&
				mb.y > dpT &&
				mb.y < dpB
			) {
				mb.vx = Math.abs(mb.vx);
				mb.x = dpX + PAD_W / 2 + bs2 + 1;
			}
		}
		if (g.goalLockT <= 0 && mb.x + bs2 > GW) {
			const prevented = false;
			if (mb.phantom) {
				// Phantom balls don't score, just vanish
				g.multiBalls.splice(i, 1);
				continue;
			}
			if (owner === "player") {
				g.freezeT = Math.max(g.freezeT, 0.22);
				g.abCD = Math.max(0, g.abCD - 0.55);
				g.shake = Math.max(g.shake, 0.045);
				g.flash = 0.1;
				g.flashCol = [0.5, 0.85, 1];
				addSparks(g, GW, mb.y, 8, 82, [0.5, 0.85, 1]);
				if (Math.random() < 0.5)
					g.scorePops.push({
						x: GW - 56,
						y: mb.y,
						text: "BOOST",
						life: 0.62,
						max: 0.62,
						scale: 0.82,
					});
			}
			if (prevented) continue;
			g.multiBalls.splice(i, 1);
			continue;
		}
		if (mb.x - bs2 < 0 && mb.vx < 0) {
			if (mb.phantom) {
				// Phantom balls don't score, just vanish
				g.multiBalls.splice(i, 1);
				continue;
			}
			if (owner === "enemy") {
				if (g.devUnlose) {
					g.shake = Math.max(g.shake, 0.06);
					g.flash = 0.1;
					g.flashCol = [0.6, 0.9, 1];
					addSparks(g, 0, mb.y, 8, 70, [0.6, 0.9, 1]);
					g.multiBalls.splice(i, 1);
					continue;
				}
				if (g.cfg.enemy.id === "thefool") {
					triggerFoolScoreVoice(g, false);
				}
				g.eScore++;
				g.shake = 0.15;
				SFX.miss();
				addSparks(g, 0, mb.y, 10, 80, [1, 0.3, 0.3]);
				g.scoreFlash = 0.5;
				g.scoreFlashSide = -1;
				g.flash = 0.2;
				g.flashCol = [1, 0.2, 0.2];
				if (g.eScore >= g.winScore) {
					if (g.cfg.enemy.id === "thefool")
						g.foolLoseLine =
							FOOL_DEFEAT_LINES[
								Math.floor(Math.random() * FOOL_DEFEAT_LINES.length)
							];
					g.done = true;
					g.result = "lose";
					g.lives--;
				}
			}
			g.multiBalls.splice(i, 1);
			continue;
		}
		if (mb.life <= 0) {
			g.multiBalls.splice(i, 1);
			continue;
		}
		// Fallback overlap checks
		if (
			mb.vx > 0 &&
			mb.x + bs2 > EX - PAD_W / 2 &&
			mb.x - bs2 < EX + PAD_W / 2 &&
			mb.y + bs2 > g.ey - g.eH / 2 &&
			mb.y - bs2 < g.ey + g.eH / 2
		) {
			if (owner === "player") {
				// Phantom ball effects on enemy contact (fallback)
				if (mb.phantom && mb.pType === "thunder") {
					g.freezeT = Math.max(g.freezeT, 0.25);
					g.shake = Math.max(g.shake, 0.08);
					addSparks(g, EX, mb.y, 12, 100, [1, 0.93, 0.27]);
					tone(100, 0.1, "sawtooth", 0.06);
				} else if (mb.phantom && mb.pType === "slow") {
					g.concussSlowT = Math.max(g.concussSlowT || 0, 0.4);
					addSparks(g, EX, mb.y, 8, 80, [0.3, 1, 0.4]);
				} else if (mb.phantom && mb.pType === "fire") {
					g._burnT = 4;
					g._burnTickT = 0;
					addSparks(g, EX, mb.y, 12, 100, [1, 0.5, 0.15]);
					tone(150, 0.08, "sawtooth", 0.05);
				}
				g.multiBalls.splice(i, 1);
				continue;
			}
			mb.vx = -Math.abs(mb.vx);
			mb.x = EX - PAD_W / 2 - bs2 - 1;
		}
		if (
			mb.vx < 0 &&
			mb.x - bs2 < g.px + PAD_W / 2 + 2 &&
			mb.x + bs2 > g.px - PAD_W / 2 - 2 &&
			mb.y + bs2 > g.py - g.ph / 2 &&
			mb.y - bs2 < g.py + g.ph / 2
		) {
			mb.vx = Math.abs(mb.vx);
			mb.x = g.px + PAD_W / 2 + bs2 + 1;
			SFX.paddle();
			addSparks(g, g.px + PAD_W / 2, mb.y, 6, 60, col.t);
		}
	}

	// Scoring
	if (g.goalLockT <= 0 && g.bx - bs2 < 0) {
		if (g.shields > 0 && !g.shUsed) {
			g.shUsed = true;
			g.shields--;
			SFX.paddle();
			addSparks(g, 20, g.by, 18, 140, [0.5, 0.7, 1]);
			resetBall(g, 1);
		} else if (g.angelSteps > 0) {
			// Angel Steps: auto-teleport paddle to ball, reverse ball
			g.angelSteps--;
			g.py = clamp(g.by, g.ph / 2, GH - g.ph / 2);
			g.bvx = Math.abs(g.bvx);
			g.bx = g.px + PAD_W / 2 + bs2 + 2;
			g._angelFlashT = 0.6;
			g.shake = Math.max(g.shake, 0.08);
			g.flash = Math.max(g.flash, 0.15);
			g.flashCol = [1, 1, 0.8];
			addSparks(g, g.px, g.py, 16, 120, [1, 1, 0.7]);
			addSparks(g, g.px, g.py, 8, 60, [1, 0.9, 0.5]);
			tone(500, 0.08, "sine", 0.04);
			tone(700, 0.06, "sine", 0.03, 40);
		} else if (g.devUnlose) {
			g.shake = 0.12;
			g.flash = 0.14;
			g.flashCol = [0.6, 0.9, 1];
			addSparks(g, 12, g.by, 12, 100, [0.6, 0.9, 1]);
			resetBall(g, 1);
		} else {
			g.goalLockT = 0.22;
			if (g.cfg.enemy.id === "thefool") {
				triggerFoolScoreVoice(g, false);
			}
			g.eScore++;
			g.shake = 0.24;
			g.chromaShift = 0.7;
			SFX.miss();
			addSparks(g, 0, g.by, 16, 120, [1, 0.3, 0.3]);
			g.scoreFlash = 1;
			g.scoreFlashSide = -1;
			g.flash = 0.3;
			g.flashCol = [1, 0.2, 0.2];
			if (g.eScore >= g.winScore) {
				if (g.cfg.enemy.id === "thefool")
					g.foolLoseLine =
						FOOL_DEFEAT_LINES[
							Math.floor(Math.random() * FOOL_DEFEAT_LINES.length)
						];
				g.done = true;
				g.result = "lose";
				g.lives--;
			} else resetBall(g, 1);
		}
	}
	if (g.goalLockT <= 0 && g.bx + bs2 > GW) {
		if (
			g.cfg.enemy.id === "thefool" &&
			g.foolMiracle &&
			(g.foolMiracleCharges || 0) > 0
		) {
			g.foolMiracleCharges--;
			g.bx = GW - 26;
			g.bvx = -Math.abs(g.bvx || g.ballSpd);
			g.bvy += (Math.random() - 0.5) * 120;
			g.shake = 0.08;
			g.flash = 0.16;
			g.flashCol = [0.9, 0.9, 1];
			addSparks(g, GW - 20, g.by, 18, 130, [0.9, 0.9, 1]);
			foolSpeak(g, FOOL_ASCENT_LINES["MIRACLE INVOKER"], 2.1);
		} else {
			const scoreAmt =
				g.cfg.enemy.id === "thefool" ? 1 : g.triScore ? 3 : g.dblScore ? 2 : 1;
			if (g.cfg.enemy.id === "thefool") {
				const s = applyFoolGoal(g, scoreAmt);
				g.shake = 0.12;
				g.chromaShift = 0.6;
				SFX.score();
				addSparks(g, GW, g.by, 16, 120, [0.4, 1, 0.5]);
				if (!s.prevented) {
					g.scoreFlash = 1;
					g.scoreFlashSide = 1;
				}
				if (!g.done) resetBall(g, -1);
				g.flash = 0.2;
				g.flashCol = [0.4, 1, 0.5];
				if (g.vampire && g.lives < 6) g.lives++;
			} else {
				g.goalLockT = 0.22;
				g.pScore += scoreAmt;
				g.shake = 0.12;
				g.chromaShift = 0.6;
				SFX.score();
				addSparks(g, GW, g.by, 16, 120, [0.4, 1, 0.5]);
				g.scoreFlash = 1;
				g.scoreFlashSide = 1;
				g.flash = 0.2;
				g.flashCol = [0.4, 1, 0.5];
				if (g.vampire && g.lives < 6) g.lives++;
				// Score pop-up: floating text showing points
				g.scorePops.push({
					x: GW - 40,
					y: g.by,
					text: "+" + scoreAmt,
					life: 0.8,
				});
		if (g.pScore >= g.winScore) {
					g.done = true;
					g.result = "win";
				} else resetBall(g, -1);
			}
		}
	}

	// AI (frozen = no move; enemies CAN move during abilities unless lockdown)
	if (g.freezeT <= 0 && g.lockdownFreezeT <= 0) {
		let tgt = GH / 2;
		// Detect ball direction change - reset target immediately
		const ballDir = g.bvx > 0 ? 1 : g.bvx < 0 ? -1 : 0;
		if (ballDir !== g.aiBallDir) {
			g.aiBallDir = ballDir;
			g.aiTgtTimer = 0;
		}
		// Update AI target on a timer instead of every frame (prevents jitter)
		g.aiTgtTimer -= dt;
		if (g.aiTgtTimer <= 0) {
			g.aiTgtTimer = 0.12 + Math.random() * 0.06; // recompute every ~120-180ms
			if (g.bvx > 0 && !g.ghostBall) {
				let perf = simBallY(g.bx, g.by, g.bvx, g.bvy, EX);
				const perfectAi = g.aiReact >= 0.9;
				if (perfectAi) {
					let bestEta = Infinity;
					const considerThreat = (bx, by, vx, vy) => {
						if (vx <= 0) return;
						const eta = (EX - bx) / Math.max(1, vx);
						if (eta <= 0 || eta > 2.8) return;
						const yHit = simBallY(bx, by, vx, vy, EX);
						if (eta < bestEta) {
							bestEta = eta;
							perf = yHit;
						}
					};
					for (let i = 0; i < g.multiBalls.length; i++) {
						const mb = g.multiBalls[i];
						if ((mb.owner || "player") !== "player") continue;
						if ((mb.zapT || 0) > 0) continue;
						considerThreat(mb.x, mb.y, mb.vx, mb.vy);
					}
				}
					g.aiRandOff = (1 - g.aiReact) * 40 * (Math.random() - 0.5);
				// Spin confuses AI  sluggish tracking, not directional dodge
				if (Math.abs(g.spin) > 15) {
					g.aiRandOff += (Math.random() - 0.5) * Math.abs(g.spin) * 0.3;
				}
				g.aiTgt = lerp(g.by, perf, g.aiReact) + g.aiRandOff;
			} else if (g.ghostBall && g.bvx > 0) {
				g.aiTgt = GH / 2 + Math.sin(g.t * 2.5) * 130;
			} else {
				// Ball heading away: drift smoothly toward center, not snap
				g.aiTgt = lerp(g.aiTgt, GH / 2, 0.15);
			}
			g.aiTgt = clamp(g.aiTgt, g.eH / 2, GH - g.eH / 2);
		}
		tgt = g.aiTgt;
		// --- DELUSIO: AI tracks random position ---
		if (g.delusio && g._delusioT > 0) {
			tgt = GH / 2 + (Math.sin(g.t * 7) * 0.5 + Math.cos(g.t * 11) * 0.5) * GH * 0.4;
		}
		// --- MIRAGE: AI tracks decoy ball ---
		if (g.mirage && g._mirageDecoy && g._mirageDecoy.active) {
			tgt = g._mirageDecoy.y;
		}
		tgt = clamp(tgt, g.eH / 2, GH - g.eH / 2);
		const diff = tgt - g.ey;
		// Dash override
		let curAiSpd = g.dashT > 0 ? g.dashSpd : g.aiSpd;
		// --- ATTRITION (RALLY DECAY): enemy slows with combo ---
		if (g.rallyDecay && g.combo > 0) {
			curAiSpd *= 1 - Math.min(g.combo * 0.03, 0.35);
		}
		// --- SPIN DRAG: enemy slower with spin returns ---
		if (g.spinDrag && g._spinDragMul < 1) {
			curAiSpd *= g._spinDragMul;
		}
		// --- SPEED DEGRADATION: AI struggles past base ball speed ---
		const spdRatio = g.ballSpd / (g.bs || BASE_SPD);
		if (spdRatio > 1.0) {
			const penalty = 1 - Math.min((spdRatio - 1.0) * 0.5, 0.65);
			curAiSpd *= penalty;
		}
		// --- CURVEBALL WEAKNESS: spin tanks both speed and reaction ---
		if (Math.abs(g.spin) > 15) {
			const spinStr = Math.min(Math.abs(g.spin) / 200, 0.6);
			curAiSpd *= (1 - spinStr);
			// Reduce effective lerp toward target (sluggish tracking)
			const reactPenalty = 1 - spinStr * 0.7;
			const diff2 = tgt - g.ey;
			tgt = g.ey + diff2 * reactPenalty;
		}
		// Dead zone prevents micro-jitter when near target
		if (Math.abs(diff) > 2 && g.concussStunT <= 0) {
			const spdMul = g.concussSlowT > 0 ? 0.5 : 1;
			g.ey += Math.sign(diff) * Math.min(Math.abs(diff), curAiSpd * spdMul * dt);
		}
		// Jitter effect
		if (g.jitter) g.ey += Math.sin(g.t * 14) * 1.1;
		g.ey = clamp(g.ey, g.eH / 2, GH - g.eH / 2);
	}

	// F-rank enemies map to `none`; keep spin curve active there as well.
	if (g.eAbil.id === "none") {
		if (g.spinCurveT > 0) {
			g.spinCurveT -= dt;
			const ease = g.spinCurveT / 0.7;
			g.bvy += g._spinDir * 280 * ease * dt;
			g.bvy = clamp(g.bvy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
		}
		if (Math.abs(g.spin) > 15) {
			g.bvy += g.spin * 2 * dt;
			g.bvy = clamp(g.bvy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
			const spdFactor = clamp(g.ballSpd / BASE_SPD, 0.6, 2.5);
			g.spin *= Math.pow(0.35 * spdFactor, dt);
		} else {
			g.spin = 0;
		}
	}

	// --- ENEMY ABILITY SYSTEM ---
	const nullSuppressed = g.nullField && g._nullActiveT > 0;
	if (g.eAbil.id !== "none" && (g.freezeT || 0) <= 0 && !nullSuppressed) {
		// Cooldown tick
		if (g.eAbilCD > 0) g.eAbilCD -= dt;
		if (g.wStormCD > 0) g.wStormCD -= dt;
		if (g.eAbilActive > 0) g.eAbilActive -= dt;
		if (g.eAbil.id === "clowncurse" && g.eAbilActive > 0) {
			g.ctrlInvertT = Math.max(g.ctrlInvertT, 0.18);
			g.foolClownTick -= dt;
			if (g.foolClownTick <= 0 && g.startPause <= 0) {
				const confCols = [
					[1, 0.35, 0.84],
					[1, 0.84, 0.29],
					[0.33, 0.91, 1],
					[0.54, 1, 0.46],
					[1, 0.54, 0.35],
				];
				for (let i = 0; i < 4; i++) {
					const c = confCols[(Math.random() * confCols.length) | 0];
					addSparks(g, g.px + rng(-24, 24), g.py + rng(-32, 32), 5, 85, c);
				}
				g.foolClownTick = 0.1 + Math.random() * 0.08;
			}
		}
		if (g.eAbil.id === "marionette" && g.eAbilActive <= 0 && g.foolPuppets.length) {
			g.foolPuppets.length = 0;
		}
		if (g.dashT > 0) g.dashT -= dt;
		if (g.blinkT > 0) g.blinkT -= dt;
		if (g.blinkFlash > 0) g.blinkFlash -= dt * 4;
		if (g.bulkT > 0) {
			g.bulkT -= dt;
		}
		if (g.overdriveT > 0) {
			g.overdriveT -= dt;
			g.ballSpd = g.rallyBase * 1.5;
			if (g.overdriveT <= 0) g.ballSpd = g.rallyBase;
		}
		if (g.cloneT > 0 || g.foolClone) {
			if (g.cloneT > 0) g.cloneT -= dt;
			const clX = EX - 35;
			const threatY = pickIncomingThreatY(g, clX, 1);
			const aim = threatY === null ? g.by : lerp(g.by, threatY, 0.7);
			g.cloneY = lerp(g.cloneY, aim, dt * 8.2);
			g.cloneY = clamp(g.cloneY, g.eH / 2, GH - g.eH / 2);
		}
		if (g.spinCurveT > 0) {
			g.spinCurveT -= dt;
			const ease = g.spinCurveT / 0.7;
			g.bvy += g._spinDir * 280 * ease * dt;
			g.bvy = clamp(g.bvy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
		}
		// Continuous spin: curve the ball in mid-air, decay over time
		// Decay scales with ball speed so spin persists equally for slow and fast balls
		if (Math.abs(g.spin) > 15) {
			g.bvy += g.spin * 2 * dt;
			g.bvy = clamp(g.bvy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
			const spdFactor = clamp(g.ballSpd / BASE_SPD, 0.6, 2.5);
			g.spin *= Math.pow(0.35 * spdFactor, dt);
		} else {
			g.spin = 0;
		}

		// Pull active - decelerates ball and curves toward enemy
		if (g.pullT > 0) {
			g.pullT -= dt;
			g.bvx += 220 * dt; // drag ball back toward enemy side
			g.bvx = Math.min(g.bvx, g.ballSpd * 1.3);
			const pullY = g.ey - g.by;
			g.bvy += Math.sign(pullY) * 45 * dt;
		}

		// Timestop active
		if (g.tsT > 0) {
			g.tsT -= dt;
			g.bvx = 0;
			g.bvy = 0; // ball frozen
			if (g.tsT <= 0) {
				// Release: ball continues with stored velocity
				g.bvx = g.tsBallVx;
				g.bvy = g.tsBallVy;
			}
		}

		// Voidpulse active
		if (g.vpT > 0) {
			g.vpT -= dt;
		}

		// Lightning phases
		if (g.eAbilPhase === "channel") {
			g.ltChannel -= dt;
			// Generate crackling bolt segments
			if (Math.random() < dt * 30) {
				const bx = g.bx,
					by = g.by;
				const segs = [];
				let lx = EX,
					ly = g.ey;
				for (let i = 0; i < 8; i++) {
					const nx = lerp(lx, bx, (i + 1) / 8) + (Math.random() - 0.5) * 40;
					const ny = lerp(ly, by, (i + 1) / 8) + (Math.random() - 0.5) * 30;
					segs.push({ x1: lx, y1: ly, x2: nx, y2: ny });
					lx = nx;
					ly = ny;
				}
				g.ltBolts.push({ segs, life: 0.12 });
				g.ltBoltX = bx;
				g.ltBoltY = by;
				if (g.ltBolts.length > MAX_BOLTS)
					g.ltBolts.splice(0, g.ltBolts.length - MAX_BOLTS);
			}
			if (g.ltChannel <= 0) {
				// STRIKE: stun ball and launch at player
				g.eAbilPhase = "strike";
				g.ltStun = 0.5;
				const launchSpd = g.ballSpd * 2.5;
				const spread = rng(-0.5, 0.5);
				g.ltLaunchVx = -launchSpd * Math.cos(spread);
				g.ltLaunchVy = launchSpd * Math.sin(spread);
				// Generate massive bolt on impact
				const segs = [];
				let lx = EX,
					ly = g.ey;
				for (let i = 0; i < 12; i++) {
					const nx = lerp(lx, g.bx, (i + 1) / 12) + (Math.random() - 0.5) * 25;
					const ny = lerp(ly, g.by, (i + 1) / 12) + (Math.random() - 0.5) * 20;
					segs.push({ x1: lx, y1: ly, x2: nx, y2: ny });
					lx = nx;
					ly = ny;
				}
				g.ltBolts.push({ segs, life: 0.35 });
				if (g.ltBolts.length > MAX_BOLTS)
					g.ltBolts.splice(0, g.ltBolts.length - MAX_BOLTS);
				g.shake = 0.2;
				g.flash = 0.3;
				g.flashCol = [0.5, 0.6, 1];
				g.chromaShift = 0.6;
				addSparks(g, g.bx, g.by, 24, 200, [0.5, 0.6, 1]);
				tone(180, 0.15, "sawtooth", 0.08);
				tone(90, 0.25, "sawtooth", 0.06, 60);
				// Store ball pos for stun
				g.ltBoltX = g.bx;
				g.ltBoltY = g.by;
			}
		}
		if (g.eAbilPhase === "strike") {
			g.ltStun -= dt;
			// Ball fully stunned - zero velocity, position jitters
			g.bvx = 0;
			g.bvy = 0;
			if (g.ltStun <= 0) {
				// LAUNCH: ball flies at player with insane momentum
				if (Math.abs(g.ltLaunchVx) > 0 || Math.abs(g.ltLaunchVy) > 0) {
					g.bvx = g.ltLaunchVx;
					g.bvy = g.ltLaunchVy;
				} else {
					const launchSpd = g.ballSpd * 2.5;
					const spread = rng(-0.5, 0.5);
					g.bvx = -launchSpd * Math.cos(spread);
					g.bvy = launchSpd * Math.sin(spread);
				}
				g.ltLaunchVx = 0;
				g.ltLaunchVy = 0;
				g.eAbilPhase = "idle";
				g.spin = 0; // reset spin on lightning launch
				g.shake = 0.2;
				addSparks(g, g.bx, g.by, 20, 180, [0.6, 0.7, 1]);
				tone(600, 0.06, "square", 0.05);
				tone(300, 0.1, "square", 0.04, 40);
			}
		}
		if (
			g.eAbil.id === "lightning" &&
			(g.eAbilPhase === "channel" || g.eAbilPhase === "strike")
		)
			g.trail.length = 0;

		// Bolt lifetime decay
		for (let i = g.ltBolts.length - 1; i >= 0; i--) {
			g.ltBolts[i].life -= dt;
			if (g.ltBolts[i].life <= 0) g.ltBolts.splice(i, 1);
		}
		// warden storm bolts timer
		if (g.wStormActive) {
			g.wStormT -= dt;
			if (g.wStormT <= 0) {
				g.wStormActive = false;
			} else {
				const preZapDelay = 0.5;
				const zapDelay = 0.5;
				const makeZapSegs = (tx, ty, steps = 7, jitter = 16) => {
					const segs = [];
					let lx = EX,
						ly = g.ey;
					for (let i = 0; i < steps; i++) {
						const p = (i + 1) / steps;
						const nx = lerp(lx, tx, p) + (Math.random() - 0.5) * jitter;
						const ny = lerp(ly, ty, p) + (Math.random() - 0.5) * jitter;
						segs.push({ x1: lx, y1: ly, x2: nx, y2: ny });
						lx = nx;
						ly = ny;
					}
					segs.push({ x1: lx, y1: ly, x2: tx, y2: ty });
					return segs;
				};
				if (g.multiBalls.length) {
					for (let i = 0; i < g.multiBalls.length; i++) {
						const mb = g.multiBalls[i];
						if (mb.zapT > 0) continue;
						if (!mb.stormMarked) {
							mb.stormMarked = true;
							mb.preZapT = preZapDelay;
							continue;
						}
						if ((mb.preZapT || 0) > 0) continue;
						if (i < 5) {
							g.ltBolts.push({
								segs: makeZapSegs(mb.x, mb.y, 7, 18),
								life: 0.22,
								storm: true,
							});
							if (g.ltBolts.length > MAX_BOLTS)
								g.ltBolts.splice(0, g.ltBolts.length - MAX_BOLTS);
						}
						addSparks(g, mb.x, mb.y, 6, 80, [0.8, 0.9, 1]);
						mb.zapT = zapDelay;
						mb.vx = 0;
						mb.vy = 0;
					}
				}
				// longer gaps if ball is stunned
				const extra = g.ltStun > 0 ? dt * 0.5 : 0;
				g.wStormNextBolt -= dt + extra;
				if (g.wStormNextBolt <= 0 && g.startPause <= 0) {
					const bSpd = BASE_SPD * 1.2;
					g.bolts.push({
						x: EX - PAD_W / 2,
						y: g.ey,
						vx: -bSpd,
						vy: rng(-120, 120),
						life: 4,
						trail: [],
						zig: 0.12,
						target: "player",
						fromWarden: true,
					});
					g.wStormNextBolt =
						0.5 + Math.random() * 0.5 + (g.ltStun > 0 ? 0.5 : 0);
					tone(400, 0.05, "sawtooth", 0.04);
				}
			}
		}

		// AI ability usage timing
		// Warden special: thunderstorm
		if (g.cfg.enemy.id === "warden") {
			if (!g.wStormActive) {
				if (g.wStormCD <= 0) {
					// activate when ball is on player side and moving away
					if (g.bvx < 0 && g.bx < GW * 0.3) {
						g.wStormActive = true;
						g.wStormT = 10;
						g.wStormNextBolt = 0;
						g.wStormCD = 40;
					}
				}
			}
			// make normal lightning free while special active
			if (g.wStormActive) {
				g.eAbilCD = 0;
			}
		}
		if (g.eAbilCD <= 0 && g.eAbilPhase === "idle") {
			const ab = g.eAbil;
			const ballApproaching = g.bvx > 0 && g.bx > GW * 0.3;
			const ballClose = g.bvx > 0 && g.bx > GW * 0.55;
			let shouldCast = false;

			switch (ab.id) {
				case "dash":
					// Dash only when ball is close AND enemy is far from where ball will land
					if (ballClose && Math.abs(g.ey - g.by) > g.eH * 0.8) {
						shouldCast = true;
					}
					break;
				case "blink":
					// Blink when ball is heading toward enemy
					if (ballApproaching && g.eAbilActive <= 0) {
						shouldCast = true;
					}
					break;
				case "lightning":
					// Channel when ball is safely on player side heading away
					if (g.bvx < 0 && g.bx < GW * 0.35) {
						shouldCast = true;
					}
					break;
				case "thunderball":
					if (ballApproaching && g.eAbilActive <= 0) {
						shouldCast = true;
					}
					break;
				case "clowncurse":
					if (g.bvx < 0 && g.bx < GW * 0.55 && g.eAbilActive <= 0) {
						shouldCast = true;
					}
					break;
				case "marionette":
					if (ballApproaching && g.eAbilActive <= 0) {
						shouldCast = true;
					}
					break;
				case "voidpulse":
					// Void pulse when ball is very close and about to pass them
					if (
						g.bvx > 0 &&
						g.bx > GW * 0.7 &&
						Math.abs(g.by - g.ey) < g.eH * 1.5
					) {
						shouldCast = true;
					}
					break;
				case "rampage":
					// Fire rampage when ball is heading toward player (safe to attack)
					if (g.bvx < 0 && g.bx < GW * 0.4) {
						shouldCast = true;
					}
					break;
				case "accel":
					// Overdrive when ball is heading toward player
					if (g.bvx < 0 && g.bx < GW * 0.5) {
						shouldCast = true;
					}
					break;
				case "clone":
					// Clone when ball is heading toward them
					if (ballApproaching && g.bx > GW * 0.4) {
						shouldCast = true;
					}
					break;
			}

			if (g.startPause > 0) shouldCast = false;
			if (shouldCast) {
				g.eAbilCD = ab.cd;
				if (g.reflexSlow) g._reflexSlowT = 1.0;
				// Ability activation flash + announcement
				g._eAbilFlash = 1.5;
				g._eAbilFlashName = ab.name;
				g.shake = Math.max(g.shake, 0.08);
				// Execute ability
				switch (ab.id) {
					case "dash":
						g.dashT = ab.dur;
						g.dashSpd = g.aiSpd * 3.5;
						addSparks(g, EX, g.ey, 8, 60, [1, 0.8, 0.5]);
						tone(500, 0.04, "square", 0.04);
						break;
					case "blink":
						g.eAbilActive = ab.dur;
						g.blinkT = ab.dur;
						tone(300, 0.08, "sine", 0.04);
						tone(150, 0.12, "sine", 0.03, 50);
						break;
					case "lightning":
						g.eAbilPhase = "channel";
						g.ltChannel = 0.7;
						tone(80, 0.3, "sawtooth", 0.04);
						tone(120, 0.4, "sawtooth", 0.03, 100);
						break;
					case "thunderball":
						g.eAbilActive = ab.dur;
						g.flash = Math.max(g.flash, 0.12);
						g.flashCol = [1, 0.93, 0.27];
						addSparks(g, EX, g.ey, 12, 80, [1, 0.93, 0.27]);
						tone(190, 0.1, "sawtooth", 0.05);
						tone(380, 0.06, "square", 0.03, 30);
						break;
					case "clowncurse":
						g.eAbilActive = ab.dur;
						g.ctrlInvertT = Math.max(g.ctrlInvertT, ab.dur);
						g.foolClownTick = 0.05;
						g.flash = Math.max(g.flash, 0.14);
						g.flashCol = [1, 0.36, 0.72];
						addSparks(g, g.px, g.py, 22, 130, [1, 0.35, 0.84]);
						addSparks(g, g.px, g.py, 18, 120, [0.33, 0.91, 1]);
						tone(620, 0.06, "square", 0.04);
						tone(260, 0.08, "sawtooth", 0.03, 30);
						break;
					case "marionette":
						g.eAbilActive = ab.dur;
						// 3 evenly spaced marionettes across the field
						{
							const ph = Math.max(48, g.eH * 0.72);
							const spacing = GH / 4;
							g.foolPuppets = [
								{ x: EX - 150, y: spacing, ax: EX - 170, h: ph, w: 8, a: 0.55, broken: false, fade: 1 },
								{ x: EX - 110, y: spacing * 2, ax: EX - 130, h: ph, w: 8, a: 0.55, broken: false, fade: 1 },
								{ x: EX - 150, y: spacing * 3, ax: EX - 170, h: ph, w: 8, a: 0.55, broken: false, fade: 1 },
							];
						}
						g.flash = Math.max(g.flash, 0.12);
						g.flashCol = [1, 0.34, 0.34];
						addSparks(g, EX - 100, g.ey, 16, 110, [0.95, 0.8, 0.85]);
						tone(210, 0.08, "sine", 0.04);
						tone(310, 0.06, "square", 0.03, 40);
						break;
					case "voidpulse":
						g.vpT = 0.6;
						g.vpX = EX;
						g.vpY = g.ey;
						// Reverse ball at 2x speed + push player paddle + brief freeze
						g.bvx = clamp(-Math.abs(g.bvx) * 2, -MAX_BALL_SPD, MAX_BALL_SPD);
						g.bvy = clamp(g.bvy + (Math.random() - 0.5) * 300, -MAX_BALL_SPD, MAX_BALL_SPD);
						g.py += g.by < GH / 2 ? 160 : -160;
						g.py = clamp(g.py, g.ph / 2, GH - g.ph / 2);
						g.pStunT = Math.max(g.pStunT, 0.5); // freeze player briefly
						g.shake = 0.25;
						g.flash = 0.3;
						g.flashCol = [0.6, 0.2, 0.8];
						g.chromaShift = 0.7;
						addSparks(g, EX - 40, g.ey, 24, 200, [0.6, 0.2, 0.8]);
						tone(100, 0.2, "sawtooth", 0.07);
						tone(60, 0.3, "sawtooth", 0.05, 80);
						break;
					case "rampage":
						{
							const spd = g.ballSpd * 1.4;
							const ang = -0.08 + (Math.random() - 0.5) * 0.16;
							g.multiBalls.push({
								x: EX - 20,
								y: g.ey,
								vx: -Math.cos(ang) * spd,
								vy: Math.sin(ang) * spd,
								life: 2.5,
								trail: [],
								owner: "enemy",
							});
						}
						if (g.multiBalls.length > MAX_MULTI)
							g.multiBalls.splice(0, g.multiBalls.length - MAX_MULTI);
						g.shake = 0.15;
						g.flash = 0.2;
						g.flashCol = [1, 0.2, 0.2];
						g.chromaShift = 0.5;
						addSparks(g, EX - 20, g.ey, 20, 160, [1, 0.3, 0.3]);
						tone(80, 0.2, "sawtooth", 0.08);
						tone(150, 0.15, "square", 0.06, 40);
						tone(60, 0.25, "sawtooth", 0.05, 100);
						break;
					case "accel":
						// Overdrive: ball accelerates to 2x speed for 2s
						g.overdriveT = ab.dur;
						g.shake = 0.1;
						g.flash = 0.15;
						g.flashCol = [1, 0.6, 0.2];
						addSparks(g, g.bx, g.by, 16, 140, [1, 0.6, 0.2]);
						tone(300, 0.08, "square", 0.05);
						tone(500, 0.06, "square", 0.04, 30);
						break;
					case "clone":
						// Clone: phantom paddle appears offset from enemy
						g.cloneT = 3;
						g.cloneY = g.ey;
						addSparks(g, EX - 30, g.ey, 12, 80, [0.5, 0.5, 1]);
						tone(400, 0.06, "sine", 0.04);
						tone(600, 0.08, "sine", 0.03, 30);
						break;
				}
			}
		}
	}
	// Tutorial: update monitoring and track conditions (skip check phase  already ticked above)
	if (tut && tut.active && tut.phase !== "check") updateTutorial(dt);
}

function ricoB(gg) {
	if (!gg.rico) return;
	const s = Math.hypot(gg.bvx, gg.bvy);
	if (s < 0.01) return;
	const n = Math.min(s * 1.05, MAX_BALL_SPD);
	gg.bvx *= n / s;
	gg.bvy *= n / s;
	gg.ballSpd = n;
	gg.rallyBase = n;
}

// --- DRAW ---
let _sp = null;
function getSP(ctx) {
	if (_sp) return _sp;
	const c = document.createElement("canvas");
	c.width = 4;
	c.height = 4;
	const x = c.getContext("2d");
	x.fillStyle = "rgba(0,0,0,0.08)";
	x.fillRect(0, 0, 4, 1);
	x.fillStyle = "rgba(0,0,0,0.02)";
	x.fillRect(0, 2, 4, 1);
	_sp = ctx.createPattern(c, "repeat");
	return _sp;
}

let _bg = null;
function getBG(ctx) {
	if (_bg) return _bg;
	_bg = document.createElement("canvas");
	_bg.width = GW;
	_bg.height = GH;
	const bx = _bg.getContext("2d");
	const grd = bx.createLinearGradient(0, 0, 0, GH);
	grd.addColorStop(0, "#0a0a0e");
	grd.addColorStop(1, "#14141a");
	bx.fillStyle = grd;
	bx.fillRect(0, 0, GW, GH);
	bx.fillStyle = "rgba(255,255,255,0.02)";
	for (let y = 0; y < GH; y += 2) bx.fillRect(0, y, GW, 1);
	const vg = bx.createRadialGradient(GW / 2, GH / 2, 100, GW / 2, GH / 2, 800);
	vg.addColorStop(0, "rgba(0,0,0,0)");
	vg.addColorStop(1, "rgba(0,0,0,0.6)");
	bx.fillStyle = vg;
	bx.fillRect(0, 0, GW, GH);
	return _bg;
}

function drawSmokeTextAura(ctx, x, y, t, intensity = 1) {
	const a = 0.028 * intensity;
	for (let i = 0; i < 10; i++) {
		const ang = t * 0.32 + i * 0.62;
		const rx = 12 + (i % 4) * 5 + Math.sin(t * 0.75 + i) * 1.2;
		const ry = 7 + (i % 3) * 3 + Math.cos(t * 0.85 + i * 0.7) * 1.1;
		const cx = x + Math.cos(ang) * rx;
		const cy = y + Math.sin(ang * 1.05) * ry;
		ctx.globalAlpha = a * (0.75 + 0.25 * Math.sin(t * 0.9 + i));
		ctx.fillStyle = "rgba(220,220,245,0.9)";
		ctx.beginPath();
		ctx.arc(cx, cy, 4.2 + (i % 2), 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

function draw(ctx, cw, ch) {
	// Tutorial intro/enemySelect: render on black canvas even without a game
	if (!g) {
		if (tut && tut.active && tut.phase === "intro") {
			const sx = cw / GW, sy = ch / GH;
			ctx.clearRect(0, 0, cw, ch);
			ctx.save();
			ctx.scale(sx, sy);
			const ia = Math.min(1, tut.introAlpha);
			ctx.globalAlpha = 0.85 * ia;
			ctx.fillStyle = "#080812";
			ctx.fillRect(0, 0, GW, GH);
			ctx.globalAlpha = 0.15 * ia;
			ctx.fillStyle = "#fff";
			ctx.fillRect(GW / 2 - 60, GH / 2 - 56, 120, 1);
			ctx.globalAlpha = ia;
			ctx.fillStyle = "#fff";
			ctx.font = 'bold 38px "Share Tech Mono",monospace';
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.shadowColor = "rgba(255,255,255,0.25)";
			ctx.shadowBlur = 20;
			ctx.fillText("TUTORIAL", GW / 2, GH / 2 - 34);
			ctx.shadowBlur = 0;
			ctx.globalAlpha = 0.15 * ia;
			ctx.fillStyle = "#fff";
			ctx.fillRect(GW / 2 - 60, GH / 2 - 12, 120, 1);
			ctx.globalAlpha = 0.65 * ia;
			ctx.fillStyle = "#b0b2c0";
			ctx.font = '15px "Share Tech Mono",monospace';
			ctx.fillText("Learn the basics before your first match", GW / 2, GH / 2 + 10);
			const pulse = 0.4 + 0.6 * Math.sin((performance.now() / 1000) * 3);
			ctx.globalAlpha = pulse * 0.55 * ia;
			ctx.fillStyle = "#8890a0";
			ctx.font = '13px "Share Tech Mono",monospace';
			ctx.fillText("PRESS ANY KEY TO START", GW / 2, GH / 2 + 48);
			ctx.globalAlpha = 0.7 * ia;
			ctx.fillStyle = "#aab";
			ctx.font = 'bold 13px "Share Tech Mono",monospace';
			ctx.fillText("[ESC] SKIP TUTORIAL", GW / 2, GH / 2 + 72);
			ctx.globalAlpha = 1;
			ctx.restore();
		}
		return;
	}
	const sx = cw / GW,
		sy = ch / GH;
	ctx.clearRect(0, 0, cw, ch);
	ctx.save();
	const chroma = g.chromaShift * 3;
	ctx.translate(g.shX * sx, g.shY * sy);
	ctx.scale(sx, sy);
	const col = PCOL[g.padId];
	const dCol = DIFF_COLORS[g.cfg.diff] || "#fff";
	// draw cached base background (vignette + fill)
	ctx.drawImage(getBG(ctx), -10, -10, GW + 20, GH + 20);
	if (g.foolDistortT > 0) {
		const da = Math.min(1, g.foolDistortT / 8);
		ctx.globalAlpha = 0.08 * da;
		ctx.fillStyle = "rgba(200,200,220,1)";
		const sliceH = 8;
		for (let y = 0; y < GH; y += sliceH) {
			const off = Math.sin(g.t * 22 + y * 0.12) * 5 * da;
			ctx.fillRect(off, y, GW, sliceH * 0.45);
		}
		ctx.globalAlpha = 1;
	}
	if (g.foolFog) {
		const fog = ctx.createLinearGradient(GW * 0.45, 0, GW, 0);
		fog.addColorStop(0, "rgba(0,0,0,0)");
		fog.addColorStop(1, "rgba(0,0,0,0.5)");
		ctx.fillStyle = fog;
		ctx.fillRect(GW * 0.45, 0, GW * 0.55, GH);
		const aura = 0.4 + 0.6 * Math.sin(g.t * 1.8);
		ctx.globalAlpha = 0.07 + 0.06 * aura;
		ctx.strokeStyle = "rgba(210,210,240,0.6)";
		ctx.lineWidth = 1;
		for (let i = 0; i < 5; i++) {
			const r = 80 + i * 34 + Math.sin(g.t * 2 + i) * 8;
			ctx.beginPath();
			ctx.arc(EX, g.ey, r, Math.PI * 0.65, Math.PI * 1.35);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	if (g.flash > 0) {
		const [r, g2, b] = g.flashCol;
		ctx.fillStyle = `rgba(${(r * 255) | 0},${(g2 * 255) | 0},${(b * 255) | 0},${g.flash * 0.055})`;
		ctx.fillRect(0, 0, GW, GH);
	}
	if (g.scoreFlash > 0) {
		const sf = g.scoreFlash,
			side = g.scoreFlashSide;
		const grd = ctx.createLinearGradient(
			side > 0 ? GW : 0,
			0,
			side > 0 ? GW - 280 : 280,
			0,
		);
		const [r, g2, b] = g.flashCol;
		grd.addColorStop(
			0,
			`rgba(${(r * 255) | 0},${(g2 * 255) | 0},${(b * 255) | 0},${sf * 0.07})`,
		);
		grd.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = grd;
		ctx.fillRect(0, 0, GW, GH);
	}
	if (g.abilFlash > 0) {
		const af = g.abilFlash,
			p = 0.4 + 0.6 * (1 - af);
		ctx.globalAlpha = af * 0.15;
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 3;
		ctx.shadowColor = col.g + "0.6)";
		ctx.shadowBlur = 16;
		const r = 30 + af * 80;
		ctx.beginPath();
		ctx.arc(g.px, g.py, r, 0, Math.PI * 2);
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Time warp zone indicators
	if (g.timewarp) {
		ctx.fillStyle = "rgba(100,50,200,0.035)";
		ctx.fillRect(GW * 0.65, 0, GW * 0.35, GH);
		ctx.fillStyle = "rgba(200,100,50,0.035)";
		ctx.fillRect(0, 0, GW * 0.35, GH);
	}

	ctx.shadowColor = col.g + "0.25)";
	ctx.shadowBlur = 3;
	ctx.fillStyle = "#888";
	for (let y = 6; y < GH; y += 20) ctx.fillRect(GW / 2 - 1.5, y, 3, 12);
	ctx.shadowBlur = 0;

	// Scores
	ctx.textAlign = "center";
	ctx.textBaseline = "top";
	ctx.font = 'bold 80px "Share Tech Mono",monospace';
	ctx.shadowColor = col.g + "0.22)";
	ctx.shadowBlur = 22;
	ctx.fillStyle = "rgba(255,255,255,0.1)";
	ctx.fillText(g.pScore, GW / 2 - 100, 16);
	ctx.fillText(g.eScore, GW / 2 + 100, 16);
	ctx.shadowBlur = 8;
	ctx.fillStyle = "#fff";
	ctx.fillText(g.pScore, GW / 2 - 100, 16);
	ctx.fillText(g.eScore, GW / 2 + 100, 16);
	ctx.shadowBlur = 0;

	// Difficulty badge in top center (suppressed for The Fool for cleaner aura presentation)
	if (g.cfg.enemy.id !== "thefool") {
		ctx.font = 'bold 12px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillStyle = dCol;
		ctx.shadowColor = dCol;
		ctx.shadowBlur = 6;
		ctx.fillText(g.cfg.diff + (g.cfg.boss ? " BOSS" : ""), GW / 2, 4);
		ctx.shadowBlur = 0;
	}
	// Curve / homing indicator
	{
		const labels = [];
		if (g.curveNext && g.bvx > 0) labels.push("CURVE");
		if (g.homing && g.bvx > 0) labels.push("HOMING");
		if (g.redirect && g.bvx > 0 && !g._redirectUsed) labels.push("REDIRECT");
		if (labels.length) {
			ctx.font = 'bold 10px "Share Tech Mono",monospace';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			const ca = 0.5 + 0.3 * Math.sin(g.t * 5);
			ctx.fillStyle = "rgba(140,255,180," + ca + ")";
			ctx.fillText(labels.join(" + "), GW / 2, 18);
		}
	}
	const showFoolDialogBlocking =
		g.cfg.enemy.id === "thefool" && g.foolDialogActive && g.foolDialogBlocking;
	const showFoolAsc =
		g.cfg.enemy.id === "thefool" &&
		g.foolAscT > 0 &&
		g.foolAscLabel &&
		!showFoolDialogBlocking;
	const showFoolSpec =
		g.cfg.enemy.id === "thefool" &&
		g.foolSpecT > 0 &&
		g.foolSpecTextT > 0 &&
		!showFoolDialogBlocking &&
		!showFoolAsc;
	const showFoolSwap =
		g.cfg.enemy.id === "thefool" &&
		g.foolSwapT > 0 &&
		!showFoolDialogBlocking &&
		!showFoolAsc &&
		!showFoolSpec;
	const showFoolLine =
		g.cfg.enemy.id === "thefool" &&
		g.foolLineT > 0 &&
		!showFoolDialogBlocking &&
		!showFoolAsc &&
		!showFoolSpec &&
		!showFoolSwap;
	const majorTextBusy =
		showFoolDialogBlocking ||
		showFoolAsc ||
		showFoolSpec ||
		showFoolSwap ||
		showFoolLine;
	// center-screen special ability indicator
	if (g.wStormActive && !majorTextBusy) {
		const pulse = 0.55 + 0.45 * Math.sin(g.t * 6);
		ctx.fillStyle = "#aee";
		ctx.font = 'bold 18px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(136,200,255,0.75)";
		ctx.shadowBlur = 16;
		ctx.globalAlpha = 0.65 + 0.35 * pulse;
		ctx.fillText("ENEMY SPECIAL: THUNDERSTORM", GW / 2, GH * 0.28);
		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
	}
	if (showFoolSpec) {
		const pulse = 0.55 + 0.45 * Math.sin(g.t * 6.5);
		drawSmokeTextAura(ctx, GW / 2, GH * 0.31, g.t, 1.35);
		ctx.fillStyle = "#e5e5f4";
		ctx.font = 'bold 17px "Times New Roman",serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(215,215,245,0.95)";
		ctx.shadowBlur = 18;
		ctx.globalAlpha = 0.62 + 0.34 * pulse;
		ctx.fillText(
			"ENEMY SPECIAL: " + (g.foolSpecLabel || "THE FOOL"),
			GW / 2,
			GH * 0.31,
		);
		const say = (g.foolSpecSay || "").slice(
			0,
			Math.floor(g.foolSpecSayShow || 0),
		);
		if (say) {
			drawSmokeTextAura(ctx, GW / 2, GH * 0.31 + 20, g.t + 1.1, 1.1);
			ctx.globalAlpha = 0.88;
			ctx.fillStyle = "rgba(230,230,250,0.96)";
			ctx.font = 'italic 12px "Times New Roman",serif';
			ctx.shadowColor = "rgba(210,210,245,0.85)";
			ctx.shadowBlur = 12;
			ctx.fillText("" + say + "", GW / 2, GH * 0.31 + 20);
		}
		ctx.globalAlpha = 1;
		ctx.shadowBlur = 0;
	}
	if (showFoolSwap) {
		const pulse = 0.4 + 0.6 * Math.sin(g.t * 9.5);
		ctx.globalAlpha = 0.45 + 0.4 * pulse;
		ctx.fillStyle = "rgba(235,235,255,0.9)";
		ctx.font = 'bold 18px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(220,220,255,0.95)";
		ctx.shadowBlur = 18;
		ctx.fillText(
			"YOU WERE THE FOOL  THE BOARD WAS YOUR MIRROR",
			GW / 2,
			GH * 0.42,
		);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	if (showFoolAsc) {
		const total = Math.max(0.001, g.foolAscMax || 1);
		const elapsed = total - g.foolAscT;
		const animHold = 0.24,
			animMoveDur = 1.0,
			animDur = animHold + animMoveDur,
			preQuoteGap = 0.72,
			quoteDur = 1.05,
			postGap = 0.35;
		const quoteStart = animDur + preQuoteGap;
		const quoteEnd = quoteStart + quoteDur;
		const moveT =
			elapsed <= animHold
				? 0
				: Math.max(
						0,
						Math.min(1, (elapsed - animHold) / Math.max(0.001, animMoveDur)),
					);
		const fadeT = Math.min(1, moveT * 1.55);
		const centerY = GH * 0.3;
		const step = 24;
		const topY = centerY - step;
		const bottomY = centerY + step;
		const fromLabel = g.foolAscFromLabel || g.foolAscLabel;
		const toLabel = g.foolAscToLabel || g.foolAscLabel;
		const tailStart = Math.max(0, total - 0.12);
		const fadeOut =
			elapsed > tailStart ? Math.max(0, 1 - (elapsed - tailStart) / 0.12) : 1;

		ctx.fillStyle = "#e6e6f6";
		ctx.font = 'bold 22px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(196,196,236,0.75)";
		ctx.shadowBlur = 10;

		if (moveT <= 0 && fromLabel) {
			ctx.globalAlpha = 0.95 * fadeOut;
			ctx.fillText(fromLabel, GW / 2, centerY);
		} else if (moveT < 1 && fromLabel && toLabel) {
			const yFrom = lerp(centerY, topY, moveT);
			const yTo = lerp(bottomY, centerY, moveT);
			ctx.globalAlpha = Math.max(0, (1 - fadeT) * fadeOut);
			ctx.fillText(fromLabel, GW / 2, yFrom);
			ctx.globalAlpha = Math.max(0, fadeT * fadeOut);
			ctx.fillText(toLabel, GW / 2, yTo);
		} else {
			ctx.globalAlpha = 0.95 * fadeOut;
			ctx.fillText(toLabel, GW / 2, centerY);
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;

		if (elapsed >= quoteStart && elapsed < quoteEnd && g.foolAscDialog) {
			const q = (elapsed - quoteStart) / Math.max(0.001, quoteDur);
			const dFade =
				Math.max(0, Math.min(1, q / 0.14)) *
				Math.max(0, Math.min(1, (1 - q) / 0.14));
			const dy = centerY + 42;
			ctx.globalAlpha = 0.88 * dFade;
			ctx.fillStyle = "rgba(224,224,246,0.95)";
			ctx.font = 'bold 13px "Times New Roman",serif';
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.shadowColor = "rgba(188,188,228,0.25)";
			ctx.shadowBlur = 4;
			const ascSay = (g.foolAscDialog || "").slice(
				0,
				Math.floor(g.foolAscDialogShow || 0),
			);
			ctx.fillText(ascSay, GW / 2, dy, GW * 0.78);
			ctx.shadowBlur = 0;
			ctx.globalAlpha = 1;
		}
	}
	if (g.cfg.enemy.id === "thefool" && g.foolIntroTopT > 0) {
		const a = Math.max(0, Math.min(1, g.foolIntroTopT / 1.25));
		const fade =
			Math.min(1, (1 - a) * 2.2) * (a > 0.14 ? 1 : Math.max(0, a / 0.14));
		const y = GH * 0.2;
		ctx.globalAlpha = 0.92 * fade;
		drawSmokeTextAura(ctx, GW / 2, y, g.t + 2.1, 1.15);
		ctx.fillStyle = "#e2e2f2";
		ctx.font = 'bold 15px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(190,190,230,0.8)";
		ctx.shadowBlur = 10;
		ctx.fillText("SEQUENCE 09  SEER", GW / 2, y);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	if (g.cfg.enemy.id === "thefool" && g.foolAscPulse > 0) {
		const pa = Math.min(1, g.foolAscPulse / 1.4);
		ctx.globalAlpha = 0.18 * pa;
		ctx.strokeStyle = "#ccd";
		ctx.lineWidth = 1.2;
		ctx.beginPath();
		ctx.arc(EX, g.ey, g.eH * 0.7 + 12 + Math.sin(g.t * 9) * 5, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(EX, g.ey, g.eH * 0.45 + 24 + Math.cos(g.t * 7) * 4, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
	// stun duration display
	if (g.ltStun > 0) {
		ctx.fillStyle = "#f55";
		ctx.font = '8px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("STUN: " + g.ltStun.toFixed(1), GW / 2, 34);
		ctx.globalAlpha = 1;
	}
	if (g.ctrlInvertT > 0) {
		const ia = Math.min(1, g.ctrlInvertT / 1.3);
		const pulse = 0.5 + 0.5 * Math.sin(g.t * 10.5);
		const clownBoost = g.eAbil.id === "clowncurse" && g.eAbilActive > 0;
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.globalAlpha = 0.78 + 0.22 * pulse;
		ctx.fillStyle = "rgba(255,150,225,0.98)";
		ctx.font = 'bold 12px "Share Tech Mono",monospace';
		ctx.shadowColor = "rgba(255,120,210,0.85)";
		ctx.shadowBlur = 12;
		ctx.fillText("CONTROLS INVERTED", GW / 2, 44);
		ctx.shadowBlur = 0;

		const confCols = ["#ff5ad6", "#ffd54a", "#55e7ff", "#86ff76", "#ff8b5a"];
		const corners = [
			[20, 20, 1, 1],
			[GW - 20, 20, -1, 1],
			[20, GH - 20, 1, -1],
			[GW - 20, GH - 20, -1, -1],
		];
		for (let c = 0; c < corners.length; c++) {
			const [cx, cy, sx, sy] = corners[c];
			for (let i = 0; i < (clownBoost ? 14 : 9); i++) {
				const tt = g.t * 3.2 + i * 0.73 + c * 0.41;
				const dx = (8 + i * 7 + Math.sin(tt * 1.4) * 8) * sx;
				const dy = (6 + i * 5 + Math.cos(tt * 1.1) * 7) * sy;
				const size =
					(clownBoost ? 3.6 : 2.2) + (i % 3) * (clownBoost ? 1.2 : 0.9);
				ctx.globalAlpha = (0.16 + 0.16 * Math.abs(Math.sin(tt * 2.2))) * ia;
				ctx.fillStyle = confCols[(i + c) % confCols.length];
				ctx.fillRect(cx + dx - size * 0.5, cy + dy - size * 0.5, size, size);
			}
		}
		ctx.globalAlpha = 1;
	}

	// Placed wall
	if (g.placedWall) {
		const w = g.placedWall,
			pulse = 0.5 + 0.5 * Math.sin(g.t * 5);
		ctx.shadowColor = col.g + "0.6)";
		ctx.shadowBlur = 16 * pulse;
		ctx.fillStyle = col.g + (0.4 + 0.3 * pulse) + ")";
		ctx.fillRect(w.x - 4, w.y - 30, 8, 60);
		ctx.shadowBlur = 0;
	}

	// Player paddle
	const pGlow = g.hitFlash > 0 ? 20 : 6;
	ctx.shadowColor = col.g + "0.6)";
	ctx.shadowBlur = pGlow;
	ctx.fillStyle = col.p;
	ctx.fillRect(g.px - PAD_W / 2, g.py - g.ph / 2, PAD_W, g.ph);
	ctx.shadowBlur = 28;
	ctx.fillStyle = col.g + (g.hitFlash > 0 ? 0.06 : 0.02) + ")";
	ctx.fillRect(
		g.px - PAD_W / 2 - 6,
		g.py - g.ph / 2 - 6,
		PAD_W + 12,
		g.ph + 12,
	);
	ctx.shadowBlur = 0;
	if (g.smashNext || g.curveNext || g.thunderNext) {
		const p = 0.2 + 0.2 * Math.sin(g.t * 11);
		ctx.strokeStyle = col.g + p + ")";
		ctx.lineWidth = 1.5;
		ctx.shadowColor = col.g + "0.35)";
		ctx.shadowBlur = 10;
		ctx.strokeRect(
			g.px - PAD_W / 2 - 5,
			g.py - g.ph / 2 - 5,
			PAD_W + 10,
			g.ph + 10,
		);
		ctx.shadowBlur = 0;
	}

	// Doppelganger paddle
	if (g.doppel) {
		const dpX = PX_HOME + 60,
			dpY = g.doppelY ?? g.py;
		ctx.globalAlpha = 0.3 + 0.15 * Math.sin(g.t * 3);
		ctx.shadowColor = col.g + "0.4)";
		ctx.shadowBlur = 12;
		ctx.fillStyle = col.p;
		ctx.fillRect(dpX - PAD_W / 2, dpY - g.ph * 0.4, PAD_W, g.ph * 0.8);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}

	// Enemy paddle  color coded by difficulty with visual specialties
	const _eDiff = g.cfg.diff,
		_eId = g.cfg.enemy.id;
	const _eDColMap = {
		F: "#888",
		"F-": "#9a9a9a",
		E: "#bbaa44",
		D: "#ff8833",
		C: "#9955ff",
		B: "#22ddaa",
		A: "#4499ff",
		S: "#00ddff",
		SS: "#ff4422",
		SSS: "#ff1133",
	};
	const _eDShdMap = {
		F: "120,120,120",
		"F-": "150,150,150",
		E: "180,160,60",
		D: "255,130,50",
		C: "150,80,255",
		B: "30,210,170",
		A: "68,160,255",
		S: "0,220,255",
		SS: "255,60,30",
		SSS: "255,20,50",
	};
	let _eCol = _eDColMap[_eDiff] || "#ddd",
		_eShdw = _eDShdMap[_eDiff] || "200,200,200";
	if (_eId === "void") {
		_eCol = "#8822ff";
		_eShdw = "140,30,255";
	}
	if (_eId === "apex") {
		_eCol = "#ff0033";
		_eShdw = "255,0,50";
	}
	const eSh = g.shrinkT > 0;
	const frozen = g.freezeT > 0;
	const _eDispCol = frozen ? "#88aaff" : eSh ? "#886644" : _eCol;
	const _eDispShdw = frozen ? "100,150,255" : eSh ? "180,110,60" : _eShdw;
	const _eGlow = _eDiff === "SSS" ? 14 : _eDiff === "SS" ? 10 : 6;
	ctx.globalAlpha = g.ghostA;
	// Blink: enemy paddle flickers in and out
	if (g.blinkT > 0) {
		const blinkVis = Math.sin(g.t * 14) > 0.15 ? 1 : 0;
		ctx.globalAlpha *= blinkVis;
	}
	ctx.shadowColor = `rgba(${_eDispShdw},${frozen ? 0.4 : eSh ? 0.3 : 0.55})`;
	ctx.shadowBlur = frozen ? 8 : eSh ? 3 : _eGlow;
	ctx.fillStyle = _eDispCol;
	ctx.fillRect(EX - PAD_W / 2, g.ey - g.eH / 2, PAD_W, g.eH);
	ctx.shadowBlur = 0;
	ctx.globalAlpha = 1;
	// Burn effect overlay on enemy paddle
	if (g._burnT > 0) {
		const burnA = Math.min(g._burnT / 2, 0.6) * (0.5 + 0.5 * Math.sin(g.t * 10));
		ctx.globalAlpha = burnA;
		ctx.fillStyle = "#ff4400";
		ctx.shadowColor = "rgba(255,80,0,0.6)";
		ctx.shadowBlur = 10;
		ctx.fillRect(EX - PAD_W / 2 - 2, g.ey - g.eH / 2 - 2, PAD_W + 4, g.eH + 4);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Delusio: confused question mark when active
	if (g.delusio && g._delusioT > 0) {
		ctx.globalAlpha = Math.min(g._delusioT * 3, 0.8);
		ctx.fillStyle = "#ff44ff";
		ctx.font = "bold 16px monospace";
		ctx.textAlign = "center";
		ctx.fillText("?", EX, g.ey - g.eH / 2 - 10);
		ctx.globalAlpha = 1;
	}
	// Speed Burst glow on ball
	if (g._speedBurstT > 0) {
		ctx.globalAlpha = 0.4 * Math.min(g._speedBurstT * 5, 1);
		ctx.fillStyle = "#ffaa22";
		ctx.shadowColor = "rgba(255,170,34,0.6)";
		ctx.shadowBlur = 14;
		ctx.fillRect(g.bx - BALL_SZ, g.by - BALL_SZ, BALL_SZ * 2, BALL_SZ * 2);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	if (_eId === "thefool") {
		const hatY = g.ey - g.eH / 2 - 8;
		ctx.globalAlpha = 0.92;
		ctx.fillStyle = "rgba(20,20,28,0.95)";
		ctx.beginPath();
		ctx.moveTo(EX - 14, hatY + 6);
		ctx.lineTo(EX + 14, hatY + 6);
		ctx.lineTo(EX + 4, hatY - 12);
		ctx.lineTo(EX - 4, hatY - 12);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(EX - 8, hatY - 12, 3.2, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(EX + 8, hatY - 12, 3.2, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = 1;
	}
	// Shrink scan lines
	if (eSh) {
		ctx.globalAlpha = 0.12 + 0.08 * Math.sin(g.t * 20);
		ctx.fillStyle = "#f44";
		for (let i = 0; i < 4; i++) {
			ctx.fillRect(
				EX - 35,
				g.ey + Math.sin(g.t * 11 + i * 2.3) * g.eH * 1.5,
				70,
				1,
			);
		}
		ctx.globalAlpha = 1;
	}
	// Frozen overlay
	if (frozen) {
		ctx.globalAlpha = 0.15 + 0.08 * Math.sin(g.t * 8);
		ctx.fillStyle = "#88ccff";
		ctx.fillRect(EX - 24, g.ey - g.eH / 2 - 8, 48, g.eH + 16);
		ctx.globalAlpha = 1;
	}
	// Ghost enemies: ethereal pulsing aura ring
	if (g.cfg.ghost && !frozen) {
		const _ga = 0.16 * Math.abs(Math.sin(g.t * 3.5));
		ctx.globalAlpha = _ga;
		ctx.strokeStyle = "#22ddaa";
		ctx.lineWidth = 1.2;
		ctx.shadowColor = "rgba(30,210,170,0.6)";
		ctx.shadowBlur = 16;
		ctx.strokeRect(
			EX - PAD_W / 2 - 6,
			g.ey - g.eH / 2 - 6,
			PAD_W + 12,
			g.eH + 12,
		);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Chaos enemies: pulsing colored outer border
	if (g.chaos && !frozen) {
		const _cp = 0.5 + 0.5 * Math.sin(g.t * 7);
		ctx.globalAlpha = 0.14 + 0.1 * _cp;
		const _cr = 255,
			_cg = (40 + Math.sin(g.t * 4) * 40) | 0;
		ctx.strokeStyle = `rgba(${_cr},${_cg},0,1)`;
		ctx.lineWidth = 1.5;
		ctx.shadowColor = `rgba(${_cr},${_cg},0,0.5)`;
		ctx.shadowBlur = 10;
		ctx.strokeRect(
			EX - PAD_W / 2 - 4,
			g.ey - g.eH / 2 - 4,
			PAD_W + 8,
			g.eH + 8,
		);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Jitter enemies: rapid horizontal speed-streak lines
	if (g.jitter && !frozen) {
		for (let i = 0; i < 3; i++) {
			const _yo = Math.sin(g.t * 28 + i * 4.2) * g.eH * 0.42;
			ctx.globalAlpha = 0.2;
			ctx.fillStyle = "#ff8833";
			ctx.fillRect(EX - PAD_W / 2 - 14, g.ey + _yo - 0.5, PAD_W + 28, 1);
		}
		ctx.globalAlpha = 1;
	}
	// TrickAng enemies: diagonal cross-slash marks
	if (g.trickAng && !eSh && !frozen) {
		ctx.globalAlpha = 0.22 + 0.08 * Math.sin(g.t * 5);
		ctx.strokeStyle = "#9955ff";
		ctx.lineWidth = 1;
		ctx.shadowColor = "rgba(150,80,255,0.4)";
		ctx.shadowBlur = 6;
		ctx.beginPath();
		ctx.moveTo(EX - 2, g.ey - g.eH * 0.38);
		ctx.lineTo(EX + 2, g.ey + g.eH * 0.38);
		ctx.moveTo(EX - 2, g.ey + g.eH * 0.38);
		ctx.lineTo(EX + 2, g.ey - g.eH * 0.38);
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// SSS-tier: intense pulsing outer glow ring
	if (_eDiff === "SSS" && !frozen) {
		const _sp = 0.5 + 0.5 * Math.sin(g.t * 14);
		ctx.globalAlpha = 0.1 + 0.12 * _sp;
		ctx.strokeStyle = _eId === "void" ? "#aa22ff" : "#ff0033";
		ctx.lineWidth = 2;
		ctx.shadowColor =
			_eId === "void" ? "rgba(170,30,255,0.6)" : "rgba(255,0,50,0.7)";
		ctx.shadowBlur = 22;
		ctx.strokeRect(
			EX - PAD_W / 2 - 9,
			g.ey - g.eH / 2 - 9,
			PAD_W + 18,
			g.eH + 18,
		);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// SS-tier: aggressive red aura flicker
	if (_eDiff === "SS" && !frozen) {
		const _sa = 0.06 + 0.06 * Math.sin(g.t * 9);
		ctx.globalAlpha = _sa;
		ctx.fillStyle = "#ff4422";
		ctx.shadowColor = "rgba(255,60,30,0.3)";
		ctx.shadowBlur = 12;
		ctx.fillRect(
			EX - PAD_W / 2 - 5,
			g.ey - g.eH / 2 - 5,
			PAD_W + 10,
			g.eH + 10,
		);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	if (g.eAbil.id === "clowncurse" || g.eAbil.id === "marionette") {
		const a = g.eAbilActive > 0 ? 0.28 : 0.16;
		ctx.globalAlpha = a;
		ctx.fillStyle = "#ff3344";
		ctx.shadowColor = "rgba(255,70,90,0.45)";
		ctx.shadowBlur = g.eAbilActive > 0 ? 12 : 8;
		ctx.fillRect(
			EX - PAD_W / 2 - 9,
			g.ey - g.eH / 2 - 8,
			PAD_W + 18,
			g.eH + 16,
		);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Clone paddle (enemy ability)
	if (g.cloneT > 0 || g.foolClone) {
		const clX = EX - 35;
		const ca2 = g.foolClone ? 0.9 : Math.min(g.cloneT, 0.5) * 2;
		ctx.globalAlpha = ca2 * 0.4;
		ctx.fillStyle = "#88f";
		ctx.shadowColor = "rgba(100,100,255,0.4)";
		ctx.shadowBlur = 8;
		ctx.fillRect(clX - PAD_W / 2, g.cloneY - g.eH / 2, PAD_W, g.eH);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	if (g.foolPuppets.length) {
		for (let i = 0; i < g.foolPuppets.length; i++) {
			const p = g.foolPuppets[i];
			const fa = p.broken ? Math.max(0, p.fade) : p.a;
			const anchorX = (p.ax ?? p.x) + Math.sin(g.t * 2.8 + i * 0.9) * 5;
			const anchorY = -4;
			// string
			ctx.globalAlpha = 0.35 * fa;
			ctx.strokeStyle = "#e6e8ff";
			ctx.lineWidth = 1.1;
			ctx.beginPath();
			ctx.moveTo(anchorX, anchorY);
			ctx.lineTo(p.x, p.y - p.h / 2 + 2);
			ctx.stroke();
			ctx.globalAlpha = 0.22 * fa;
			ctx.fillStyle = "rgba(225,228,255,0.9)";
			ctx.beginPath();
			ctx.arc(anchorX, anchorY + 2, 1.6, 0, Math.PI * 2);
			ctx.fill();
			// paddle body
			ctx.globalAlpha = 0.42 * fa;
			ctx.fillStyle = "#d6d8ff";
			ctx.shadowColor = "rgba(210,214,255,0.45)";
			ctx.shadowBlur = 6;
			ctx.fillRect(p.x - (p.w || 8) / 2, p.y - p.h / 2, p.w || 8, p.h);
			ctx.shadowBlur = 0;
			if (p.broken) {
				ctx.globalAlpha = 0.18 * fa;
				ctx.strokeStyle = "#eef";
				ctx.lineWidth = 0.7;
				const hw = (p.w || 8) / 2;
				ctx.beginPath();
				ctx.moveTo(p.x - hw, p.y - p.h / 2);
				ctx.lineTo(p.x + hw, p.y + p.h / 2);
				ctx.moveTo(p.x + hw, p.y - p.h / 2);
				ctx.lineTo(p.x - hw, p.y + p.h / 2);
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 1;
	}
	// Overdrive glow on ball
	if (g.overdriveT > 0) {
		const oa = Math.min(g.overdriveT, 0.5) * 2;
		ctx.globalAlpha = oa * 0.3;
		ctx.fillStyle = "#ff8800";
		ctx.shadowColor = "rgba(255,136,0,0.6)";
		ctx.shadowBlur = 16;
		ctx.beginPath();
		ctx.arc(g.bx, g.by, BALL_SZ + 5 + Math.sin(g.t * 12) * 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}

	// Ball trail
	const ballHidden = g.ballHideT > 0;
	const lightningTrailOff =
		g.eAbil.id === "lightning" &&
		(g.eAbilPhase === "channel" || g.eAbilPhase === "strike");
	if (!ballHidden && !lightningTrailOff && g.trail.length > 2) {
		const [tr, tg, tb] = col.t;
		for (let i = 1; i < g.trail.length; i++) {
			const t = i / g.trail.length,
				pt = g.trail[i],
				pp = g.trail[i - 1];
			const alpha = t * t * 0.2,
				sz = BALL_SZ * (0.2 + t * 0.55);
			ctx.globalAlpha = alpha;
			ctx.fillStyle = `rgb(${(tr * 255) | 0},${(tg * 255) | 0},${(tb * 255) | 0})`;
			for (let s = 0; s < 2; s++) {
				const st = s / 2;
				ctx.fillRect(
					lerp(pp.x, pt.x, st) - sz / 2,
					lerp(pp.y, pt.y, st) - sz / 2,
					sz,
					sz,
				);
			}
		}
		ctx.globalAlpha = 1;
	}

	// Ball
	const ghostAlpha =
		(g.ghostBall ? 0.28 + 0.2 * Math.sin(g.t * 10) : 1) *
		(ballHidden ? 0.02 : 1);
	let ballBlinkAlpha = 1;
	if (g.blinkT > 0) ballBlinkAlpha = Math.sin(g.t * 14) > 0.15 ? 1 : 0.04;
	ctx.globalAlpha = ghostAlpha * ballBlinkAlpha;
	if (chroma > 0.3) {
		ctx.globalAlpha = ghostAlpha * 0.15;
		ctx.fillStyle = "#f55";
		ctx.fillRect(
			g.bx - BALL_SZ / 2 - chroma,
			g.by - BALL_SZ / 2,
			BALL_SZ,
			BALL_SZ,
		);
		ctx.fillStyle = "#55f";
		ctx.fillRect(
			g.bx - BALL_SZ / 2 + chroma,
			g.by - BALL_SZ / 2,
			BALL_SZ,
			BALL_SZ,
		);
		ctx.globalAlpha = ghostAlpha;
	}
	// additive glow for ball (richer but more expensive)
	ctx.save();
	ctx.globalCompositeOperation = "lighter";
	ctx.shadowColor = col.g + "0.6)";
	ctx.shadowBlur = g.smashNext ? 28 : 16;
	ctx.fillStyle = col.g + (g.smashNext ? 0.12 : 0.06) + ")";
	ctx.fillRect(g.bx - BALL_SZ, g.by - BALL_SZ, BALL_SZ * 2, BALL_SZ * 2);
	ctx.shadowBlur = g.smashNext ? 20 : 10;
	ctx.fillStyle = col.p;
	ctx.fillRect(g.bx - BALL_SZ / 2, g.by - BALL_SZ / 2, BALL_SZ, BALL_SZ);
	ctx.restore();
	// warden enemy effect: continuous lightning crackles around ball
	if (!ballHidden && g.cfg.enemy.id === "warden") {
		ctx.globalAlpha = 0.2 + 0.1 * Math.sin(g.t * 20);
		ctx.strokeStyle = "#8cf";
		ctx.lineWidth = 1.2;
		ctx.shadowColor = "rgba(128,200,255,0.7)";
		ctx.shadowBlur = 10;
		for (let i = 0; i < 3; i++) {
			ctx.beginPath();
			const a = g.t * 10 + i * 2;
			const r = BALL_SZ * 1.5 + Math.sin(g.t * 15 + i) * 4;
			ctx.arc(g.bx, g.by, r, a, a + Math.PI * 0.3);
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	if (g.ghostBall && !ballHidden) {
		ctx.globalAlpha = ghostAlpha * 0.1;
		ctx.fillStyle = col.p;
		ctx.fillRect(
			g.bx - BALL_SZ / 2 + Math.sin(g.t * 14) * 3,
			g.by - BALL_SZ / 2 + Math.cos(g.t * 16) * 3,
			BALL_SZ,
			BALL_SZ,
		);
	}
	ctx.globalAlpha = 1;
	if (ballHidden) {
		ctx.globalAlpha = 0.08 + 0.05 * Math.sin(g.t * 20);
		ctx.strokeStyle = "#dfe";
		ctx.lineWidth = 0.6;
		ctx.beginPath();
		ctx.arc(g.bx, g.by, BALL_SZ * 0.7, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	// Multi balls
	for (const mb of g.multiBalls) {
		const a = Math.min(mb.life, 1) * 0.55;
		// Color phantom balls by type
		let mbCol = col.p;
		let mbGlow = col.g + "0.3)";
		if (mb.phantom) {
			if (mb.pType === "thunder") { mbCol = "#ffe94a"; mbGlow = "rgba(255,233,74,0.4)"; }
			else if (mb.pType === "slow") { mbCol = "#44ff66"; mbGlow = "rgba(68,255,102,0.4)"; }
			else if (mb.pType === "fire") { mbCol = "#ff6622"; mbGlow = "rgba(255,102,34,0.4)"; }
		}
		for (let i = 0; i < mb.trail.length - 1; i++) {
			const t = i / mb.trail.length;
			ctx.globalAlpha = t * 0.08 * a;
			ctx.fillStyle = mbCol;
			const sz = BALL_SZ * (0.2 + t * 0.35);
			ctx.fillRect(mb.trail[i].x - sz / 2, mb.trail[i].y - sz / 2, sz, sz);
		}
		ctx.globalAlpha = a;
		ctx.shadowColor = mbGlow;
		ctx.shadowBlur = 4;
		ctx.fillStyle = mbCol;
		ctx.fillRect(mb.x - BALL_SZ / 2, mb.y - BALL_SZ / 2, BALL_SZ, BALL_SZ);
		ctx.shadowBlur = 0;
	}
	ctx.globalAlpha = 1;

	// Mirage decoy ball
	if (g._mirageDecoy && g._mirageDecoy.active) {
		const dc = g._mirageDecoy;
		const da = Math.min(dc.life, 1) * 0.5;
		for (let i = 0; i < dc.trail.length; i++) {
			const t = i / dc.trail.length;
			ctx.globalAlpha = t * 0.06 * da;
			ctx.fillStyle = "#ffcc44";
			const sz = BALL_SZ * (0.2 + t * 0.3);
			ctx.fillRect(dc.trail[i].x - sz / 2, dc.trail[i].y - sz / 2, sz, sz);
		}
		ctx.globalAlpha = da;
		ctx.shadowColor = "rgba(255,200,60,0.4)";
		ctx.shadowBlur = 8;
		ctx.fillStyle = "#ffcc44";
		ctx.fillRect(dc.x - BALL_SZ / 2, dc.y - BALL_SZ / 2, BALL_SZ, BALL_SZ);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}

	// Sparks
	// richer additive sparks
	ctx.save();
	ctx.globalCompositeOperation = "lighter";
	for (const p of g.sparks) {
		const t = p.life / p.max;
		ctx.globalAlpha = t * 0.9;
		const c = p.col;
		const rcol = c
			? `rgb(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0})`
			: "#fff";
		ctx.fillStyle = rcol;
		ctx.shadowColor = rcol;
		ctx.shadowBlur = 6 + t * 12;
		const sz = 2.5 + t * 6;
		ctx.beginPath();
		ctx.arc(p.x, p.y, sz / 2, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
	ctx.shadowBlur = 0;
	ctx.globalAlpha = 1;

	// --- ABILITY VFX ---
	// Curve active: spiral particles swirling around ball
	if (g.curveNext) {
		for (let i = 0; i < 6; i++) {
			const a = g.t * 8 + (i * Math.PI) / 3,
				r = 18 + Math.sin(g.t * 12 + i) * 6;
			ctx.globalAlpha = 0.25 + 0.15 * Math.sin(g.t * 10 + i);
			ctx.fillStyle = col.p;
			ctx.shadowColor = col.g + "0.5)";
			ctx.shadowBlur = 8;
			ctx.fillRect(
				g.bx + Math.cos(a) * r - 1.5,
				g.by + Math.sin(a) * r - 1.5,
				3,
				3,
			);
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
		// Predicted curve trajectory (simulates actual physics)
		ctx.beginPath();
		ctx.strokeStyle = col.g + "0.1)";
		ctx.lineWidth = 1;
		ctx.setLineDash([3, 5]);
		let px = g.bx,
			py = g.by,
			pvx = Math.abs(g.bvx) || g.ballSpd,
			pvy = g.bvy,
			cdir = Math.sign(g.bvy || 1);
		ctx.moveTo(px, py);
		for (let i = 0; i < 40; i++) {
			px += pvx * 0.008;
			py += pvy * 0.008;
			pvy += cdir * 320 * 0.008;
			if (py < 5 || py > GH - 5) pvy = -pvy;
			ctx.lineTo(px, py);
			if (px > GW * 0.7) break;
		}
		ctx.stroke();
		ctx.setLineDash([]);
	}
	// Ghost/Vanish: ethereal echoes + distortion rings
	if (g.ghostBall) {
		for (let i = 0; i < 3; i++) {
			const off = Math.sin(g.t * 6 + i * 2) * 12;
			ctx.globalAlpha = 0.06;
			ctx.fillStyle = col.p;
			ctx.shadowColor = col.g + "0.2)";
			ctx.shadowBlur = 14;
			ctx.fillRect(
				g.bx - BALL_SZ / 2 + off * (i + 1) * 0.4,
				g.by - BALL_SZ / 2 + Math.cos(g.t * 7 + i) * 6,
				BALL_SZ,
				BALL_SZ,
			);
		}
		ctx.globalAlpha = 0.04 + 0.02 * Math.sin(g.t * 10);
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 0.8;
		ctx.beginPath();
		ctx.arc(g.bx, g.by, 20 + Math.sin(g.t * 8) * 5, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(g.bx, g.by, 34 + Math.cos(g.t * 6) * 8, 0, Math.PI * 2);
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Placed wall: energy field with pulse beams
	if (g.placedWall) {
		const w = g.placedWall,
			pulse = 0.5 + 0.5 * Math.sin(g.t * 6);
		// Vertical energy beams
		for (let i = 0; i < 3; i++) {
			ctx.globalAlpha = 0.04 + 0.03 * Math.sin(g.t * 14 + i * 3);
			ctx.fillStyle = col.p;
			ctx.fillRect(w.x - 15 + i * 12, w.y - 40, 1, 80);
		}
		// Deterministic crackling arcs (time-based, not random)
		ctx.globalAlpha = 0.15 * pulse;
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 0.5;
		ctx.shadowColor = col.g + "0.6)";
		ctx.shadowBlur = 6;
		for (let i = 0; i < 2; i++) {
			ctx.beginPath();
			let lx = w.x,
				ly = w.y - 28 + i * 56;
			ctx.moveTo(lx, ly);
			for (let j = 0; j < 4; j++) {
				lx += Math.sin(g.t * 11 + j * 7 + i * 13) * 12;
				ly += Math.cos(g.t * 9 + j * 5 + i * 11) * 6;
				ctx.lineTo(lx, ly);
			}
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Shrink active: glitch scan lines + hex containment
	if (g.shrinkT > 0) {
		const si = g.shrinkT / 2.5;
		ctx.globalAlpha = 0.12 * si;
		ctx.fillStyle = "#f44";
		for (let i = 0; i < 5; i++) {
			const y = g.ey + Math.sin(g.t * 12 + i * 2.7) * g.eH * 1.5,
				w = 45 + Math.sin(g.t * 8 + i * 4) * 25;
			ctx.fillRect(EX - w / 2, y, w, 1);
		}
		// Hexagonal containment around shrunk paddle
		ctx.strokeStyle = "rgba(255,60,60," + 0.08 * si + ")";
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		for (let i = 0; i < 6; i++) {
			const a = (i * Math.PI) / 3 + g.t * 2,
				r = g.eH * 0.9 + 10;
			const px = EX + Math.cos(a) * r * 0.35,
				py = g.ey + Math.sin(a) * r;
			i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
	// Smash charged: scrolling speed lines + pulsing aura
	if (g.smashNext) {
		ctx.globalAlpha = 0.07 + 0.04 * Math.sin(g.t * 20);
		ctx.fillStyle = col.p;
		for (let i = 0; i < 8; i++) {
			const y = g.py + Math.sin(g.t * 6 + i * 1.9) * g.ph;
			const len = 50 + Math.sin(g.t * 10 + i * 3) * 30;
			ctx.fillRect(g.px + 10, y, len, 1);
		}
		// Pulsing aura
		ctx.strokeStyle = col.g + (0.08 + 0.05 * Math.sin(g.t * 15)) + ")";
		ctx.lineWidth = 2;
		ctx.shadowColor = col.g + "0.4)";
		ctx.shadowBlur = 12;
		ctx.strokeRect(
			g.px - PAD_W / 2 - 8 + Math.sin(g.t * 30) * 1.5,
			g.py - g.ph / 2 - 8,
			PAD_W + 16,
			g.ph + 16,
		);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Freeze active: orbiting ice crystal particles
	if (g.freezeT > 0) {
		const fR = g.eHBase * 0.6;
		ctx.globalAlpha = 0.25 * Math.min(g.freezeT, 1);
		ctx.fillStyle = "#aaddff";
		ctx.shadowColor = "rgba(120,180,255,0.4)";
		ctx.shadowBlur = 4;
		for (let i = 0; i < 6; i++) {
			const a = g.t * 3 + (i * Math.PI) / 3,
				r = fR + Math.sin(g.t * 5 + i) * 10;
			const sz = 1.5 + Math.sin(i * 2.3) * 0.8;
			ctx.fillRect(
				EX + Math.cos(a) * r * 0.3 - sz / 2,
				g.ey + Math.sin(a) * r - sz / 2,
				sz,
				sz,
			);
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Singularity: gravity funnel pulling toward enemy goal
	if (g.singularity && g.bvx > 0) {
		ctx.globalAlpha = 0.04;
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 0.5;
		for (let i = 0; i < 4; i++) {
			const r = 20 + i * 16 + Math.sin(g.t * 4 + i) * 5;
			const cx = lerp(g.bx, GW, 0.6 + i * 0.1);
			ctx.beginPath();
			ctx.arc(cx, g.by, r, Math.PI * 0.65, Math.PI * 1.35);
			ctx.stroke();
		}
		// Pull line from ball to goal
		ctx.globalAlpha = 0.03;
		ctx.setLineDash([3, 6]);
		ctx.beginPath();
		ctx.moveTo(g.bx, g.by);
		ctx.lineTo(GW, g.by);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.globalAlpha = 1;
	}
	// Homing: tracking crosshair on target
	if (g.homing && g.bvx > 0) {
		const gap = getEnemyOpenLaneY(g);
		ctx.globalAlpha = 0.1 + 0.05 * Math.sin(g.t * 8);
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.arc(EX, gap, 8, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(EX - 12, gap);
		ctx.lineTo(EX + 12, gap);
		ctx.moveTo(EX, gap - 12);
		ctx.lineTo(EX, gap + 12);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}
	// Time warp: flowing zone particles
	if (g.timewarp) {
		ctx.globalAlpha = 0.05;
		for (let i = 0; i < 5; i++) {
			const x = GW * 0.72 + Math.sin(g.t * 1.5 + i * 1.7) * GW * 0.12;
			const y = (g.t * 40 + i * 97) % GH;
			ctx.fillStyle = "#a060ff";
			ctx.fillRect(x, y, 1, 4 + Math.sin(g.t * 3 + i) * 3);
		}
		for (let i = 0; i < 5; i++) {
			const x = GW * 0.08 + Math.sin(g.t * 1.8 + i * 2.1) * GW * 0.12;
			const y = (g.t * 50 + i * 83) % GH;
			ctx.fillStyle = "#ffa040";
			ctx.fillRect(x, y, 1, 4 + Math.sin(g.t * 4 + i) * 3);
		}
		ctx.globalAlpha = 1;
	}
	// Doppelganger shimmer
	if (g.doppel) {
		const dpX = PX_HOME + 60;
		ctx.globalAlpha = 0.03 + 0.02 * Math.sin(g.t * 7);
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 0.5;
		ctx.strokeRect(
			dpX - PAD_W / 2 - 3,
			(g.doppelY ?? g.py) - g.ph * 0.45,
			PAD_W + 6,
			g.ph * 0.9,
		);
		ctx.globalAlpha = 1;
	}
	// EchoHit: ambient resonance arcs from paddle face
	if (g.echoHit) {
		const epx = g.px + PAD_W / 2;
		ctx.globalAlpha = 0.02 + 0.01 * Math.sin(g.t * 5);
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.arc(epx, g.py, 30 + Math.sin(g.t * 6) * 8, -0.4, 0.4);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(epx, g.py, 50 + Math.cos(g.t * 4) * 10, -0.3, 0.3);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	// --- NEW PADDLE ABILITY VFX ---
	// Oracle active ability: strong projected path preview
	if (g.foresightT > 0) {
		const fa = Math.min(g.foresightT, 1);
		let px = g.bx,
			py = g.by,
			vx = g.bvx,
			vy = g.bvy;
		let simSpin = g.spin;
		let simSpinCurveT = g.spinCurveT;
		let simSpinDir = g._spinDir || 0;
		let simCurveNext = g.curveNext;
		if (
			g.eAbil.id === "lightning" &&
			(g.eAbilPhase === "channel" || g.eAbilPhase === "strike") &&
			(Math.abs(g.ltLaunchVx) > 0 || Math.abs(g.ltLaunchVy) > 0)
		) {
			vx = g.ltLaunchVx;
			vy = g.ltLaunchVy;
		}
		ctx.globalAlpha = 0.32 * fa;
		ctx.strokeStyle = "#44ddff";
		ctx.lineWidth = 1.5;
		ctx.shadowColor = "rgba(68,221,255,0.45)";
		ctx.shadowBlur = 8;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(px, py);
		const simDt = 0.005;
		for (let i = 0; i < 650; i++) {
			// Simulate spin curve
			if (simSpinCurveT > 0) {
				simSpinCurveT -= simDt;
				const ease = simSpinCurveT / 0.7;
				vy += simSpinDir * 280 * ease * simDt;
				vy = clamp(vy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
			}
			// Simulate continuous spin
			if (Math.abs(simSpin) > 15) {
				vy += simSpin * 2 * simDt;
				vy = clamp(vy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
				const spdFactor = clamp(g.ballSpd / BASE_SPD, 0.6, 2.5);
				simSpin *= Math.pow(0.35 * spdFactor, simDt);
			} else {
				simSpin = 0;
			}
			// Simulate curveNext
			if (simCurveNext && vx > 0) {
				const curveTarget = Math.sign(vy || 1) * g.ballSpd * 1.8;
				vy = lerp(vy, curveTarget, simDt * 3.5);
			}
			if (simCurveNext && px > GW * 0.65) simCurveNext = false;
			px += vx * simDt;
			py += vy * simDt;
			if (py < 5) {
				py = 5;
				vy = Math.abs(vy);
			}
			if (py > GH - 5) {
				py = GH - 5;
				vy = -Math.abs(vy);
			}
			ctx.lineTo(px, py);
			if (px < 0 || px > GW) break;
		}
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 0.9 * fa;
		ctx.fillStyle = "#9eeeff";
		ctx.font = 'bold 10px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText("FUTURE FORESIGHT", GW / 2, 62);
		ctx.globalAlpha = 1;
	}
	// Oracle Sight (upgrade): lightweight projected path
	if (
		g.oracleSight &&
		g.startPause <= 0 &&
		!(g.tsT > 0) &&
		g.eAbilPhase !== "strike"
	) {
		const sp = Math.hypot(g.bvx, g.bvy);
		if (sp > 60) {
			let px = g.bx,
				py = g.by,
				vx = g.bvx,
				vy = g.bvy;
			if (
				g.eAbil.id === "lightning" &&
				g.eAbilPhase === "channel" &&
				(Math.abs(g.ltLaunchVx) > 0 || Math.abs(g.ltLaunchVy) > 0)
			) {
				vx = g.ltLaunchVx;
				vy = g.ltLaunchVy;
			}
			ctx.globalAlpha = 0.38;
			ctx.strokeStyle = "#55eeff";
			ctx.lineWidth = 2;
			ctx.shadowColor = "rgba(85,238,255,0.5)";
			ctx.shadowBlur = 6;
			ctx.setLineDash([5, 3]);
			ctx.beginPath();
			ctx.moveTo(px, py);
			let osSpin = g.spin;
			let osSpinCurveT = g.spinCurveT;
			let osSpinDir = g._spinDir || 0;
			let osCurveNext = g.curveNext;
			const osDt = 0.005;
			for (let i = 0; i < 800; i++) {
				if (osSpinCurveT > 0) {
					osSpinCurveT -= osDt;
					vy += osSpinDir * 280 * (osSpinCurveT / 0.7) * osDt;
					vy = clamp(vy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
				}
				if (Math.abs(osSpin) > 15) {
					vy += osSpin * 2 * osDt;
					vy = clamp(vy, -g.ballSpd * 1.5, g.ballSpd * 1.5);
					osSpin *= Math.pow(0.35 * clamp(g.ballSpd / BASE_SPD, 0.6, 2.5), osDt);
				} else { osSpin = 0; }
				if (osCurveNext && vx > 0) {
					vy = lerp(vy, Math.sign(vy || 1) * g.ballSpd * 1.8, osDt * 3.5);
				}
				if (osCurveNext && px > GW * 0.65) osCurveNext = false;
				px += vx * osDt;
				py += vy * osDt;
				if (py < 5) {
					py = 5;
					vy = Math.abs(vy);
				}
				if (py > GH - 5) {
					py = GH - 5;
					vy = -Math.abs(vy);
				}
				ctx.lineTo(px, py);
				if (px < 0 || px > GW) break;
			}
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.shadowBlur = 0;
			ctx.globalAlpha = 1;
		}
	}
	// Gravity well (Void) - visible swirling well (for DEAD ZONE upgrade)
	if (g.gravWell && g.gravWellT > 0) {
		const ga = Math.min(g.gravWellT, 0.5) * 2;
		const gw = g.gravWell;
		const pulse = 0.5 + 0.5 * Math.sin(g.t * 6);
		ctx.globalAlpha = ga * 0.2;
		ctx.strokeStyle = "#ff44aa";
		ctx.lineWidth = 1.5;
		ctx.shadowColor = "rgba(255,68,170,0.5)";
		ctx.shadowBlur = 12;
		for (let i = 0; i < 3; i++) {
			const r = 10 + i * 14 + Math.sin(g.t * 4 + i * 2) * 4;
			ctx.beginPath();
			ctx.arc(
				gw.x,
				gw.y,
				r,
				g.t * (3 - i) + i,
				g.t * (3 - i) + i + Math.PI * 1.4,
			);
			ctx.stroke();
		}
		ctx.globalAlpha = ga * 0.25 * pulse;
		ctx.fillStyle = "#ff44aa";
		ctx.beginPath();
		ctx.arc(gw.x, gw.y, 6 + pulse * 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.globalAlpha = ga * 0.1;
		ctx.strokeStyle = "#ff44aa";
		ctx.lineWidth = 0.5;
		ctx.setLineDash([2, 4]);
		ctx.beginPath();
		ctx.moveTo(g.bx, g.by);
		ctx.lineTo(gw.x, gw.y);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Warp field indicator (Void) - swirling rings around ball
	if (g.warpFieldT > 0) {
		const wa = Math.min(g.warpFieldT, 0.5) * 2;
		const pulse = 0.5 + 0.5 * Math.sin(g.t * 8);
		ctx.globalAlpha = wa * 0.25;
		ctx.strokeStyle = "#ff44aa";
		ctx.lineWidth = 1.5;
		ctx.shadowColor = "rgba(255,68,170,0.6)";
		ctx.shadowBlur = 10;
		for (let i = 0; i < 3; i++) {
			const r = BALL_SZ + 5 + i * 8 + Math.sin(g.t * 6 + i * 2.1) * 3;
			ctx.beginPath();
			ctx.arc(g.bx, g.by, r, g.t * (4 - i) + i, g.t * (4 - i) + i + Math.PI * 1.2);
			ctx.stroke();
		}
		ctx.globalAlpha = wa * 0.15 * pulse;
		ctx.fillStyle = "#ff44aa";
		ctx.beginPath();
		ctx.arc(g.bx, g.by, BALL_SZ + 3, 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Phase indicator (Phantom)
	if (g.phaseNext) {
		ctx.globalAlpha = 0.15 + 0.1 * Math.sin(g.t * 10);
		ctx.strokeStyle = "#cc88ff";
		ctx.lineWidth = 1.5;
		ctx.shadowColor = "rgba(204,136,255,0.5)";
		ctx.shadowBlur = 10;
		ctx.beginPath();
		ctx.arc(g.bx, g.by, BALL_SZ + 6 + Math.sin(g.t * 8) * 3, 0, Math.PI * 2);
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Blizzard zone (Frost)
	if (g.blizzardT > 0) {
		const ba = Math.min(g.blizzardT, 0.5) * 2;
		// Ice overlay on enemy half
		ctx.globalAlpha = ba * 0.06;
		ctx.fillStyle = "#88ccff";
		ctx.fillRect(GW * 0.4, 0, GW * 0.6, GH);
		// Snowflake particles
		ctx.globalAlpha = ba * 0.25;
		ctx.fillStyle = "#aaddff";
		ctx.shadowColor = "rgba(170,221,255,0.4)";
		ctx.shadowBlur = 4;
		for (let i = 0; i < 12; i++) {
			const sx = GW * 0.4 + ((g.t * 30 + i * 67) % (GW * 0.6));
			const sy = (g.t * 50 + i * 43) % GH;
			const ssz = 2 + Math.sin(i * 2.3 + g.t * 3);
			ctx.fillRect(sx - ssz / 2, sy - ssz / 2, ssz, ssz);
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Thunder charged indicator (Storm)
	if (g.thunderNext) {
		ctx.globalAlpha = 0.15 + 0.1 * Math.sin(g.t * 15);
		ctx.strokeStyle = "#ffee44";
		ctx.lineWidth = 1.5;
		ctx.shadowColor = "rgba(255,238,68,0.5)";
		ctx.shadowBlur = 12;
		// Electric arcs around paddle
		for (let i = 0; i < 3; i++) {
			ctx.beginPath();
			let lx = g.px + PAD_W / 2,
				ly = g.py - g.ph / 2 + (g.ph * (i + 0.5)) / 3;
			for (let j = 0; j < 5; j++) {
				lx += 8 + Math.sin(g.t * 20 + j * 5 + i * 7) * 4;
				ly += Math.sin(g.t * 18 + j * 3 + i * 5) * 8;
				ctx.lineTo(lx, ly);
			}
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Lightning bolts (Storm projectiles)
	for (const b of g.bolts) {
		const ba = Math.min(b.life, 1);
		// choose color based on source
		const boltCol = b.fromWarden ? "#8cf" : "#ffee44";
		const boltShadow = b.fromWarden
			? "rgba(128,200,255,0.5)"
			: "rgba(255,238,68,0.5)";
		const headShadow = b.fromWarden
			? "rgba(200,230,255,0.8)"
			: "rgba(255,238,68,0.8)";

		// Trail
		for (let i = 1; i < b.trail.length; i++) {
			const t2 = i / b.trail.length;
			ctx.globalAlpha = t2 * 0.3 * ba;
			ctx.strokeStyle = boltCol;
			ctx.lineWidth = 2;
			ctx.shadowColor = boltShadow;
			ctx.shadowBlur = 6;
			ctx.beginPath();
			ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y);
			ctx.lineTo(b.trail[i].x, b.trail[i].y);
			ctx.stroke();
		}
		const isThunderBall = !!b.thunderBall;
		// Bolt head
		ctx.globalAlpha = ba;
		ctx.fillStyle = isThunderBall ? "#ffee44" : "#fff";
		ctx.shadowColor = headShadow;
		ctx.shadowBlur = 14;
		ctx.beginPath();
		ctx.arc(b.x, b.y, isThunderBall ? 5 : 3, 0, Math.PI * 2);
		ctx.fill();
		if (isThunderBall) {
			ctx.globalAlpha = 0.45 * ba;
			ctx.strokeStyle = "#fff8ad";
			ctx.lineWidth = 1.3;
			ctx.beginPath();
			ctx.arc(b.x, b.y, 8 + Math.sin(g.t * 24) * 1.8, 0, Math.PI * 2);
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
	}
	ctx.globalAlpha = 1;

	// --- ENEMY ABILITY VFX ---
	// Dash: fading afterimage ghost copies of enemy paddle
	if (g.dashT > 0) {
		const da = Math.min(g.dashT / 0.3, 1);
		for (let i = 1; i <= 3; i++) {
			const yOff = Math.sin(g.t * 20 + i * 2) * i * 8;
			ctx.globalAlpha = 0.08 * da * (1 - i * 0.25);
			ctx.fillStyle = "#ffa";
			ctx.shadowColor = "rgba(255,255,160,0.3)";
			ctx.shadowBlur = 6;
			ctx.fillRect(EX - PAD_W / 2, g.ey - g.eH / 2 + yOff, PAD_W, g.eH);
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Blink: flash at old/new position
	if (g.blinkFlash > 0) {
		ctx.globalAlpha = g.blinkFlash * 0.3;
		ctx.fillStyle = "#a7f";
		ctx.shadowColor = "rgba(170,120,255,0.6)";
		ctx.shadowBlur = 20;
		ctx.fillRect(EX - 30, g.ey - g.eH / 2 - 10, 60, g.eH + 20);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Bulk: pulsing glow and thick border on enlarged paddle
	if (g.bulkT > 0) {
		const bp = Math.sin(g.t * 8) * 0.3 + 0.7;
		ctx.globalAlpha = 0.08 * bp;
		ctx.fillStyle = "#f64";
		ctx.shadowColor = "rgba(255,100,60,0.4)";
		ctx.shadowBlur = 16;
		ctx.fillRect(EX - PAD_W - 4, g.ey - g.eH / 2 - 4, PAD_W * 2 + 8, g.eH + 8);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 0.12 * bp;
		ctx.strokeStyle = "#f84";
		ctx.lineWidth = 1.5;
		ctx.strokeRect(
			EX - PAD_W / 2 - 6,
			g.ey - g.eH / 2 - 6,
			PAD_W + 12,
			g.eH + 12,
		);
		ctx.globalAlpha = 1;
	}
	// Pull: gravity tendrils from enemy to ball
	if (g.pullT > 0) {
		const pa = Math.min(g.pullT / 1, 1) * 0.2;
		ctx.globalAlpha = pa;
		ctx.strokeStyle = "#6af";
		ctx.lineWidth = 0.8;
		ctx.shadowColor = "rgba(100,160,255,0.3)";
		ctx.shadowBlur = 6;
		for (let i = 0; i < 3; i++) {
			ctx.beginPath();
			const ox = EX - 20,
				oy = g.ey + (i - 1) * g.eH * 0.3;
			for (let j = 0; j <= 6; j++) {
				const t2 = j / 6;
				const nx =
					lerp(ox, g.bx, t2) +
					Math.sin(g.t * 10 + i * 2 + j * 1.7) * 12 * (1 - t2);
				const ny =
					lerp(oy, g.by, t2) +
					Math.cos(g.t * 12 + i * 3 + j * 1.3) * 8 * (1 - t2);
				j === 0 ? ctx.moveTo(nx, ny) : ctx.lineTo(nx, ny);
			}
			ctx.stroke();
		}
		// Pull vortex at ball
		ctx.beginPath();
		ctx.arc(g.bx, g.by, 14 + Math.sin(g.t * 9) * 4, 0, Math.PI * 2);
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Spin return: smooth swirl indicator on ball
	if (g.spinCurveT > 0) {
		const sa = g.spinCurveT / 0.7;
		ctx.globalAlpha = 0.2 * sa;
		ctx.strokeStyle = "#ff8";
		ctx.lineWidth = 1;
		ctx.shadowColor = "rgba(255,255,120,0.2)";
		ctx.shadowBlur = 4;
		ctx.beginPath();
		ctx.arc(
			g.bx,
			g.by,
			12 + Math.sin(g.t * 6) * 5,
			g.t * 8,
			g.t * 8 + Math.PI * 1.5,
		);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(
			g.bx,
			g.by,
			7 + Math.cos(g.t * 5) * 3,
			g.t * -6,
			g.t * -6 + Math.PI,
		);
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Continuous spin: rotating dashed circle around ball
	if (Math.abs(g.spin) > 15) {
		const spinStr = Math.min(Math.abs(g.spin) / 150, 1);
		const dashCount = 8;
		const gapFrac = 0.35;
		const segAngle = (Math.PI * 2) / dashCount;
		const dashLen = segAngle * (1 - gapFrac);
		const radius = BALL_SZ + 5 + Math.sin(g.t * 7) * 2;
		const rotSpeed = -Math.sign(g.spin) * 4;
		const angle = g.t * rotSpeed;
		ctx.save();
		ctx.globalAlpha = 0.7 * spinStr;
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 1.5;
		ctx.shadowColor = "rgba(255,255,255,0.8)";
		ctx.shadowBlur = 10;
		for (let i = 0; i < dashCount; i++) {
			const start = angle + i * segAngle;
			ctx.beginPath();
			ctx.arc(g.bx, g.by, radius, start, start + dashLen);
			ctx.stroke();
		}
		// Inner ring, counter-rotating
		const innerR = BALL_SZ + 1;
		ctx.globalAlpha = 0.45 * spinStr;
		ctx.lineWidth = 1;
		for (let i = 0; i < dashCount; i++) {
			const start = -angle * 0.7 + i * segAngle + segAngle * 0.5;
			ctx.beginPath();
			ctx.arc(g.bx, g.by, innerR, start, start + dashLen * 0.6);
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
		ctx.restore();
	}
	// Lightning channel: growing energy field around enemy + crackling bolts
	if (g.eAbilPhase === "channel") {
		const cp = 1 - g.ltChannel / 0.7;
		// Enemy glow intensifies
		ctx.globalAlpha = 0.1 + cp * 0.2;
		ctx.fillStyle = "#4af";
		ctx.shadowColor = "rgba(80,160,255,0.6)";
		ctx.shadowBlur = 20 + cp * 20;
		ctx.fillRect(
			EX - PAD_W / 2 - 10,
			g.ey - g.eH / 2 - 10,
			PAD_W + 20,
			g.eH + 20,
		);
		ctx.shadowBlur = 0;
		// Electric field arcs (time-based, smooth rotation)
		ctx.strokeStyle = "rgba(120,180,255," + (0.1 + cp * 0.15) + ")";
		ctx.lineWidth = 0.5;
		for (let i = 0; i < 3; i++) {
			const r = 20 + cp * 40 + i * 15;
			const a0 = g.t * 4 + i * 2.1;
			ctx.beginPath();
			ctx.arc(EX, g.ey, r, a0, a0 + Math.PI * (0.3 + cp * 0.3));
			ctx.stroke();
		}
		// Charging indicator bar
		ctx.globalAlpha = 0.6;
		ctx.fillStyle = "#08f";
		ctx.fillRect(EX - 25, g.ey - g.eH / 2 - 16, 50 * cp, 3);
		ctx.strokeStyle = "#4af";
		ctx.lineWidth = 0.5;
		ctx.strokeRect(EX - 25, g.ey - g.eH / 2 - 16, 50, 3);
		ctx.globalAlpha = 1;
	}
	// Lightning strike: ball stunned + electric cage
	if (g.eAbilPhase === "strike") {
		const sp = Math.max(g.ltStun / 0.5, 0);
		// Ball electric cage (rotating hex)
		ctx.globalAlpha = 0.2 + 0.15 * Math.sin(g.t * 40);
		ctx.strokeStyle = "#8cf";
		ctx.lineWidth = 1;
		ctx.shadowColor = "rgba(130,200,255,0.5)";
		ctx.shadowBlur = 10;
		ctx.beginPath();
		for (let i = 0; i < 6; i++) {
			const a = (i * Math.PI) / 3 + g.t * 12,
				r = 12 + Math.sin(g.t * 20 + i) * 4;
			const px = g.bx + Math.cos(a) * r + Math.sin(g.t * 55) * 1.5,
				py = g.by + Math.sin(a) * r + Math.cos(g.t * 50) * 1.5;
			i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
		}
		ctx.closePath();
		ctx.stroke();
		// Inner crackle (deterministic jagged lines)
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 0.5;
		ctx.globalAlpha = 0.3 * sp;
		for (let i = 0; i < 3; i++) {
			ctx.beginPath();
			const sx = g.bx + Math.sin(g.t * 22 + i * 4) * 8,
				sy = g.by + Math.cos(g.t * 19 + i * 5) * 8;
			ctx.moveTo(sx, sy);
			ctx.lineTo(
				sx + Math.sin(g.t * 31 + i * 7) * 12,
				sy + Math.cos(g.t * 27 + i * 9) * 12,
			);
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Lightning bolts (shared by channel + strike)
	for (const bolt of g.ltBolts) {
		const storm = !!bolt.storm;
		const ba = storm ? Math.min(1, bolt.life / 0.24) : bolt.life / 0.35;
		ctx.globalAlpha = storm ? 0.85 * ba : ba * 0.7;
		ctx.strokeStyle = storm ? "#dff" : "#adf";
		ctx.lineWidth = (storm ? 2.6 : 1.5) + (storm ? ba * 1.2 : ba);
		ctx.shadowColor = storm
			? "rgba(210,240,255,0.95)"
			: "rgba(160,200,255,0.7)";
		ctx.shadowBlur = storm ? 14 : 8;
		ctx.beginPath();
		bolt.segs.forEach((s, i) => {
			i === 0 ? ctx.moveTo(s.x1, s.y1) : 0;
			ctx.lineTo(s.x2, s.y2);
		});
		ctx.stroke();
		// Core (brighter, thinner)
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = storm ? 1 : 0.5;
		ctx.shadowBlur = storm ? 7 : 4;
		ctx.beginPath();
		bolt.segs.forEach((s, i) => {
			i === 0 ? ctx.moveTo(s.x1, s.y1) : 0;
			ctx.lineTo(s.x2, s.y2);
		});
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Timestop: frozen ball with time distortion rings
	if (g.tsT > 0) {
		const ta = Math.min(g.tsT / 1, 1);
		ctx.globalAlpha = 0.1 * ta;
		ctx.strokeStyle = "#4dd";
		ctx.lineWidth = 1;
		ctx.shadowColor = "rgba(60,200,200,0.3)";
		ctx.shadowBlur = 8;
		for (let i = 0; i < 3; i++) {
			const r = 18 + i * 14 + Math.sin(g.t * 3 + i) * 4;
			ctx.beginPath();
			ctx.arc(g.bx, g.by, r, 0, Math.PI * 2);
			ctx.stroke();
		}
		// Frozen crystal effect
		ctx.globalAlpha = 0.15 * ta;
		ctx.fillStyle = "#8ff";
		for (let i = 0; i < 4; i++) {
			const a = g.t * 0.5 + (i * Math.PI) / 2,
				r = 10;
			ctx.fillRect(
				g.bx + Math.cos(a) * r - 1,
				g.by + Math.sin(a) * r - 1,
				2,
				2,
			);
		}
		// Clock-like tick marks
		ctx.strokeStyle = "rgba(100,220,220," + 0.08 * ta + ")";
		ctx.lineWidth = 0.5;
		for (let i = 0; i < 12; i++) {
			const a = (i * Math.PI) / 6;
			ctx.beginPath();
			ctx.moveTo(g.bx + Math.cos(a) * 22, g.by + Math.sin(a) * 22);
			ctx.lineTo(g.bx + Math.cos(a) * 26, g.by + Math.sin(a) * 26);
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Voidpulse: expanding shockwave ring
	if (g.vpT > 0) {
		const vp = 1 - g.vpT / 0.6,
			r = vp * GW * 0.4;
		ctx.globalAlpha = 0.15 * (1 - vp);
		ctx.strokeStyle = "#a4f";
		ctx.lineWidth = 2 + vp * 3;
		ctx.shadowColor = "rgba(160,60,255,0.4)";
		ctx.shadowBlur = 12;
		ctx.beginPath();
		ctx.arc(g.vpX, g.vpY, r, 0, Math.PI * 2);
		ctx.stroke();
		ctx.lineWidth = 0.5;
		ctx.beginPath();
		ctx.arc(g.vpX, g.vpY, r * 0.7, 0, Math.PI * 2);
		ctx.stroke();
		// Distortion lines
		ctx.globalAlpha = 0.06 * (1 - vp);
		for (let i = 0; i < 8; i++) {
			const a = (i * Math.PI) / 4;
			ctx.beginPath();
			ctx.moveTo(g.vpX + Math.cos(a) * 10, g.vpY + Math.sin(a) * 10);
			ctx.lineTo(g.vpX + Math.cos(a) * r * 1.1, g.vpY + Math.sin(a) * r * 1.1);
			ctx.stroke();
		}
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	// Enemy ability cooldown indicator (right side near enemy)
	if (g.eAbil.id !== "none" && (g.freezeT || 0) <= 0) {
		const eaRdy = g.eAbilCD <= 0 && g.eAbilPhase === "idle";
		const eaFill = eaRdy ? 1 : Math.max(0, 1 - g.eAbilCD / g.eAbil.cd);
		const isActive = g.eAbilActive > 0 || g.eAbilPhase === "channel" || g.eAbilPhase === "strike";

		// Ability name + status text (top-right HUD area)
		const hudX = GW - 12;
		const hudY = 14;
		ctx.textAlign = "right";
		ctx.textBaseline = "top";

		// Ability name label
		ctx.fillStyle = isActive ? "#ff6666" : (eaRdy ? "#ff8888" : "#777");
		ctx.font = 'bold 13px "Share Tech Mono",monospace';
		ctx.fillText(g.eAbil.icon + " " + g.eAbil.name, hudX, hudY);

		// Status line: CD timer or ACTIVE or READY
		ctx.font = 'bold 11px "Share Tech Mono",monospace';
		if (isActive) {
			const durLeft = g.eAbilActive > 0 ? g.eAbilActive : (g.eAbilPhase === "channel" ? g.ltChannel : 0);
			ctx.fillStyle = "#ff4444";
			ctx.shadowColor = "rgba(255,60,60,0.6)";
			ctx.shadowBlur = 8;
			ctx.fillText("ACTIVE " + durLeft.toFixed(1) + "s", hudX, hudY + 18);
			ctx.shadowBlur = 0;
		} else if (eaRdy) {
			const pulse = 0.6 + 0.4 * Math.sin(g.t * 5);
			ctx.globalAlpha = pulse;
			ctx.fillStyle = "#ff6644";
			ctx.fillText("READY", hudX, hudY + 18);
			ctx.globalAlpha = 1;
		} else {
			ctx.fillStyle = "#666";
			ctx.fillText("CD " + g.eAbilCD.toFixed(1) + "s", hudX, hudY + 18);
		}

		// Cooldown bar next to enemy paddle
		const barX = EX + 14;
		const barH = 50;
		const barW = 5;
		ctx.fillStyle = "#151515";
		ctx.fillRect(barX, g.ey - barH/2, barW, barH);
		if (isActive) {
			ctx.fillStyle = "#ff4444";
			ctx.shadowColor = "rgba(255,60,60,0.5)";
			ctx.shadowBlur = 6;
			ctx.fillRect(barX, g.ey - barH/2, barW, barH);
			ctx.shadowBlur = 0;
		} else {
			ctx.fillStyle = eaRdy ? "#f44" : "#444";
			if (eaRdy) { ctx.shadowColor = "rgba(255,80,80,0.4)"; ctx.shadowBlur = 4; }
			ctx.fillRect(barX, g.ey + barH/2 - barH * eaFill, barW, barH * eaFill);
			ctx.shadowBlur = 0;
		}
		ctx.fillStyle = eaRdy ? "#f88" : "#665";
		ctx.font = '10px "Share Tech Mono",monospace';
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";
		ctx.fillText(g.eAbil.icon, barX + 8, g.ey);

		// show warden special ability text / cooldown
		if (g.cfg.enemy.id === "warden") {
			if (g.wStormActive) {
				ctx.fillStyle = "#88f";
				ctx.font = 'bold 12px "Share Tech Mono",monospace';
				ctx.textAlign = "center";
				ctx.textBaseline = "bottom";
				ctx.shadowColor = "rgba(136,200,255,0.6)";
				ctx.shadowBlur = 12;
				ctx.fillText("THUNDERSTORM", EX, g.ey - g.eH / 2 - 8);
				ctx.shadowBlur = 0;
				ctx.globalAlpha = 1;
			} else if (g.wStormCD > 0) {
				ctx.fillStyle = "#88f";
				ctx.font = '8px "Share Tech Mono",monospace';
				ctx.textAlign = "center";
				ctx.textBaseline = "bottom";
				ctx.fillText("CD " + g.wStormCD.toFixed(1), EX, g.ey - g.eH / 2 - 4);
				ctx.globalAlpha = 1;
			}
		}
	}

	// Enemy ability activation banner
	if (g._eAbilFlash > 0) {
		const bAlpha = Math.min(g._eAbilFlash, 0.6);
		if (bAlpha > 0.02) {
			// Red warning stripe across top
			ctx.globalAlpha = bAlpha * 0.5;
			ctx.fillStyle = "#330000";
			ctx.fillRect(0, 0, GW, 28);
			// Warning text
			ctx.globalAlpha = bAlpha;
			ctx.fillStyle = "#ff4444";
			ctx.font = 'bold 12px "Share Tech Mono",monospace';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.shadowColor = "rgba(255,60,60,0.8)";
			ctx.shadowBlur = 10;
			ctx.fillText("� ENEMY " + (g._eAbilFlashName || "ABILITY") + " �", GW / 2, 8);
			ctx.shadowBlur = 0;
			ctx.globalAlpha = 1;
		}
	}

	// HUD
	ctx.fillStyle = col.p;
	ctx.shadowColor = col.g + "0.5)";
	ctx.shadowBlur = 3;
	for (let i = 0; i < Math.max(0, g.lives); i++)
		ctx.fillRect(14 + i * 12, GH - 14, 5, 5);
	ctx.shadowBlur = 0;
	if (g.shields > 0) {
		ctx.fillStyle = "#6688aa";
		ctx.font = '8px "Share Tech Mono",monospace';
		ctx.textAlign = "left";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("SAVE x" + g.shields, 14, GH - 19);
	}
	if (g.rallyHits > 0) {
		const spdPct = Math.round(((g.ballSpd / (g.bs || 1)) - 1) * 100);
		const spdA = g.rallyHits >= 4 ? 0.5 + 0.2 * Math.sin(g.t * 6) : 0.35;
		ctx.fillStyle = col.g + spdA + ")";
		ctx.font = 'bold 10px "Share Tech Mono",monospace';
		ctx.textAlign = "right";
		ctx.textBaseline = "alphabetic";
		ctx.fillText("SPD +" + spdPct + "%", GW - 14, GH - 22);
	}
	ctx.fillStyle = "#778";
	ctx.font = '10px "Share Tech Mono",monospace';
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	const eL =
		g.cfg?.enemy?.id !== "basic" ? " " + (g.cfg.enemy?.tag || "") + (g.cfg.enemy?.name || "") : "";
	const eAL = g.eAbil?.id !== "none" ? " [" + (g.eAbil?.name || "") + "]" : "";
	if (g.cfg?.enemy?.id !== "thefool")
		ctx.fillText(
			"W" +
				g.cfg.wv +
				(g.cfg.boss ? " BOSS" : "") +
				eL +
				eAL +
				(g.foolSidesSwapped ? "  |  SWAPPED" : ""),
			GW / 2,
			GH - 4,
		);
	const cdMax = (g.pad?.cd ?? 999) * (g.cdMul ?? 1),
		rdy = g.abCD <= 0,
		fill = rdy ? 1 : 1 - g.abCD / (cdMax || 1);
	if (g.padId !== "classic") {
		ctx.fillStyle = "#151515";
		ctx.fillRect(14, GH - 32, 100, 4);
		if (rdy) {
			ctx.shadowColor = col.g + "0.4)";
			ctx.shadowBlur = 6;
		}
		ctx.fillStyle = rdy ? col.p : "#444";
		ctx.fillRect(14, GH - 32, 100 * fill, 4);
		ctx.shadowBlur = 0;
	}
	ctx.fillStyle = rdy ? "#ddd" : "#666";
	ctx.font = 'bold 11px "Share Tech Mono",monospace';
	ctx.textAlign = "left";
	if (g.padId !== "classic") {
		ctx.fillText(
			"[Q] " + (g.pad?.abil || "ABILITY") + (rdy ? " RDY" : " " + g.abCD.toFixed(1) + "s"),
			14,
			GH - 38,
		);
	}
	if (g.combo >= 3) {
		ctx.fillStyle = col.g + (0.4 + 0.25 * Math.sin(g.t * 5)) + ")";
		ctx.font = 'bold 12px "Share Tech Mono",monospace';
		ctx.textAlign = "right";
		ctx.textBaseline = "alphabetic";
		ctx.fillText(g.combo + "x", GW - 14, GH - 6);
	}

	// Center combo pop-up
	if (g.centerComboPopT > 0 && g.centerComboPop) {
		const a = Math.min(g.centerComboPopT, 1);
		const rise = (1 - g.centerComboPopT) * 30;
		ctx.save();
		ctx.globalAlpha = a;
		ctx.fillStyle = g.centerCombo >= 10 ? "#ffee00" : g.centerCombo >= 5 ? "#ff9900" : "#66ff66";
		ctx.font = 'bold 14px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(g.centerComboPop, g.px + PAD_W + 60, g.py - 20 - rise);
		ctx.restore();
	}

	// NULL field indicator
	if (g.nullField) {
		const nullActive = g._nullActiveT > 0;
		ctx.save();
		ctx.font = 'bold 11px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		if (nullActive) {
			const pulse = 0.6 + 0.4 * Math.sin(g.t * 4);
			ctx.globalAlpha = pulse;
			ctx.fillStyle = "#ff2244";
			ctx.fillText("� NULL ACTIVE �", GW / 2, GH - 18);
		} else {
			const cd = Math.ceil(g._nullCooldownT);
			ctx.globalAlpha = 0.4;
			ctx.fillStyle = "#888";
			ctx.fillText("NULL " + cd + "s", GW / 2, GH - 18);
		}
		ctx.restore();
	}

	// Angel Steps remaining
	if (g.angelSteps > 0) {
		ctx.save();
		ctx.font = 'bold 11px "Share Tech Mono",monospace';
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.globalAlpha = 0.7;
		ctx.fillStyle = "#ffe880";
		ctx.fillText("& ANGEL x" + g.angelSteps, 12, GH - 18);
		ctx.restore();
	}

	// Angel Steps teleport flash
	if (g._angelFlashT > 0) {
		const fa = g._angelFlashT / 0.6;
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = fa * 0.4;
		ctx.fillStyle = "#fffff0";
		ctx.fillRect(g.px - PAD_W, g.py - g.ph / 2 - 10, PAD_W * 3, g.ph + 20);
		ctx.restore();
	}

	// Corner cooldown/status overlays removed by request.

	// Start-of-point trajectory indicator (short directional arrow from ball)
	if (g.startPause > 0 && !g.done) {
		const serveMax = Math.max(0.001, g.startPauseMax || 0.12);
		const serveLinear = clamp(1 - g.startPause / serveMax, 0, 1);
		const serveT = clamp(
			serveLinear * serveLinear * (3 - 2 * serveLinear) * 1.1,
			0,
			1,
		);
		const arcT = easeOut(serveT);
		const descendT = easeOut(serveT);
		const ringR = lerp(40, 2.6, arcT);
		const ringA = 0.12 + 0.26 * (1 - arcT);
		const ringX = g.bx;
		const ringY = g.by;
		ctx.save();
		ctx.globalAlpha = Math.max(0.06, ringA * 0.45);
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
		ctx.stroke();
		ctx.globalAlpha = ringA;
		ctx.strokeStyle = col.p;
		ctx.lineWidth = 1.5 + arcT * 0.6;
		ctx.shadowColor = col.g + "0.5)";
		ctx.shadowBlur = 8;
		ctx.beginPath();
		ctx.arc(
			ringX,
			ringY,
			ringR,
			-Math.PI / 2,
			-Math.PI / 2 + Math.PI * 2 * arcT,
		);
		ctx.stroke();
		const burstT = clamp((serveLinear - 0.7) / 0.3, 0, 1);
		if (burstT > 0) {
			const burstEase = easeOut(burstT);
			ctx.globalAlpha = (1 - burstT) * 0.7;
			ctx.lineWidth = 1.2;
			ctx.shadowBlur = 12;
			ctx.beginPath();
			ctx.arc(g.bx, g.by, ringR + 1 + burstEase * 12, 0, Math.PI * 2);
			ctx.stroke();
			ctx.globalAlpha = 0.08 + 0.24 * burstEase;
			ctx.fillStyle = col.p;
			ctx.beginPath();
			ctx.arc(g.bx, g.by, 2 + burstEase * 3, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.shadowBlur = 0;
		ctx.restore();

		const aDir = g.pendingDir || 1;
		const pulse = 0.5 + 0.5 * Math.sin(g.t * 8);
		const spd = g.ballSpd;
		const pv = typeof g.pendingVy === "number" ? g.pendingVy : 0;
		const dx = aDir * spd,
			dy = pv;
		const len = Math.max(1, Math.hypot(dx, dy));
		const ux = dx / len,
			uy = dy / len;
		const arm = 44 + 14 * arcT + 6 * pulse;
		const tx = g.bx + ux * arm,
			ty = g.by + uy * arm;
		const ah = 10 + 2 * pulse;
		ctx.save();
		ctx.globalAlpha = 0.46 + 0.28 * arcT;
		ctx.strokeStyle = col.p;
		ctx.fillStyle = col.p;
		ctx.shadowColor = col.g + "0.6)";
		ctx.shadowBlur = 14;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(g.bx, g.by);
		ctx.lineTo(tx - ux * ah * 0.9, ty - uy * ah * 0.9);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(tx, ty);
		ctx.lineTo(tx - ux * ah - uy * ah * 0.45, ty - uy * ah + ux * ah * 0.45);
		ctx.lineTo(tx - ux * ah + uy * ah * 0.45, ty - uy * ah - ux * ah * 0.45);
		ctx.closePath();
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.restore();
	}

	const sp = getSP(ctx);
	if (sp) {
		ctx.fillStyle = sp;
		ctx.fillRect(0, 0, GW, GH);
	}
	if (Math.random() < 0.008) {
		ctx.fillStyle = "rgba(255,255,255,0.003)";
		ctx.fillRect(0, 0, GW, GH);
	}

	// Floating score pop-ups (suppressed while major text overlays are active)
	if (!majorTextBusy && !g.wStormActive) {
		for (const pop of g.scorePops) {
			const lifeMax = Math.max(0.001, pop.max || 0.8);
			const lifeT = clamp(pop.life / lifeMax, 0, 1);
			const alpha = lifeT > 0.35 ? 1 : lifeT / 0.35;
			const scale = (pop.scale || 1) + (1 - lifeT) * 0.08;
			ctx.globalAlpha = alpha;
			ctx.fillStyle = "#fff";
			ctx.shadowColor = col.g + "0.8)";
			ctx.shadowBlur = 12;
			ctx.font = `bold ${Math.round(16 * scale)}px "Share Tech Mono",monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(pop.text, pop.x, pop.y);
			ctx.shadowBlur = 0;
		}
	}
	ctx.globalAlpha = 1;

	// Done
	if (g.done) {
		if (isKleinLossState(g) && g.kleinEndActive) {
			let blackA = 1;
			if (g.kleinEndPhase === 0) blackA = clamp(g.kleinEndT / 0.78, 0, 1);
			ctx.fillStyle = `rgba(0,0,0,${blackA})`;
			ctx.fillRect(0, 0, GW, GH);

			if (g.kleinEndPhase === 1) {
				const q = clamp(g.kleinEndT / 2.25, 0, 1);
				const qFade = Math.min(1, q / 0.2) * Math.min(1, (1 - q) / 0.18);
				const pulse = 0.5 + 0.5 * Math.sin(g.t * 3.3);
				ctx.globalAlpha = 0.95 * qFade;
				drawSmokeTextAura(ctx, GW / 2, GH * 0.46, g.t + 2.8, 1.5);
				ctx.fillStyle = "rgba(232,232,248,0.96)";
				ctx.font = 'bold 28px "Times New Roman",serif';
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.shadowColor = "rgba(210,210,245,0.9)";
				ctx.shadowBlur = 18 + 10 * pulse;
				ctx.fillText(
					"" + (g.kleinEndQuote || "The Arcana closes over you.") + "",
					GW / 2,
					GH * 0.46,
					GW * 0.86,
				);
				ctx.shadowBlur = 0;
				ctx.globalAlpha = 1;
			}

			if (g.kleinEndPhase === 2) {
				const a = clamp(g.kleinEndT / 0.74, 0, 1);
				ctx.fillStyle = `rgba(0,0,0,${a})`;
				ctx.fillRect(0, 0, GW, GH);
			}
		} else {
			const da = Math.min(g.doneT * 3.5, 1);
			ctx.fillStyle = `rgba(0,0,0,${da * 0.9})`;
			ctx.fillRect(0, 0, GW, GH);
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const ts = 0.75 + easeOut(Math.min(g.doneT * 4, 1)) * 0.25;
			ctx.save();
			ctx.translate(GW / 2, GH / 2 - 20);
			ctx.scale(ts, ts);
			ctx.shadowColor = col.g + "0.5)";
			ctx.shadowBlur = 30 * da;
			ctx.fillStyle = `rgba(255,255,255,${da})`;
			ctx.font = 'bold 60px "Share Tech Mono",monospace';
			if (g.result === "win") ctx.fillText("CLEAR", 0, 0);
			else {
				ctx.fillText(g.lives > 0 ? "FAULT" : "GAME OVER", 0, 0);
				if (g.lives > 0) {
					ctx.shadowBlur = 4;
					ctx.fillStyle = `rgba(200,180,160,${da})`;
					ctx.font = '12px "Share Tech Mono",monospace';
					ctx.fillText(
						g.lives + " " + (g.lives === 1 ? "LIFE" : "LIVES"),
						0,
						36,
					);
				}
				if (g.cfg.enemy.id === "thefool" && g.foolLoseLine) {
					ctx.shadowBlur = 10;
					ctx.fillStyle = `rgba(215,215,235,${da})`;
					ctx.font = '10px "Share Tech Mono",monospace';
					ctx.fillText("" + g.foolLoseLine + "", 0, 58);
				}
			}
			ctx.restore();
			if (g.doneT > 0.4) {
				const pa = Math.min((g.doneT - 0.4) * 3, 1);
				ctx.shadowBlur = 3;
				ctx.fillStyle = `rgba(180,170,150,${pa})`;
				ctx.font = '10px "Share Tech Mono",monospace';
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText("ENTER / CLICK", GW / 2, GH / 2 + 48);
			}
			ctx.shadowBlur = 0;
			if (sp) {
				ctx.fillStyle = sp;
				ctx.fillRect(0, 0, GW, GH);
			}
		}
	}
	if (showFoolLine) {
		const ta = Math.max(
			0,
			Math.min(1, g.foolLineT / Math.max(0.001, g.foolLineMax || 1)),
		);
		const specBusy = g.foolSpecT > 0 && g.foolSpecTextT > 0;
		const swapBusy = g.foolSwapT > 0;
		const lineY = swapBusy ? GH * 0.55 : specBusy ? GH * 0.48 : GH * 0.38;
		ctx.globalAlpha = 0.75 * Math.min(1, ta * 2);
		ctx.fillStyle = "rgba(215,215,235,0.92)";
		ctx.font = 'bold 13px "Times New Roman",serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(170,170,210,0.55)";
		ctx.shadowBlur = 8;
		drawSmokeTextAura(ctx, GW / 2, lineY, g.t + 1.4, 0.95);
		const floatSay = (g.foolLine || "").slice(
			0,
			Math.floor(g.foolLineShow || 0),
		);
		ctx.fillText(floatSay, GW / 2, lineY, GW * 0.72);
		ctx.shadowBlur = 0;
		ctx.globalAlpha = 1;
	}
	if (showFoolDialogBlocking) {
		const fade = Math.max(0, Math.min(1, g.foolDialogFade || 0));
		const pulse = 0.55 + 0.45 * Math.sin((g.foolDialogPulse || 0) * 3.2);
		const y = GH * 0.68;
		ctx.globalAlpha = 0.78 * fade;
		drawSmokeTextAura(ctx, GW / 2, y, g.t + 2.2, 1.3);
		ctx.fillStyle = "rgba(224,224,246,0.94)";
		ctx.font = 'italic 16px "Times New Roman",serif';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(190,190,230,0.55)";
		ctx.shadowBlur = 12;
		const blockSay = (g.foolDialogLine || "").slice(
			0,
			Math.floor(g.foolDialogShow || 0),
		);
		ctx.fillText(blockSay, GW / 2, y, GW * 0.8);
		ctx.shadowBlur = 0;
		ctx.fillStyle = "rgba(180,180,215," + (0.22 + 0.38 * pulse) * fade + ")";
		ctx.font = '8px "Times New Roman",serif';
		ctx.fillText("ENTER / CLICK", GW / 2, y + 28);
		ctx.globalAlpha = 1;
	}

	// --- TUTORIAL OVERLAY ---
	if (tut && tut.active) {
		const step = tutStep();

		// Blocking overlay panel
		if (step && tut.phase === "overlay") {
			const oa = Math.min(1, tut.overlayAlpha);
			// Dark background
			ctx.globalAlpha = 0.5 * oa;
			ctx.fillStyle = "#000";
			ctx.fillRect(0, 0, GW, GH);

			// Highlight
			if (step.highlight === "paddle" && oa > 0.3) {
				ctx.globalAlpha = 0.1 * oa;
				ctx.fillStyle = "#fff";
				ctx.shadowColor = "rgba(255,255,255,0.4)";
				ctx.shadowBlur = 18;
				ctx.fillRect(g.px - PAD_W / 2 - 10, g.py - g.ph / 2 - 10, PAD_W + 20, g.ph + 20);
				ctx.shadowBlur = 0;
			} else if (step.highlight === "ball" && oa > 0.3) {
				ctx.globalAlpha = 0.12 * oa;
				ctx.fillStyle = "#fff";
				ctx.shadowColor = "rgba(255,255,255,0.4)";
				ctx.shadowBlur = 18;
				ctx.beginPath();
				ctx.arc(g.bx, g.by, 20, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
			}

			// --- Measure content to compute dynamic panel height ---
			const panelW = 380;
			const pad = 22;
			const maxTextW = panelW - 48;
			let cy = 0; // cursor tracking content height

			// Step counter height
			cy += pad + 11 + 8; // top pad + font + gap

			// Title height
			cy += 26 + 12; // font + gap

			// Body word wrap measurement
			ctx.font = '13px "Share Tech Mono",monospace';
			const words = step.body.split(" ");
			let bodyLines = [], curLine = "";
			for (const w of words) {
				const test = curLine ? curLine + " " + w : w;
				if (ctx.measureText(test).width > maxTextW && curLine) {
					bodyLines.push(curLine);
					curLine = w;
				} else curLine = test;
			}
			if (curLine) bodyLines.push(curLine);
			const lineH = 18;
			cy += bodyLines.length * lineH + 12;

			// Keys height
			const hasKeys = step.keys.length > 0;
			if (hasKeys) {
				cy += 28 + 6; // keycap + gap
				if (step.keyLabel) cy += 14; // label
				cy += 10;
			}

			// Enter prompt + ESC
			cy += 12 + 8 + 10 + pad; // enter + gap + esc + bottom pad

			const panelH = cy;
			const panelX = GW / 2 - panelW / 2;
			const panelY = GH / 2 - panelH / 2;

			// Panel background
			ctx.globalAlpha = 0.92 * oa;
			ctx.fillStyle = "rgba(8,8,14,0.97)";
			ctx.strokeStyle = "rgba(255,255,255,0.08)";
			ctx.lineWidth = 1;
			const r = 8;
			ctx.beginPath();
			ctx.moveTo(panelX + r, panelY);
			ctx.lineTo(panelX + panelW - r, panelY);
			ctx.quadraticCurveTo(panelX + panelW, panelY, panelX + panelW, panelY + r);
			ctx.lineTo(panelX + panelW, panelY + panelH - r);
			ctx.quadraticCurveTo(panelX + panelW, panelY + panelH, panelX + panelW - r, panelY + panelH);
			ctx.lineTo(panelX + r, panelY + panelH);
			ctx.quadraticCurveTo(panelX, panelY + panelH, panelX, panelY + panelH - r);
			ctx.lineTo(panelX, panelY + r);
			ctx.quadraticCurveTo(panelX, panelY, panelX + r, panelY);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// Top accent line
			ctx.globalAlpha = 0.25 * oa;
			ctx.fillStyle = "#fff";
			ctx.fillRect(panelX + panelW * 0.2, panelY, panelW * 0.6, 1);

			// --- Draw content top-down ---
			let dy = panelY + pad;

			// Step counter
			ctx.globalAlpha = 0.35 * oa;
			ctx.fillStyle = "#8890a0";
			ctx.font = '10px "Share Tech Mono",monospace';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(`STEP ${tut.stepIdx + 1} / ${TUT_STEPS.length}`, GW / 2, dy);
			dy += 11 + 8;

			// Title
			ctx.globalAlpha = oa;
			ctx.fillStyle = "#fff";
			ctx.font = 'bold 22px "Share Tech Mono",monospace';
			ctx.textBaseline = "top";
			ctx.shadowColor = "rgba(255,255,255,0.15)";
			ctx.shadowBlur = 12;
			ctx.fillText(step.title, GW / 2, dy);
			ctx.shadowBlur = 0;
			dy += 26 + 12;

			// Body
			ctx.globalAlpha = 0.8 * oa;
			ctx.fillStyle = "#c0c2d0";
			ctx.font = '13px "Share Tech Mono",monospace';
			ctx.textBaseline = "top";
			for (let i = 0; i < bodyLines.length; i++) {
				ctx.fillText(bodyLines[i], GW / 2, dy + i * lineH);
			}
			dy += bodyLines.length * lineH + 12;

			// Keys
			if (hasKeys) {
				const keyW = step.keys.length === 1 && step.keys[0] === "SPACE" ? 58 : 28;
				const keyH = 26;
				const gap = 8;
				const totalW = step.keys.length * keyW + (step.keys.length - 1) * gap;
				let kx = GW / 2 - totalW / 2;
				ctx.textBaseline = "middle";
				for (const k of step.keys) {
					const thisW = k === "SPACE" ? 58 : keyW;
					ctx.globalAlpha = 0.88 * oa;
					ctx.fillStyle = "rgba(30,30,42,0.95)";
					ctx.strokeStyle = "rgba(110,110,140,0.45)";
					ctx.lineWidth = 1;
					const kr = 4;
					ctx.beginPath();
					ctx.moveTo(kx + kr, dy);
					ctx.lineTo(kx + thisW - kr, dy);
					ctx.quadraticCurveTo(kx + thisW, dy, kx + thisW, dy + kr);
					ctx.lineTo(kx + thisW, dy + keyH - kr);
					ctx.quadraticCurveTo(kx + thisW, dy + keyH, kx + thisW - kr, dy + keyH);
					ctx.lineTo(kx + kr, dy + keyH);
					ctx.quadraticCurveTo(kx, dy + keyH, kx, dy + keyH - kr);
					ctx.lineTo(kx, dy + kr);
					ctx.quadraticCurveTo(kx, dy, kx + kr, dy);
					ctx.closePath();
					ctx.fill();
					ctx.stroke();
					ctx.globalAlpha = oa;
					ctx.fillStyle = "#eef";
					ctx.font = 'bold 13px "Share Tech Mono",monospace';
					ctx.textAlign = "center";
					ctx.fillText(k, kx + thisW / 2, dy + keyH / 2 + 1);
					kx += thisW + gap;
				}
				dy += keyH + 6;
				if (step.keyLabel) {
					ctx.globalAlpha = 0.45 * oa;
					ctx.fillStyle = "#a0a2b0";
					ctx.font = '10px "Share Tech Mono",monospace';
					ctx.textAlign = "center";
					ctx.textBaseline = "top";
					ctx.fillText(step.keyLabel, GW / 2, dy);
					dy += 14;
				}
				dy += 10;
			}

			// Enter prompt
			const pulse = 0.4 + 0.6 * Math.sin((g.t || 0) * 3);
			ctx.globalAlpha = pulse * 0.55 * oa;
			ctx.fillStyle = "#8890a0";
			ctx.font = '12px "Share Tech Mono",monospace';
			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText("PRESS ANY KEY", GW / 2, dy);
			dy += 14 + 8;

			// ESC skip
			ctx.globalAlpha = 0.6 * oa;
			ctx.fillStyle = "#aab";
			ctx.font = 'bold 12px "Share Tech Mono",monospace';
			ctx.fillText("[ESC] SKIP TUTORIAL", GW / 2, dy);

			ctx.globalAlpha = 1;
		}
		// Check phase  green checkmark feedback
		if (tut.phase === "check") {
			const ca = Math.min(1, tut.checkAlpha);
			const fadeOut = Math.max(0, Math.min(1, tut.checkTimer / 0.3));
			const a = ca * fadeOut;
			if (a > 0.01) {
				// Pill with checkmark + step title
				const checkText = "\u2713  " + tut.checkStepTitle;
				ctx.font = 'bold 16px "Share Tech Mono",monospace';
				const tw = ctx.measureText(checkText).width;
				const cpW = tw + 40, cpH = 36;
				const cpX = GW / 2 - cpW / 2, cpY = GH / 2 - cpH / 2;
				const cpr = cpH / 2;
				// Dark bg pill
				ctx.globalAlpha = 0.85 * a;
				ctx.fillStyle = "rgba(8,20,10,0.94)";
				ctx.beginPath();
				ctx.moveTo(cpX + cpr, cpY);
				ctx.lineTo(cpX + cpW - cpr, cpY);
				ctx.arc(cpX + cpW - cpr, cpY + cpr, cpr, -Math.PI / 2, Math.PI / 2);
				ctx.lineTo(cpX + cpr, cpY + cpH);
				ctx.arc(cpX + cpr, cpY + cpr, cpr, Math.PI / 2, -Math.PI / 2);
				ctx.closePath();
				ctx.fill();
				ctx.strokeStyle = "rgba(80,220,100,0.25)";
				ctx.lineWidth = 1;
				ctx.stroke();
				// Green checkmark text
				ctx.globalAlpha = a;
				ctx.fillStyle = "#5ddf70";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.shadowColor = "rgba(80,220,100,0.4)";
				ctx.shadowBlur = 10;
				ctx.fillText(checkText, GW / 2, GH / 2);
				ctx.shadowBlur = 0;
				ctx.globalAlpha = 1;
			}
		}
		// Active/wait phase hint bar at top (persists across serves)
		if (step && (tut.phase === "active" || (tut.phase === "wait" && tut.completedSteps.length > 0 && tut.hintAlpha > 0))) {
			const ha = Math.min(1, tut.hintAlpha);
			if (ha > 0.01) {
				const hintText = step.keyLabel || step.body;
				ctx.font = 'bold 18px "Share Tech Mono",monospace';
				const tw = ctx.measureText(hintText).width;
				const hpW = tw + 44, hpH = 38;
				const hpX = GW / 2 - hpW / 2, hpY = 6;
				ctx.globalAlpha = 0.75 * ha;
				ctx.fillStyle = "rgba(8,8,14,0.92)";
				// pill shape
				const pr = hpH / 2;
				ctx.beginPath();
				ctx.moveTo(hpX + pr, hpY);
				ctx.lineTo(hpX + hpW - pr, hpY);
				ctx.arc(hpX + hpW - pr, hpY + pr, pr, -Math.PI / 2, Math.PI / 2);
				ctx.lineTo(hpX + pr, hpY + hpH);
				ctx.arc(hpX + pr, hpY + pr, pr, Math.PI / 2, -Math.PI / 2);
				ctx.closePath();
				ctx.fill();
				ctx.strokeStyle = "rgba(255,255,255,0.08)";
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.globalAlpha = 0.9 * ha;
				ctx.fillStyle = "#dde";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.fillText(hintText, GW / 2, hpY + hpH / 2);
				ctx.globalAlpha = 1;
			}
		}
		// Persistent skip hint (bottom-right, always visible during tutorial gameplay)
		if (tut.phase === "wait" || tut.phase === "active" || tut.phase === "check") {
			ctx.globalAlpha = 0.5;
			ctx.fillStyle = "#aab";
			ctx.font = 'bold 12px "Share Tech Mono",monospace';
			ctx.textAlign = "right";
			ctx.textBaseline = "bottom";
			ctx.fillText("[ESC] SKIP TUTORIAL", GW - 12, GH - 10);
			ctx.globalAlpha = 1;
		}
		// Completion flash
		if (tut.completeFlash > 0) {
			ctx.globalAlpha = tut.completeFlash * 0.08;
			ctx.fillStyle = "#fff";
			ctx.fillRect(0, 0, GW, GH);
			ctx.globalAlpha = 1;
		}
	}
	// Tutorial complete overlay
	if (tut && !tut.active && tut.doneOverlayT > 0) {
		const da = Math.min(1, tut.doneOverlayT / 0.8);
		ctx.globalAlpha = 0.55 * da;
		ctx.fillStyle = "#000";
		ctx.fillRect(0, 0, GW, GH);

		// Accent line above
		ctx.globalAlpha = 0.15 * da;
		ctx.fillStyle = "#fff";
		ctx.fillRect(GW / 2 - 80, GH / 2 - 30, 160, 1);

		ctx.globalAlpha = da;
		ctx.fillStyle = "#fff";
		ctx.font = 'bold 32px "Share Tech Mono",monospace';
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.shadowColor = "rgba(255,255,255,0.2)";
		ctx.shadowBlur = 16;
		ctx.fillText("TUTORIAL COMPLETE", GW / 2, GH / 2 - 6);
		ctx.shadowBlur = 0;

		// Accent line below
		ctx.globalAlpha = 0.15 * da;
		ctx.fillStyle = "#fff";
		ctx.fillRect(GW / 2 - 80, GH / 2 + 16, 160, 1);

		ctx.globalAlpha = 0.55 * da;
		ctx.fillStyle = "#b0b2c0";
		ctx.font = '13px "Share Tech Mono",monospace';
		ctx.fillText("GOOD LUCK", GW / 2, GH / 2 + 34);
		ctx.globalAlpha = 1;
	}

	ctx.restore();
}

// --- SCREEN MANAGEMENT ---
const $ = (id) => document.getElementById(id);
function showScreen(id) {
	const prevScreen = curScreen;
	stopCardPhysics();
	$("pause-overlay").classList.add("hidden");
	paused = false;
	[
		"menu-screen",
		"cards-screen",
		"opp-screen",
		"go-screen",
		"vic-screen",
		"dev-screen",
	].forEach((s) => {
		$(s).classList.toggle("hidden", s !== id);
	});
	$("cv").style.display = id === null ? "block" : "none";
	curScreen = id;
	syncMenuMusicForScreen(id, prevScreen);
	// Auto-start card physics for the menu (pad-grid is pre-built)
	if (id === "menu-screen") {
		initCardPhysics($("pad-grid"));
		updateSkipTutBtn();
	}
}

function startWave(pid, wn) {
	g = newGame(pid, wn, savedState, enemyUps, chosenOppCfg);
	chosenOppCfg = null;
	padId = pid;
	showScreen(null);
	if (g.cfg.boss) setTimeout(SFX.boss, 80);
}

function doAbility() {
	if (
		!g ||
		g.done ||
		g.abCD > 0 ||
		g.pStunT > 0 ||
		(g.foolDialogActive && g.foolDialogBlocking)
	)
		return;
	const cd = (g.pad?.cd ?? 8) * g.cdMul,
		col = PCOL[g.padId];
	if (g.padId === "classic") return; // Standard has no ability
	const cast = () => {
		switch (g.padId) {
			case "oracle": {
				g.foresightT = 5.0;
				g.abCD = cd;
				SFX.abil();
				tone(860, 0.08, "sine", 0.045);
				tone(1120, 0.11, "sine", 0.03, 40);
				g.abilFlash = 0.4;
				g.shake = 0.05;
				g.flash = 0.12;
				g.flashCol = [0.27, 0.87, 1];
				addSparks(g, g.bx, g.by, 12, 90, [0.27, 0.87, 1]);
				break;
			}
			case "paradox": {
				const prevX = g.bx,
					prevY = g.by;
				const curSpd = Math.max(Math.hypot(g.bvx, g.bvy), g.ballSpd * 1.14);
				const headingAng = Math.atan2(g.bvy || 0, g.bvx || 1);
				const backAng = headingAng + Math.PI;
				const snapMin = 110;
				const snapMax = 250;
				const rewindDist = rng(snapMin, snapMax);
				const snapX = clamp(g.bx + Math.cos(backAng) * rewindDist, 60, GW - 60);
				const snapY = clamp(g.by + rng(-110, 110), 24, GH - 24);
				g.bx = snapX;
				g.by = snapY;
				const offsetDeg = rng(60, 180) * (Math.random() < 0.5 ? -1 : 1);
				const relaunchAng = backAng + (offsetDeg * Math.PI) / 180;
				g.bvx = Math.abs(Math.cos(relaunchAng)) * curSpd;
				g.bvy = Math.sin(relaunchAng) * curSpd;
				if (Math.abs(g.bvx) < curSpd * 0.35) g.bvx = curSpd * 0.35;
				g.bvx *= 1.02;
				g.bvy = clamp(g.bvy + rng(-45, 45), -curSpd * 0.95, curSpd * 0.95);
				g.abCD = cd;
				SFX.abil();
				tone(720, 0.08, "sine", 0.05);
				tone(1040, 0.1, "square", 0.045, 24);
				tone(1280, 0.07, "sine", 0.035, 64);
				g.abilFlash = 0.56;
				g.shake = 0.14;
				g.flash = 0.24;
				g.flashCol = [0.78, 0.7, 1];
				addSparks(g, prevX, prevY, 12, 95, [0.78, 0.7, 1]);
				addSparks(g, g.bx, g.by, 22, 145, [0.78, 0.7, 1]);
				break;
			}
			case "inferno": {
				// Shadow Strike: blink ball forward + speed burst
				const prevX = g.bx, prevY = g.by;
				const blinkDist = 140;
				const heading = Math.atan2(g.bvy, g.bvx);
				const newX = clamp(g.bx + Math.cos(heading) * blinkDist, 30, GW - 30);
				const newY = clamp(g.by + Math.sin(heading) * blinkDist, 20, GH - 20);
				g.bx = newX;
				g.by = newY;
				// Speed burst (temporary  normalization lerp handles decay)
				const burst = 1.35;
				g.bvx *= burst;
				g.bvy *= burst;
				// Ghost visual briefly
				g.ghostBall = true;
				g.ghostT = 0.5;
				g.abCD = cd;
				SFX.abil();
				tone(600, 0.06, "sine", 0.04);
				tone(900, 0.08, "sine", 0.03, 20);
				g.abilFlash = 0.4;
				g.shake = 0.1;
				g.flash = 0.2;
				g.flashCol = [0.8, 0.53, 1];
				addSparks(g, prevX, prevY, 12, 90, [0.8, 0.53, 1]);
				addSparks(g, newX, newY, 16, 110, [0.8, 0.53, 1]);
				break;
			}
			case "frost":
				g.blizzardT = 2.3;
				g.freezeT = Math.max(g.freezeT, 0.25);
				g.abCD = cd;
				SFX.abil();
				tone(1200, 0.08, "sine", 0.04);
				tone(800, 0.12, "sine", 0.03, 30);
				tone(400, 0.18, "sine", 0.02, 80);
				g.abilFlash = 0.5;
				addSparks(g, GW / 2, GH / 2, 30, 240, [0.53, 0.8, 1]);
				g.shake = 0.14;
				g.flash = 0.25;
				g.flashCol = [0.53, 0.8, 1];
				break;
			case "storm": {
				// Fire a lightning bolt immediately from the paddle
				const bSpd = Math.max(g.ballSpd, BASE_SPD) * 1.6;
				const aimY = g.ey - g.py;
				const aimDist = Math.hypot(GW, aimY);
				g.bolts.push({
					x: g.px + PAD_W,
					y: g.py,
					vx: bSpd,
					vy: (aimY / aimDist) * bSpd * 0.3 + rng(-60, 60),
					life: 4,
					trail: [],
					zig: 0.12,
					target: "enemy",
				});
				if (g.bolts.length > MAX_BOLTS)
					g.bolts.splice(0, g.bolts.length - MAX_BOLTS);
				g.abCD = cd;
				SFX.abil();
				tone(100, 0.1, "sawtooth", 0.05);
				tone(200, 0.08, "square", 0.04, 40);
				g.abilFlash = 0.35;
				g.shake = 0.1;
				g.flash = 0.18;
				g.flashCol = [1, 0.93, 0.27];
				addSparks(g, g.px + PAD_W, g.py, 14, 120, [1, 0.93, 0.27]);
				break;
			}
			case "voidp": {
				// Warp field: ball curves hard toward enemy gaps for 3s
				g.warpFieldT = 3.0;
				g.abCD = cd;
				g.abilFlash = 0.45;
				SFX.abil();
				tone(80, 0.2, "sine", 0.06);
				tone(120, 0.15, "sine", 0.04, 60);
				addSparks(g, g.bx, g.by, 16, 100, [1, 0.27, 0.67]);
				g.shake = 0.08;
				g.flash = 0.15;
				g.flashCol = [1, 0.27, 0.67];
				break;
			}
		}
	};
	cast();
	if (g.multicast)
		setTimeout(() => {
			if (g && !g.done) {
				g.abCD = 0;
				cast();
			}
		}, 300);
}

function handleContinue() {
	if (!g || !g.done) return;
	// Block during tutorial completion overlay
	if (tut && !tut.active && tut.doneOverlayT > 0) return;
	const result = g.result,
		lives = g.lives;
	if (g.kleinEndActive && !g.kleinEndReady) return;
	// Tutorial: win triggers upgrade screen with tooltip, then ends tutorial
	if (tut && tut.active && result === "win") {
		savedState = saveGame(g);
		const clearedDiff = g.cfg.diff;
		g = null;
		wave = 2;
		const rewardTier = DIFF_REWARD[clearedDiff] || "common";
		curCards = getCardsForDiff(clearedDiff, 3, savedState?.ownedAbilityIds || []);
		curEUp = null; // No enemy upgrade in tutorial
		curDiff = clearedDiff;
		tut.cardTooltip = true;
		showUpgradeScreen(rewardTier, clearedDiff);
		return;
	}
	if (result === "win") {
		savedState = saveGame(g);
		const clearedDiff = g.cfg.diff;
		g = null;
		const nw = wave + 1;
		if (nw > MAX_WAVE) {
			SFX.win();
			showVictory();
			return;
		}
		wave = nw;
		const rewardTier = DIFF_REWARD[clearedDiff] || "common";
		curCards = getCardsForDiff(clearedDiff, 3, savedState?.ownedAbilityIds || []);
		curEUp = E_UPS[Math.floor(Math.random() * E_UPS.length)];
		curDiff = clearedDiff;
		showUpgradeScreen(rewardTier, clearedDiff);
	} else {
		// Tutorial: on loss, just restart the tutorial match
		if (tut && tut.active) {
			g = null;
			startTutorialGame();
			return;
		}
		g = null;
		if (lives <= 0) showGameOver();
		else {
			savedState = { ...savedState, lives };
			showOpponentSelect();
		}
	}
}

// --- CARD AURA PARTICLES ---
function _perimPos() {
	const side = Math.random();
	if (side < 0.25) return { x: Math.random()*100+"%", y: "100%" };
	if (side < 0.5)  return { x: Math.random()*100+"%", y: "0%" };
	if (side < 0.75) return { x: "0%", y: Math.random()*100+"%" };
	return { x: "100%", y: Math.random()*100+"%" };
}
function _mkSpark(cont, col, opts) {
	const s = document.createElement("div");
	s.className = "aura-spark" + (opts.cls ? " "+opts.cls : "");
	const p = opts.pos || _perimPos();
	s.style.setProperty("--spark-x", p.x);
	s.style.setProperty("--spark-y", p.y);
	s.style.setProperty("--spark-col", opts.col || col);
	s.style.setProperty("--sy", (opts.sy ?? (-20 - Math.random()*50)) + "px");
	s.style.setProperty("--sx", (opts.sx ?? (-20 + Math.random()*40)) + "px");
	s.style.setProperty("--spark-dur", (opts.dur ?? (0.6 + Math.random()*0.8)) + "s");
	s.style.setProperty("--spark-delay", (opts.delay ?? (Math.random()*0.6)) + "s");
	s.style.setProperty("--spark-size", (opts.size ?? (2 + Math.random()*3)) + "px");
	if (opts.orbit) {
		s.className = "aura-spark orbit";
		s.style.setProperty("--orbit-r", opts.orbit + "px");
		s.style.left = "50%"; s.style.top = "50%";
	}
	cont.appendChild(s);
	return s;
}
function _mkCrackle(cont, col, opts) {
	const l = document.createElement("div");
	l.className = "aura-crackle";
	l.style.setProperty("--spark-col", opts.col || col);
	l.style.setProperty("--crack-w", (opts.w ?? (12+Math.random()*22)) + "px");
	l.style.setProperty("--crack-dur", (opts.dur ?? (0.3+Math.random()*0.5)) + "s");
	l.style.setProperty("--crack-delay", (opts.delay ?? (Math.random()*0.8)) + "s");
	l.style.setProperty("--crack-x", (opts.x ?? (Math.random()*90)) + "%");
	l.style.setProperty("--crack-y", (opts.y ?? (Math.random()*90)) + "%");
	l.style.transform = "rotate(" + (opts.rot ?? Math.random()*360) + "deg)";
	cont.appendChild(l);
	return l;
}

function spawnCardAura(card, color, effectType) {
	clearCardAura(card);
	const cont = document.createElement("div");
	cont.className = "aura-particles";
	card.appendChild(cont);
	const fx = effectType || "generic";

	if (fx === "storm") {
		// --- STORM: lightning crackles + yellow sparks ---
		for (let i = 0; i < 5; i++) _mkCrackle(cont, color, { w: 25+Math.random()*35, dur: 0.15+Math.random()*0.25, delay: Math.random()*0.5 });
		for (let i = 0; i < 8; i++) _mkSpark(cont, color, { sy: -30-Math.random()*60, sx: -25+Math.random()*50, dur: 0.3+Math.random()*0.5, size: 2+Math.random()*4 });
		for (let i = 0; i < 3; i++) _mkSpark(cont, color, { orbit: 20+Math.random()*35, dur: 0.8+Math.random()*0.6, size: 3+Math.random()*3 });
		card._auraInterval = setInterval(() => {
			const old = cont.querySelectorAll(".aura-spark:not(.orbit)");
			if (old.length > 14) old[0]?.remove();
			_mkSpark(cont, color, { sy: -30-Math.random()*60, sx: -25+Math.random()*50, dur: 0.3+Math.random()*0.5, size: 2+Math.random()*4, delay: 0 });
			if (Math.random() < 0.2) _mkCrackle(cont, color, { w: 25+Math.random()*35, dur: 0.15+Math.random()*0.2, delay: 0 });
			const ns = cont.querySelector(".aura-spark:not(.orbit):last-child");
			if (ns) setTimeout(() => ns.remove(), 900);
		}, 140);

	} else if (fx === "frost") {
		// --- FROST: slow-falling ice crystals, pale blue mist ---
		for (let i = 0; i < 10; i++) _mkSpark(cont, color, { sy: 15+Math.random()*30, sx: -8+Math.random()*16, dur: 1.5+Math.random()*1.5, size: 1.5+Math.random()*3, col: i%3===0 ? "#ccefff" : color });
		for (let i = 0; i < 3; i++) _mkSpark(cont, color, { orbit: 25+Math.random()*40, dur: 3+Math.random()*2, size: 2+Math.random()*2, col: "#ddf4ff" });
		card._auraInterval = setInterval(() => {
			const old = cont.querySelectorAll(".aura-spark:not(.orbit)");
			if (old.length > 14) old[0]?.remove();
			const c2 = Math.random()<0.3 ? "#ccefff" : color;
			const s = _mkSpark(cont, color, { sy: 15+Math.random()*30, sx: -6+Math.random()*12, dur: 1.5+Math.random()*1.5, size: 1.5+Math.random()*3, delay: 0, col: c2 });
			setTimeout(() => s.remove(), 3200);
		}, 260);

	} else if (fx === "inferno") {
		// --- INFERNO: upward fire embers, orange + magenta ---
		const fireCols = ["#ff6622", "#ff44cc", "#ffaa22", color];
		for (let i = 0; i < 10; i++) { const fc = fireCols[i % fireCols.length]; _mkSpark(cont, color, { sy: -35-Math.random()*55, sx: -15+Math.random()*30, dur: 0.4+Math.random()*0.6, size: 2+Math.random()*4, col: fc }); }
		for (let i = 0; i < 2; i++) _mkCrackle(cont, color, { w: 10+Math.random()*15, dur: 0.4+Math.random()*0.4, col: "#ff6622" });
		card._auraInterval = setInterval(() => {
			const old = cont.querySelectorAll(".aura-spark:not(.orbit)");
			if (old.length > 16) old[0]?.remove();
			const fc = fireCols[Math.floor(Math.random()*fireCols.length)];
			const s = _mkSpark(cont, color, { sy: -35-Math.random()*55, sx: -15+Math.random()*30, dur: 0.4+Math.random()*0.6, size: 2+Math.random()*4, delay: 0, col: fc });
			setTimeout(() => s.remove(), 1000);
		}, 150);

	} else if (fx === "oracle") {
		// --- ORACLE: flowing cyan streams, smooth rings ---
		for (let i = 0; i < 6; i++) _mkSpark(cont, color, { sy: -15-Math.random()*30, sx: -10+Math.random()*20, dur: 1+Math.random()*1.2, size: 2+Math.random()*2.5, col: i%2===0 ? "#66eeff" : color });
		for (let i = 0; i < 4; i++) _mkSpark(cont, color, { orbit: 22+Math.random()*45, dur: 2+Math.random()*2, size: 2+Math.random()*2, col: "#88ffff" });
		card._auraInterval = setInterval(() => {
			const old = cont.querySelectorAll(".aura-spark:not(.orbit)");
			if (old.length > 10) old[0]?.remove();
			const c2 = Math.random()<0.4 ? "#66eeff" : color;
			const s = _mkSpark(cont, color, { sy: -15-Math.random()*30, sx: -10+Math.random()*20, dur: 1+Math.random()*1.2, size: 2+Math.random()*2.5, delay: 0, col: c2 });
			setTimeout(() => s.remove(), 2400);
		}, 240);

	} else if (fx === "paradox") {
		// --- PARADOX: swirling vortex, purple time-warp ---
		for (let i = 0; i < 5; i++) _mkSpark(cont, color, { orbit: 15+Math.random()*50, dur: 0.8+Math.random()*1, size: 2+Math.random()*3, col: i%2===0 ? "#dda8ff" : color });
		for (let i = 0; i < 7; i++) _mkSpark(cont, color, { sy: -20-Math.random()*40, sx: -20+Math.random()*40, dur: 0.5+Math.random()*0.7, size: 1.5+Math.random()*3, col: i%3===0 ? "#e0c0ff" : color });
		for (let i = 0; i < 2; i++) _mkCrackle(cont, color, { w: 15+Math.random()*20, dur: 0.5+Math.random()*0.5, col: "#dda8ff" });
		card._auraInterval = setInterval(() => {
			const old = cont.querySelectorAll(".aura-spark:not(.orbit)");
			if (old.length > 12) old[0]?.remove();
			const c2 = Math.random()<0.3 ? "#e0c0ff" : color;
			const s = _mkSpark(cont, color, { sy: -20-Math.random()*40, sx: -20+Math.random()*40, dur: 0.5+Math.random()*0.7, size: 1.5+Math.random()*3, delay: 0, col: c2 });
			setTimeout(() => s.remove(), 1200);
			if (Math.random() < 0.15) { const cr = _mkCrackle(cont, color, { w: 15+Math.random()*20, dur: 0.4+Math.random()*0.4, delay: 0, col: "#dda8ff" }); setTimeout(() => cr.remove(), 800); }
		}, 160);

	} else if (fx === "voidp") {
		// --- VOID: inward-pulling gravity particles, pink/magenta ---
		for (let i = 0; i < 8; i++) _mkSpark(cont, color, { sy: 10+Math.random()*20, sx: -5+Math.random()*10, dur: 0.8+Math.random()*1, size: 2+Math.random()*3, col: i%3===0 ? "#ff88cc" : color });
		for (let i = 0; i < 3; i++) _mkSpark(cont, color, { orbit: 30+Math.random()*40, dur: 1.5+Math.random()*1, size: 2.5+Math.random()*2, col: "#ff66bb" });
		for (let i = 0; i < 1; i++) _mkCrackle(cont, color, { w: 18+Math.random()*18, dur: 0.6+Math.random()*0.4, col: "#ff88cc" });
		card._auraInterval = setInterval(() => {
			const old = cont.querySelectorAll(".aura-spark:not(.orbit)");
			if (old.length > 12) old[0]?.remove();
			const c2 = Math.random()<0.3 ? "#ff88cc" : color;
			const s = _mkSpark(cont, color, { sy: 10+Math.random()*20, sx: -5+Math.random()*10, dur: 0.8+Math.random()*1, size: 2+Math.random()*3, delay: 0, col: c2 });
			setTimeout(() => s.remove(), 1800);
		}, 200);

	} else if (fx === "classic") {
		// --- CLASSIC: clean minimal white sparks ---
		for (let i = 0; i < 5; i++) _mkSpark(cont, color, { sy: -15-Math.random()*25, sx: -10+Math.random()*20, dur: 0.8+Math.random()*1, size: 1.5+Math.random()*2 });
		for (let i = 0; i < 2; i++) _mkSpark(cont, color, { orbit: 20+Math.random()*25, dur: 2+Math.random()*1.5, size: 1.5+Math.random()*1.5 });
		card._auraInterval = setInterval(() => {
			const old = cont.querySelectorAll(".aura-spark:not(.orbit)");
			if (old.length > 8) old[0]?.remove();
			const s = _mkSpark(cont, color, { sy: -15-Math.random()*25, sx: -10+Math.random()*20, dur: 0.8+Math.random()*1, size: 1.5+Math.random()*2, delay: 0 });
			setTimeout(() => s.remove(), 1800);
		}, 300);

	} else {
		// --- GENERIC: balanced default for upgrade cards ---
		for (let i = 0; i < 6; i++) _mkSpark(cont, color, {});
		for (let i = 0; i < 2; i++) _mkSpark(cont, color, { orbit: 18+Math.random()*30, dur: 1.5+Math.random()*1.5, size: 2+Math.random()*2 });
		for (let i = 0; i < 2; i++) _mkCrackle(cont, color, {});
		card._auraInterval = setInterval(() => {
			const old = cont.querySelectorAll(".aura-spark:not(.orbit)");
			if (old.length > 10) old[0]?.remove();
			const s = _mkSpark(cont, color, { delay: 0 });
			setTimeout(() => s.remove(), 1400);
		}, 200);
	}
}
function clearCardAura(card) {
	if (card._auraInterval) { clearInterval(card._auraInterval); card._auraInterval = null; }
	const p = card.querySelector(".aura-particles");
	if (p) p.remove();
}

// --- CARD PHYSICS: Float, Wiggle, Magnetic Repulsion ---
let _cardPhysRAF = null;
let _cardPhysCards = [];
let _cardPhysStart = 0;

function initCardPhysics(container) {
	stopCardPhysics();
	const cards = Array.from(container.children);
	if (!cards.length) return;
	_cardPhysCards = cards.map((el, i) => ({
		el,
		floatPhase: Math.random() * Math.PI * 2,
		floatSpeed: 0.7 + Math.random() * 0.5,
		floatAmp: 4 + Math.random() * 4,
		wigglePhase: Math.random() * Math.PI * 2,
		wiggleSpeed: 1.2 + Math.random() * 0.8,
		wiggleAmp: 1.2 + Math.random() * 1.0,
		pushX: 0,
		pushY: 0,
		baseIdx: i,
		hovered: false,
	}));
	_cardPhysStart = performance.now();
	cards.forEach((el) => {
		el.addEventListener("mouseenter", _cardPhysHoverIn);
		el.addEventListener("mouseleave", _cardPhysHoverOut);
	});
	// Wait for entrance animation to finish, then remove card-enter so
	// animation-fill-mode stops overriding JS transforms
	setTimeout(() => {
		cards.forEach((el) => el.classList.remove("card-enter"));
	}, 700);
	_cardPhysRAF = requestAnimationFrame(_cardPhysTick);
}

function _cardPhysHoverIn(e) {
	const entry = _cardPhysCards.find((c) => c.el === e.currentTarget);
	if (entry) {
		entry.hovered = true;
		// Clear inline transform so CSS :hover rule takes effect
		entry.el.style.transform = "";
	}
}
function _cardPhysHoverOut(e) {
	const entry = _cardPhysCards.find((c) => c.el === e.currentTarget);
	if (entry) {
		entry.hovered = false;
		// Clear push/wiggle CSS vars
		entry.el.style.removeProperty("--push-x");
		entry.el.style.removeProperty("--push-y");
		entry.el.style.removeProperty("--wiggle-rot");
	}
}

function _cardPhysTick(now) {
	if (!_cardPhysCards.length) return;
	const t = (now - _cardPhysStart) / 1000;
	const anyHovered = _cardPhysCards.some((c) => c.hovered);

	// Compute each card's center for repulsion
	const rects = _cardPhysCards.map((c) => {
		const r = c.el.getBoundingClientRect();
		return { cx: r.left + r.width / 2 + c.pushX, cy: r.top + r.height / 2 + c.pushY, w: r.width, h: r.height };
	});

	for (let i = 0; i < _cardPhysCards.length; i++) {
		const c = _cardPhysCards[i];

		// Wiggle rotation only on hovered (big/selected) cards
		let rot = 0;
		if (c.hovered) {
			rot = Math.sin(t * c.wiggleSpeed + c.wigglePhase) * c.wiggleAmp;
		}

		// Magnetic repulsion from neighbors
		let fx = 0, fy = 0;
		for (let j = 0; j < _cardPhysCards.length; j++) {
			if (i === j) continue;
			const other = _cardPhysCards[j];
			if (other.hovered) {
				// Hovered card pushes neighbors harder
				const dx = rects[i].cx - rects[j].cx;
				const dy = rects[i].cy - rects[j].cy;
				const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
				const threshold = (rects[i].w + rects[j].w) * 0.6;
				if (dist < threshold) {
					const strength = 18 * (1 - dist / threshold);
					fx += (dx / dist) * strength;
					fy += (dy / dist) * strength * 0.3;
				}
			} else {
				// Gentle ambient repulsion when close
				const dx = rects[i].cx - rects[j].cx;
				const dy = rects[i].cy - rects[j].cy;
				const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
				const threshold = (rects[i].w + rects[j].w) * 0.52;
				if (dist < threshold) {
					const strength = 4 * (1 - dist / threshold);
					fx += (dx / dist) * strength;
					fy += (dy / dist) * strength * 0.2;
				}
			}
		}

		// Smooth lerp pushX/pushY toward force target
		const lerpRate = 0.08;
		c.pushX += (fx - c.pushX) * lerpRate;
		c.pushY += (fy - c.pushY) * lerpRate;

		if (!c.hovered) {
			// Non-hovered: only apply magnetic push, no animation
			if (Math.abs(c.pushX) > 0.1 || Math.abs(c.pushY) > 0.1) {
				c.el.style.transform = `translateY(${c.pushY}px) translateX(${c.pushX}px)`;
			} else {
				c.el.style.transform = "";
			}
		} else {
			// Add push offset + wiggle rotation to hovered (big) cards
			c.el.style.setProperty("--push-x", c.pushX + "px");
			c.el.style.setProperty("--push-y", c.pushY + "px");
			c.el.style.setProperty("--wiggle-rot", rot + "deg");
		}
	}

	_cardPhysRAF = requestAnimationFrame(_cardPhysTick);
}

function stopCardPhysics() {
	if (_cardPhysRAF) {
		cancelAnimationFrame(_cardPhysRAF);
		_cardPhysRAF = null;
	}
	_cardPhysCards.forEach((c) => {
		c.el.removeEventListener("mouseenter", _cardPhysHoverIn);
		c.el.removeEventListener("mouseleave", _cardPhysHoverOut);
		c.el.style.transform = "";
		c.el.style.removeProperty("--wiggle-rot");
	});
	_cardPhysCards = [];
}

// --- BUILD UI ---
function updateSkipTutBtn() {
	const btn = $("skip-tut-btn");
	if (btn) btn.style.display = _tutorialDone ? "none" : "block";
}
function buildPadGrid() {
	const grid = $("pad-grid");
	grid.innerHTML = "";
	PADDLES.forEach((p, idx) => {
		const c = PCOL[p.id];
		const d = document.createElement("div");
		d.className = "pad-card card-enter";
		d.style.setProperty("--pc", c.p);
		d.style.setProperty("--i", idx);
		d.innerHTML = `<div class="cdot" style="background:${c.p}"></div><div class="pn">${p.name}</div><div class="pd">${p.desc}</div><div class="ps"><div class="pa">[${p.akey}] ${p.abil}</div><div class="pi">${p.ainfo}</div></div><div class="pt">PLAY</div>`;
		d.onmouseenter = () => spawnCardAura(d, c.p, p.id);
		d.onmouseleave = () => clearCardAura(d);
		d.onclick = () => {
			savedState = null;
			wave = 1;
			enemyUps = [];
			padId = p.id;
			SFX.sel();
			if (!_tutorialDone) {
				startTutorial(p.id);
			} else {
				showOpponentSelect();
			}
		};
		grid.appendChild(d);
	});
}

function showUpgradeScreen(rewardTier, clearedDiff) {
	$("rank-display").innerHTML = "";
	// Explanation text
	$("upgrade-explain").textContent = "After every wave you defeat an enemy, pick a card to power up your paddle. Harder enemies drop rarer rewards.";
	// Difficulty badge
	const dc = DIFF_COLORS[clearedDiff] || "#fff";
	const dg = DIFF_GLOW[clearedDiff] || "255,255,255";
	const tc = TIER_COLORS[rewardTier] || "#fff";
	const tg = TIER_GLOW[rewardTier] || "255,255,255";
	$("diff-display").innerHTML =
		`<div class="diff-badge" style="background:rgba(${dg},0.1);border:1px solid ${dc};color:${dc}">${clearedDiff} CLEARED</div>` +
		`<div style="font-size:8px;letter-spacing:4px;margin-top:4px;color:${tc};text-shadow:0 0 8px rgba(${tg},0.3)">${TIER_ICON[rewardTier]} ${TIER_NAMES[rewardTier]} REWARDS ${TIER_ICON[rewardTier]}</div>`;

	if (rewardTier === "legendary" || rewardTier === "mythical") SFX.legendary();
	if (rewardTier === "secret") {
		SFX.legendary();
		setTimeout(() => SFX.legendary(), 200);
	}

	const wb = $("e-warn-box");
	if (curEUp)
		wb.innerHTML = `<div class="e-warn"><div style="color:#cc8888;font-size:7.5px;letter-spacing:5px;margin-bottom:5px;">ENEMY ALSO UPGRADES</div><div style="color:#ff6666;font-size:14px;font-weight:700;letter-spacing:3px;">${curEUp.icon} ${curEUp.name}</div><div style="color:#ddaa99;font-size:9px;margin-top:4px;">${curEUp.desc}</div></div>`;
	else wb.innerHTML = "";

	const nd =
		DIFF_RANKS[Math.min(Math.floor(wave / 1.5), DIFF_RANKS.length - 1)];
	const ndc = DIFF_COLORS[nd] || "#fff";
	let info = `WAVE ${wave - 1} CLEARED \u00B7 SELECT YOUR REWARD`;
	if (enemyUps.length > 0)
		info += ` \u00B7 ${enemyUps.length} ENEMY BUFF${enemyUps.length > 1 ? "S" : ""}`;
	$("next-wave-info").innerHTML = info;

	const grid = $("card-grid");
	grid.innerHTML = "";
	curCards.forEach((c, idx) => {
		const tc2 = TIER_COLORS[c.tier];
		const tg2 = TIER_GLOW[c.tier];
		const isAbility = c.type === "ability";
		const d = document.createElement("div");
		d.className = "up-card card-enter";
		d.style.setProperty("--rc", tc2);
		d.style.setProperty("--i", idx);
		d.innerHTML = `${isAbility ? `<div class="ab-tag" style="background:rgba(${tg2},0.15);color:${tc2};border:1px solid rgba(${tg2},0.2)">ABILITY</div>` : `<div class="ab-tag" style="background:rgba(255,255,255,0.04);color:#aa9;border:1px solid rgba(255,255,255,0.05)">STAT</div>`}<div class="ri" style="color:${tc2}">${TIER_ICON[c.tier]}</div><div class="cn">${c.name}</div><div class="cd">${c.desc}</div><div class="cr" style="color:${tc2}">${TIER_NAMES[c.tier]}</div>`;
		d.onmouseenter = () => {
			d.style.borderColor = tc2;
			d.style.boxShadow = `0 0 32px rgba(${tg2},.16),0 16px 44px rgba(0,0,0,.5),inset 0 0 24px rgba(${tg2},.05)`;
			spawnCardAura(d, tc2);
		};
		d.onmouseleave = () => {
			d.style.borderColor = "";
			d.style.boxShadow = "";
			clearCardAura(d);
		};
		d.onclick = () => {
			const t = { ...(savedState ?? {}) };
			t.ownedAbilityIds = Array.from(
				new Set([...(t.ownedAbilityIds || []), c.id]),
			);
			c.fn(t);
			savedState = t;
			SFX.sel();
			// Tutorial: picking a card finishes the tutorial
			if (tut && tut.active) {
				finishTutorial();
				return;
			}
			if (curEUp) enemyUps.push(curEUp);
			showOpponentSelect();
		};
		grid.appendChild(d);
	});
	showScreen("cards-screen");
	initCardPhysics(grid);
	// Tutorial: show tooltip on cards screen
	if (tut && tut.active && tut.cardTooltip) {
		let tip = $("tut-card-tip");
		if (!tip) {
			tip = document.createElement("div");
			tip.id = "tut-card-tip";
			tip.style.cssText = "position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(10,10,16,0.94);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:16px 32px;text-align:center;pointer-events:none;animation:tutTipIn 0.5s ease-out;font-family:'Share Tech Mono',monospace;";
			tip.innerHTML = '<div style="color:#fff;font-size:18px;font-weight:bold;letter-spacing:3px;margin-bottom:6px;">UPGRADE CARDS</div><div style="color:#99a;font-size:14px;">After each wave, choose a card to power up your paddle.</div><div style="color:#889;font-size:12px;margin-top:8px;">PICK ANY CARD TO CONTINUE</div>';
			document.body.appendChild(tip);
			// Add animation keyframes if not present
			if (!document.getElementById("tut-tip-style")) {
				const st = document.createElement("style");
				st.id = "tut-tip-style";
				st.textContent = "@keyframes tutTipIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}";
				document.head.appendChild(st);
			}
		}
	} else {
		const tip = document.getElementById("tut-card-tip");
		if (tip) tip.remove();
	}
}

function showGameOver() {
	const pName = PADDLES.find((p) => p.id === padId)?.name || "UNKNOWN";
	const c = PCOL[padId];
	$("go-info").textContent = `WAVE ${wave} \u00B7 ${pName}`;
	$("go-buffs").textContent =
		enemyUps.length > 0
			? `ENEMY HAD ${enemyUps.length} UPGRADE${enemyUps.length > 1 ? "S" : ""}`
			: " ";
	const stats = $("go-stats");
	const wv = wave - 1;
	stats.innerHTML = [
		{ l: "WAVES CLEARED", v: wv },
		{ l: "PADDLE", v: pName },
		{ l: "ENEMY BUFFS", v: enemyUps.length },
	].map((s, i) =>
		`<div class="go-stat" style="--i:${i}"><div class="go-stat-val" style="color:${c.p}">${s.v}</div><div class="go-stat-label">${s.l}</div></div>`
	).join("");
	showScreen("go-screen");
}

// --- OPPONENT SELECTION ---
function generateOpponents(wv) {
	const baseRankIdx = Math.min(Math.floor(wv / 1.5), DIFF_RANKS.length - 1);
	const opponents = [];
	const foolEligible = wv >= 10 && Math.random() < 0.08;

	// EASY: one rank below base, never boss
	const easyRank = Math.max(0, baseRankIdx - 1);
	const easyDiff = DIFF_RANKS[easyRank];
	const easyPool = getEnemiesForDiff(easyDiff);
	const easyEnemy =
		easyPool[Math.floor(Math.random() * easyPool.length)] || ENEMIES[0];
	const eAiSpd = 145 + wv * 14;
	const eReact = clamp(0.06 + wv * 0.025, 0, 0.85);
	const eEH = BASE_PAD_H;
	const easyCfg = {
		wv,
		boss: false,
		diff: easyDiff,
		aiSpd: eAiSpd,
		aiReact: eReact,
		eH: eEH,
		enemy: easyEnemy,
		trickAng: false,
		ghost: false,
		chaos: false,
		jitter: false,
	};
	easyEnemy.mod(easyCfg);
	opponents.push({ cfg: easyCfg, label: "EASY", labelCol: "#4a7" });

	if (foolEligible) {
		const foolEnemy = ENEMIES.find((e) => e.id === "thefool");
		const foolCfg = {
			wv,
			boss: false,
			diff: "F-",
			aiSpd: 210,
			aiReact: 0.16,
			eH: BASE_PAD_H * 0.9,
			enemy: foolEnemy,
			trickAng: false,
			ghost: false,
			chaos: false,
			jitter: false,
			foolLootMystery: true,
		};
		foolEnemy.mod(foolCfg);
		opponents[0] = { cfg: foolCfg, label: "EASY", labelCol: "#7a7" };
	}

	// NORMAL: base rank, boss on schedule
	const normBoss = wv > 2 && wv % 3 === 0;
	const normDiff = normBoss
		? DIFF_RANKS[Math.min(baseRankIdx + 1, DIFF_RANKS.length - 1)]
		: DIFF_RANKS[baseRankIdx];
	const normPool = getEnemiesForDiff(normDiff);
	const normEnemy =
		normPool[Math.floor(Math.random() * normPool.length)] ||
		ENEMIES[Math.min(baseRankIdx, ENEMIES.length - 1)];
	const nAiSpd = 160 + wv * 18 + (normBoss ? 30 : 0);
	const nReact = clamp(0.08 + wv * 0.035 + (normBoss ? 0.06 : 0), 0, 0.9);
	const nEH = BASE_PAD_H;
	const normCfg = {
		wv,
		boss: normBoss,
		diff: normDiff,
		aiSpd: nAiSpd,
		aiReact: nReact,
		eH: nEH,
		enemy: normEnemy,
		trickAng: false,
		ghost: false,
		chaos: false,
		jitter: false,
	};
	normEnemy.mod(normCfg);
	opponents.push({ cfg: normCfg, label: "NORMAL", labelCol: "#77a" });

	// HARD: two ranks above, frequent boss
	const hardRank = Math.min(baseRankIdx + 2, DIFF_RANKS.length - 1);
	const hardBoss = wv > 1;
	const hardDiff = DIFF_RANKS[hardRank];
	const hardPool = getEnemiesForDiff(hardDiff);
	const hardEnemy =
		hardPool[Math.floor(Math.random() * hardPool.length)] ||
		ENEMIES[Math.min(hardRank * 2, ENEMIES.length - 1)];
	const hAiSpd = 180 + wv * 22 + (hardBoss ? 40 : 0);
	const hReact = clamp(0.1 + wv * 0.04 + (hardBoss ? 0.08 : 0), 0, 0.95);
	const hEH = BASE_PAD_H;
	const hardCfg = {
		wv,
		boss: hardBoss,
		diff: hardDiff,
		aiSpd: hAiSpd,
		aiReact: hReact,
		eH: hEH,
		enemy: hardEnemy,
		trickAng: false,
		ghost: false,
		chaos: false,
		jitter: false,
	};
	hardEnemy.mod(hardCfg);
	opponents.push({ cfg: hardCfg, label: "HARD", labelCol: "#d55" });

	return opponents;
}

function showOpponentSelect() {
	$("opp-wave-num").textContent = wave;
	const opps = generateOpponents(wave);

	const wb = $("opp-enemy-warn");
	if (enemyUps.length > 0)
		wb.innerHTML = `<div style="color:#dd8888;font-size:8px;letter-spacing:3px;">${enemyUps.length} ENEMY BUFF${enemyUps.length > 1 ? "S" : ""} ACTIVE</div>`;
	else wb.innerHTML = "";

	const grid = $("opp-grid");
	grid.innerHTML = "";
	// Clean up any lingering tutorial elements
	const tutTip = document.getElementById("tut-opp-tip");
	if (tutTip) tutTip.remove();
	const tutSkip = document.getElementById("tut-skip-btn");
	if (tutSkip) tutSkip.remove();

	opps.forEach(({ cfg, label, labelCol }, oppIdx) => {
		const dc = DIFF_COLORS[cfg.diff] || "#fff";
		const dg = DIFF_GLOW[cfg.diff] || "255,255,255";
		const availTiers =
			cfg.enemy.id === "thefool"
				? ["common", "mystery"]
				: DIFF_TIERS[cfg.diff] || ["common"];

		const d = document.createElement("div");
		d.className = "opp-card card-enter";
		d.style.setProperty("--dc", dc);
		d.style.setProperty("--i", oppIdx);

		let html = `<div style="font-size:8px;letter-spacing:5px;color:${labelCol};margin-bottom:8px;font-weight:700;">${label}</div>`;
		html += `<div class="opp-diff" style="color:${dc}">${cfg.diff}</div>`;
		if (cfg.boss) html += `<div class="opp-boss">\u2605 BOSS \u2605</div>`;
		html += `<div class="opp-name">${cfg.enemy.name}</div>`;
		html += `<div class="opp-tag">${cfg.enemy.tag || "\u00A0"}</div>`;
		if (cfg.enemy.id === "thefool")
			html += `<div style="font-size:7px;color:#888;letter-spacing:2px;margin:4px 0 6px;">looks harmless... probably free loot</div>`;

		// Enemy ability
		const eab = getEnemyAbil(cfg.enemy.id);
		if (eab.id !== "none") {
			html += `<div style="margin:4px 0 6px;padding:4px 8px;border:1px solid rgba(255,80,80,0.15);border-radius:2px;background:rgba(255,40,40,0.04);">`;
			html += `<div style="font-size:6.5px;letter-spacing:3px;color:#cc8888;margin-bottom:2px;">ABILITY</div>`;
			html += `<div style="font-size:10px;color:#ffaaaa;letter-spacing:2px;">${eab.icon} ${eab.name}</div>`;
			html += `<div style="font-size:7px;color:#ccaa99;margin-top:2px;">${eab.desc}</div>`;
			html += `</div>`;
		}

		// Stats
		const spdR =
			cfg.enemy.id === "thefool" ? 2 : Math.min(Math.round(cfg.aiSpd / 80), 9);
		const iqR =
			cfg.enemy.id === "thefool"
				? 1
				: Math.min(Math.round(cfg.aiReact * 10), 9);
		const szR = Math.min(Math.round(cfg.eH / 20), 9);
		html += `<div class="opp-stats"><div class="opp-stat">SPD ${spdR}</div><div class="opp-stat">IQ ${iqR}</div><div class="opp-stat">SZ ${szR}</div></div>`;

		// Reward rarity tiers display
		html += `<div class="opp-reward-box">`;
		html += `<div class="opp-reward-label">POSSIBLE RARITIES</div>`;
		html += `<div class="opp-tiers">`;
		availTiers.forEach((tier) => {
			if (tier === "mystery") {
				html += `<div class="opp-tier-pill" style="color:#999;border-color:#333;background:rgba(150,150,150,0.05)">? ????</div>`;
				return;
			}
			const tc = TIER_COLORS[tier];
			const tg = TIER_GLOW[tier];
			const icon = TIER_ICON[tier];
			html += `<div class="opp-tier-pill" style="color:${tc};border-color:color-mix(in srgb,${tc} 25%,#111);background:rgba(${tg},0.06)">${icon} ${TIER_NAMES[tier]}</div>`;
		});
		html += `</div></div>`;

		html += `<div class="opp-fight">FIGHT</div>`;

		d.innerHTML = html;
		d.onmouseenter = () => {
			d.style.borderColor = dc;
			d.style.boxShadow = `0 0 30px rgba(${dg},.16),0 14px 40px rgba(0,0,0,.5),inset 0 0 20px rgba(${dg},.04)`;
		};
		d.onmouseleave = () => {
			d.style.borderColor = "";
			d.style.boxShadow = "";
		};
		d.onclick = () => {
			chosenOppCfg = cfg;
			SFX.sel();
			startWave(padId, wave);
		};
		grid.appendChild(d);
	});

	showScreen("opp-screen");
	initCardPhysics(grid);
}
function showVictory() {
	const c = PCOL[padId];
	const pName = PADDLES.find((p) => p.id === padId)?.name || "UNKNOWN";
	$("vic-title").style.textShadow = `0 0 30px ${c.g}0.3), 0 0 60px ${c.g}0.1)`;
	$("vic-title").style.color = c.p;
	$("vic-sub").textContent = "12 WAVES CLEARED";
	$("vic-info").textContent = `${pName} \u00B7 COMPLETE`;
	// Rotating rays
	const rays = $("vic-rays");
	rays.innerHTML = "";
	for (let i = 0; i < 12; i++) {
		const r = document.createElement("div");
		r.className = "vic-ray";
		r.style.transform = `rotate(${i * 30}deg)`;
		r.style.background = `linear-gradient(to top, transparent, ${c.g}0.12))`;
		rays.appendChild(r);
	}
	// Stats
	const stats = $("vic-stats");
	stats.innerHTML = [
		{ l: "WAVES", v: 12 },
		{ l: "PADDLE", v: pName },
		{ l: "ENEMY BUFFS SURVIVED", v: enemyUps.length },
	].map((s, i) =>
		`<div class="vic-stat" style="--i:${i}"><div class="vic-stat-val" style="color:${c.p}">${s.v}</div><div class="vic-stat-label">${s.l}</div></div>`
	).join("");
	showScreen("vic-screen");
}

// --- INPUT ---
window.addEventListener("keydown", (e) => {
	const k = e.key.toLowerCase();
	// Tutorial input handling
	if (tut && tut.active) {
		if (k === "escape") {
			if (tut.phase === "intro") {
				skipTutorial();
				return;
			}
			// During tutorial gameplay, show pause menu with skip option (never unpause via ESC)
			if (!paused) {
				paused = true;
				$("pause-overlay").classList.remove("hidden");
				const skipBtn = $("pause-skip-tut");
				if (skipBtn) skipBtn.style.display = "inline-block";
			}
			return;
		}
		if (tut.phase === "intro" || tut.phase === "overlay") {
			e.preventDefault();
			dismissTutOverlay(k);
			return;
		}
		keysDown[k] = true;
		if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
			e.preventDefault();
		if (k === "q") {
			doAbility();
			if (tut) tut.abilityUsed = true;
		}
		if (e.key === "Enter" && g && g.done) {
			handleContinue();
		}
		return;
	}
	if (k === "escape") {
		if (curScreen === null && g && !g.done) {
			paused = !paused;
			$("pause-overlay").classList.toggle("hidden", !paused);
		} else if (curScreen === "opp-screen" || curScreen === "cards-screen") {
			paused = true;
			$("pause-overlay").classList.remove("hidden");
		} else if (curScreen === "dev-screen") {
			showScreen("menu-screen");
			buildPadGrid();
		}
	}
	keysDown[k] = true;
	if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k))
		e.preventDefault();
	if (k === "q") doAbility();
	if (e.key === "Enter") {
		if (!advanceFoolDialogue(g)) handleContinue();
	}
});
window.addEventListener("keyup", (e) => {
	keysDown[e.key.toLowerCase()] = false;
});
const bindClick = (id, fn) => {
	const el = $(id);
	if (el) el.onclick = fn;
};
const cvEl = $("cv");
if (cvEl)
	cvEl.addEventListener("click", () => {
	if (tut && tut.active && (tut.phase === "intro" || tut.phase === "overlay")) {
		dismissTutOverlay(null);
		return;
	}
	if (!advanceFoolDialogue(g)) handleContinue();
});
bindClick("go-retry", () => {
	savedState = null;
	wave = 1;
	enemyUps = [];
	chosenOppCfg = null;
	SFX.sel();
	showOpponentSelect();
});
bindClick("go-menu", () => {
	savedState = null;
	wave = 1;
	enemyUps = [];
	chosenOppCfg = null;
	showScreen("menu-screen");
});
bindClick("vic-again", () => {
	savedState = null;
	wave = 1;
	enemyUps = [];
	chosenOppCfg = null;
	showScreen("menu-screen");
});
bindClick("pause-resume", () => {
	paused = false;
	$("pause-overlay").classList.add("hidden");
	const skipBtn = $("pause-skip-tut");
	if (skipBtn) skipBtn.style.display = "none";
});
bindClick("pause-menu", () => {
	paused = false;
	$("pause-overlay").classList.add("hidden");
	g = null;
	savedState = null;
	wave = 1;
	enemyUps = [];
	chosenOppCfg = null;
	if (tut) { tut = null; }
	showScreen("menu-screen");
});
bindClick("pause-skip-tut", () => {
	paused = false;
	$("pause-overlay").classList.add("hidden");
	const skipBtn = $("pause-skip-tut");
	if (skipBtn) skipBtn.style.display = "none";
	skipTutorial();
});

// --- DEV MODE ---
let devPad = "classic",
	devEnemy = "basic",
	devBoss = false,
	devWave = 6;
const devAbilityIds = new Set();
let devPadScrollTop = 0;
let devEnemyScrollTop = 0;
let devAbilityScrollTop = 0;
let devScreenScrollTop = 0;

function getDevAbilityCards() {
	return ALL_CARDS.filter((c) => c.type === "ability");
}

function buildDevAbilityState() {
	const pad = PADDLES.find((p) => p.id === devPad) || {
		id: "dev_perfect",
		hMul: 1.2,
	};
	const state = {
		bs: BASE_SPD,
		ph: BASE_PAD_H * pad.hMul,
		pSpd: 480,
		cdMul: 1,
		cdRally: false,
		midlineSlow: false,
		lives: 3,
		shields: 0,
		aiMod: 1,
		horizMul: 1,
		edge: false,
		rico: false,
		dblScore: false,
		vampire: false,
		oracleSight: false,
		homing: false,
		timewarp: false,
		multicast: false,
		transcend: false,
		doppel: false,
		singularity: false,
		aiCap: false,
		triScore: false,
		echoHit: false,
		stormCaller: false,
		phantomStrike: false,
		mirrorMatch: false,
		masterSkill: false,
		siphon: false,
		perfectPilot: false,
		tailwind: false,
		reflexSlow: false,
		redirect: false,
		velocitySurge: false,
		concussion: false,
		lockdown: false,
		phantomThunder: false,
		phantomSlow: false,
		phantomFire: false,
		stormStrike: false,
		angelSteps: 0,
		paradoxEngine: false,
		nullField: false,
		delusio: false,
		speedBurst: false,
		rallyDecay: false,
		spinDrag: false,
		straightShot: false,
		mirage: false,
	};
	if (devPad === "dev_perfect") {
		state.perfectPilot = true;
		state.pSpd = 2600;
		state.ph = BASE_PAD_H * 1.25;
		state.horizMul = 2.4;
		state.devUnlose = true;
	}
	const cards = getDevAbilityCards().filter((c) => devAbilityIds.has(c.id));
	const master = cards.find((c) => c.id === "sec_master");
	const ordered = master
		? [...cards.filter((c) => c.id !== "sec_master"), master]
		: cards;
	for (const c of ordered) c.fn(state);
	return state;
}

window.showDevScreen = function showDevScreen() {
	const devScreenEl = $("dev-screen");
	if (curScreen === "dev-screen" && devScreenEl)
		devScreenScrollTop = devScreenEl.scrollTop;
	const oldPadList = $("dev-pad-list");
	if (oldPadList) devPadScrollTop = oldPadList.scrollTop;
	const oldEnemyList = $("dev-enemy-list");
	if (oldEnemyList) devEnemyScrollTop = oldEnemyList.scrollTop;
	// Build paddle selector
	const pg = $("dev-pad-grid");
	pg.innerHTML =
		'<div id="dev-pad-list" style="display:flex;flex-direction:column;gap:8px;padding-right:4px;"></div>';
	const padList = pg.querySelector("#dev-pad-list");
	const devPaddles = [
		...PADDLES,
		{
			id: "dev_perfect",
			name: "PLAYTEST AI",
			hMul: 1.25,
			abil: "PERFECT TRACK",
			ainfo: "Dev-only auto-catch paddle",
		},
	];
	devPaddles.forEach((p) => {
		const c = PCOL[p.id];
		const pc = c || { p: "#d8d2ff" };
		const d = document.createElement("div");
		d.style.cssText = `padding:12px 14px;cursor:pointer;border:1px solid ${devPad === p.id ? pc.p : "#3a3a46"};border-radius:4px;background:${devPad === p.id ? "rgba(255,255,255,0.06)" : "#050508"};display:flex;align-items:center;gap:12px;transition:all 0.15s;box-shadow:${devPad === p.id ? `0 0 0 1px ${pc.p}66` : "0 0 0 1px rgba(255,255,255,0.03) inset"};`;
		d.innerHTML = `<div style="width:8px;height:8px;border-radius:50%;background:${pc.p};box-shadow:0 0 10px ${pc.p};flex-shrink:0;"></div><div><div style="font-size:12px;font-weight:700;letter-spacing:3px;color:${devPad === p.id ? pc.p : "#ddd"}">${p.name}</div><div style="font-size:9px;color:#cca;letter-spacing:2px;margin-top:3px;">[Q] ${p.abil}</div><div style="font-size:8px;color:#aaa;letter-spacing:1.4px;margin-top:2px;">${p.ainfo}</div></div>`;
		d.onclick = () => {
			devPad = p.id;
			SFX.sel();
			showDevScreen();
		};
		d.onmouseenter = () => {
			if (devPad !== p.id) {
				d.style.borderColor = "#5a5a70";
				d.style.boxShadow = "0 0 0 1px rgba(150,150,190,0.22)";
			}
		};
		d.onmouseleave = () => {
			if (devPad !== p.id) {
				d.style.borderColor = "#3a3a46";
				d.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.03) inset";
			}
		};
		padList.appendChild(d);
	});
	// Build ability selector (second section)
	const eg = $("dev-enemy-grid");
	eg.innerHTML = "";
	const abWrap = document.createElement("div");
	abWrap.style.cssText =
		"padding:10px 12px;border:1px solid #40404f;border-radius:4px;background:#050508;box-shadow:0 0 0 1px rgba(255,255,255,0.06) inset;";
	const cards = getDevAbilityCards();
	const count = devAbilityIds.size;
	abWrap.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div style="font-size:11px;font-weight:700;letter-spacing:3px;color:#ddd;">ABILITIES (${count})</div><div id="dev-abil-clear" style="font-size:9px;letter-spacing:2px;color:#f88;cursor:pointer;">CLEAR</div></div><div id="dev-abil-list" style="display:flex;flex-direction:column;gap:6px;padding-right:4px;"></div>`;
	eg.appendChild(abWrap);

	const abList = abWrap.querySelector("#dev-abil-list");
	const cardsSorted = [...cards].sort((a, b) => {
		const ai = TIER_ORDER.indexOf(a.tier),
			bi = TIER_ORDER.indexOf(b.tier);
		if (ai !== bi) return ai - bi;
		return a.name.localeCompare(b.name);
	});
	let lastTier = "";
	cardsSorted.forEach((c) => {
		if (c.tier !== lastTier) {
			lastTier = c.tier;
			const tc2 = TIER_COLORS[c.tier] || "#888";
			const th = document.createElement("div");
			th.style.cssText = `margin-top:8px;padding:8px 8px 3px;border-top:1px solid rgba(120,120,140,0.3);font-size:11px;font-weight:900;letter-spacing:4px;text-align:left;color:${tc2};text-shadow:0 0 10px rgba(${TIER_GLOW[c.tier] || "140,140,140"},0.45);`;
			th.textContent =
				(TIER_ICON[c.tier] || "�") +
				" " +
				(TIER_NAMES[c.tier] || c.tier.toUpperCase());
			abList.appendChild(th);
		}
		const sel = devAbilityIds.has(c.id);
		const tc = TIER_COLORS[c.tier] || "#aaa";
		const row = document.createElement("div");
		row.style.cssText = `padding:9px 10px;cursor:pointer;border:1px solid ${sel ? tc : "#3a3a46"};border-radius:4px;background:${sel ? "rgba(255,255,255,0.06)" : "#050508"};display:flex;justify-content:space-between;align-items:center;gap:10px;box-shadow:${sel ? `0 0 0 1px ${tc}66` : "0 0 0 1px rgba(255,255,255,0.03) inset"};`;
		row.innerHTML = `<div style="display:flex;flex-direction:column;align-items:flex-start;"><div style="font-size:10px;letter-spacing:2px;color:${sel ? "#eee" : "#ccc"};">${c.name}</div><div style="font-size:9px;letter-spacing:1px;color:${sel ? "#ddd" : "#aaa"};">${c.desc}</div></div><div style="font-size:12px;color:${tc};">${sel ? "�" : "�"}</div>`;
		row.onclick = () => {
			devAbilityScrollTop = abList.scrollTop;
			devScreenScrollTop = devScreenEl
				? devScreenEl.scrollTop
				: devScreenScrollTop;
			if (sel) devAbilityIds.delete(c.id);
			else devAbilityIds.add(c.id);
			SFX.sel();
			showDevScreen();
		};
		abList.appendChild(row);
	});

	// Third section: enemies + stage/wave sector
	const opts = $("dev-opts");
	opts.innerHTML = "";
	const enemyWrap = document.createElement("div");
	enemyWrap.style.cssText =
		"padding:10px 12px;border:1px solid #40404f;border-radius:4px;background:#050508;box-shadow:0 0 0 1px rgba(255,255,255,0.06) inset;";
	enemyWrap.innerHTML =
		'<div id="dev-enemy-list" style="display:flex;flex-direction:column;gap:8px;padding-right:4px;"></div>';
	opts.appendChild(enemyWrap);
	const enemyList = enemyWrap.querySelector("#dev-enemy-list");
	let lastDiff = "";
	ENEMIES.forEach((e) => {
		if (e.diff !== lastDiff) {
			lastDiff = e.diff;
			const head = document.createElement("div");
			const hc = DIFF_COLORS[e.diff] || "#999";
			head.style.cssText = `margin-top:8px;padding:8px 8px 3px;border-top:1px solid rgba(120,120,140,0.3);color:${hc};font-size:12px;font-weight:900;letter-spacing:5px;text-align:left;`;
			head.textContent = "TIER " + e.diff;
			enemyList.appendChild(head);
		}
		const dc = DIFF_COLORS[e.diff] || "#fff";
		const eab = getEnemyAbil(e.id);
		const sel = devEnemy === e.id;
		const d = document.createElement("div");
		const auraBorder = e.id === "thefool" ? "#e6dcff" : dc;
		const auraGlow =
			e.id === "thefool" ? "rgba(230,220,255,0.35)" : "rgba(255,255,255,0.03)";
		d.style.cssText = `padding:10px 12px;cursor:pointer;border:1px solid ${sel ? auraBorder : "#3a3a46"};border-radius:4px;background:${sel ? auraGlow : "#050508"};display:flex;align-items:center;gap:10px;transition:all 0.15s;box-shadow:${sel ? `0 0 0 1px ${auraBorder}66` : "0 0 0 1px rgba(255,255,255,0.03) inset"};`;
		d.innerHTML = `<div style="font-size:11px;font-weight:900;color:${dc};width:52px;text-align:center;letter-spacing:1px;">${e.diff}</div><div style="flex:1;"><div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${sel ? "#fff" : "#ccc"}">${e.name} <span style="color:#aa9;font-size:8px;">${e.tag}</span></div>${eab.id !== "none" ? `<div style="font-size:8px;color:#f88;letter-spacing:1.5px;margin-top:2px;">${eab.icon} ${eab.name}</div>` : ""}</div>`;
		d.onclick = () => {
			devEnemy = e.id;
			SFX.sel();
			showDevScreen();
		};
		d.onmouseenter = () => {
			if (!sel) {
				d.style.borderColor = "#5a5a70";
				d.style.boxShadow = "0 0 0 1px rgba(150,150,190,0.22)";
			}
		};
		d.onmouseleave = () => {
			if (!sel) {
				d.style.borderColor = "#3a3a46";
				d.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.03) inset";
			}
		};
		enemyList.appendChild(d);
	});

	const stageWrap = document.createElement("div");
	stageWrap.style.cssText =
		"padding:10px 12px;border:1px solid #40404f;border-radius:4px;background:#050508;margin-top:6px;box-shadow:0 0 0 1px rgba(255,255,255,0.06) inset;";
	stageWrap.innerHTML =
		'<div style="font-size:12px;font-weight:900;letter-spacing:4px;color:#ddd;margin-bottom:8px;">STAGE / WAVE</div>';
	opts.appendChild(stageWrap);
	// Boss toggle
	const bossD = document.createElement("div");
	bossD.style.cssText = `padding:8px 12px;cursor:pointer;border:1px solid ${devBoss ? "#f66" : "#3a3a46"};border-radius:3px;background:${devBoss ? "rgba(255,40,40,0.06)" : "#050508"};transition:all 0.15s;box-shadow:${devBoss ? "0 0 0 1px rgba(255,110,110,0.35)" : "0 0 0 1px rgba(255,255,255,0.03) inset"};`;
	bossD.innerHTML = `<div style="font-size:10px;font-weight:700;letter-spacing:3px;color:${devBoss ? "#f66" : "#bbb"};">\u2605 BOSS MODE: ${devBoss ? "ON" : "OFF"}</div>`;
	bossD.onclick = () => {
		devBoss = !devBoss;
		SFX.sel();
		showDevScreen();
	};
	stageWrap.appendChild(bossD);
	// Wave slider
	const wvD = document.createElement("div");
	wvD.style.cssText =
		"padding:8px 12px;border:1px solid #3a3a46;border-radius:3px;background:#050508;margin-top:6px;box-shadow:0 0 0 1px rgba(255,255,255,0.03) inset;";
	wvD.innerHTML = `<div style="font-size:10px;font-weight:700;letter-spacing:3px;color:#ddd;margin-bottom:6px;">WAVE LEVEL: ${devWave}</div><input type="range" min="1" max="12" value="${devWave}" style="width:100%;accent-color:#f66;" id="dev-wave-slider">`;
	stageWrap.appendChild(wvD);

	setTimeout(() => {
		const sl = $("dev-wave-slider");
		if (sl)
			sl.oninput = (e) => {
				devWave = parseInt(e.target.value);
				sl.parentElement.querySelector("div").textContent =
					"WAVE LEVEL: " + devWave;
			};
	}, 0);
	setTimeout(() => {
		const clr = $("dev-abil-clear");
		if (clr)
			clr.onclick = () => {
				devAbilityScrollTop = 0;
				devScreenScrollTop = devScreenEl
					? devScreenEl.scrollTop
					: devScreenScrollTop;
				devAbilityIds.clear();
				SFX.sel();
				showDevScreen();
			};
	}, 0);

	showScreen("dev-screen");
	requestAnimationFrame(() => {
		const listEl = $("dev-abil-list");
		const screenEl = $("dev-screen");
		const padListEl = $("dev-pad-list");
		const enemyListEl = $("dev-enemy-list");
		if (listEl) listEl.scrollTop = devAbilityScrollTop;
		if (padListEl) padListEl.scrollTop = devPadScrollTop;
		if (enemyListEl) enemyListEl.scrollTop = devEnemyScrollTop;
		if (screenEl) screenEl.scrollTop = devScreenScrollTop;
	});
}

function devLaunch() {
	const enemy = ENEMIES.find((e) => e.id === devEnemy) || ENEMIES[0];
	const launchPadId = devPad === "dev_perfect" ? "classic" : devPad;
	const wv = devWave;
	const boss = devBoss;
	const rankIdx = Math.min(Math.floor(wv / 1.5), DIFF_RANKS.length - 1);
	const diff = boss
		? DIFF_RANKS[Math.min(rankIdx + 1, DIFF_RANKS.length - 1)]
		: enemy.diff;
	const diffIdxRaw = DIFF_RANKS.indexOf(diff);
	const diffIdx = diffIdxRaw >= 0 ? diffIdxRaw : DIFF_RANKS.length - 1;
	let aiSpd, aiReact;
	if (diffIdx >= 5) {
		aiSpd = 420 + wv * 45 + (boss ? 180 : 120);
		aiReact = clamp(0.9 + wv * 0.015 + (boss ? 0.05 : 0), 0, 0.995);
	} else {
		aiSpd = 360 + wv * 32 + (boss ? 120 : 90);
		aiReact = clamp(0.84 + wv * 0.013 + (boss ? 0.04 : 0), 0, 0.992);
	}
	const eH = BASE_PAD_H;
	const cfg = {
		wv,
		boss,
		diff,
		aiSpd,
		aiReact,
		eH,
		enemy,
		trickAng: false,
		ghost: false,
		chaos: false,
		jitter: false,
	};
	enemy.mod(cfg);
	cfg.aiSpd = Math.max(cfg.aiSpd, 500 + wv * 40 + (boss ? 160 : 100));
	cfg.aiReact = Math.max(cfg.aiReact, 0.985);
	const devState = buildDevAbilityState();
	savedState = null;
	wave = wv;
	enemyUps = [];
	chosenOppCfg = cfg;
	padId = launchPadId;
	g = newGame(launchPadId, wv, devState, [], cfg);
	chosenOppCfg = null;
	showScreen(null);
	if (boss) setTimeout(SFX.boss, 80);
}

bindClick("dev-go", () => {
	SFX.sel();
	devLaunch();
});
bindClick("dev-back", () => {
	SFX.sel();
	showScreen("menu-screen");
});

// --- GAME LOOP ---
const cv = $("cv");
const ctx = cv ? cv.getContext("2d") : null;
if (ctx) ctx.imageSmoothingEnabled = false;
let last = performance.now();
let viewW = window.innerWidth,
	viewH = window.innerHeight;
function resize() {
	if (!cv || !ctx) return;
	viewW = window.innerWidth;
	viewH = window.innerHeight;
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	cv.width = Math.floor(viewW * dpr);
	cv.height = Math.floor(viewH * dpr);
	cv.style.width = `${viewW}px`;
	cv.style.height = `${viewH}px`;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.imageSmoothingEnabled = false;
}
resize();
window.addEventListener("resize", resize);
function loop(now) {
	if (!ctx) {
		requestAnimationFrame(loop);
		return;
	}
	if (paused && curScreen === null && g) {
		draw(ctx, viewW, viewH);
		ctx.fillStyle = "rgba(0,0,0,0.4)";
		ctx.fillRect(0, 0, viewW, viewH);
		requestAnimationFrame(loop);
		return;
	}
	const dt = Math.min((now - last) / 1000, 0.04);
	last = now;
	if (curScreen === null && !g && tut && tut.active && tut.phase === "intro") {
		// Tutorial intro: no game yet, just render intro overlay
		updateTutorial(dt);
		draw(ctx, viewW, viewH);
	} else if (curScreen === null && g) {
		try {
			update(dt);
			draw(ctx, viewW, viewH);
		} catch (err) {
			console.error("Game loop error:", err);
		}
	}
	requestAnimationFrame(loop);
}
// Tutorial resets every session
let _tutorialDone = false;
buildPadGrid();
bindClick("skip-tut-btn", () => {
	_tutorialDone = true;
	updateSkipTutBtn();
	SFX.sel();
});
showScreen("menu-screen");
requestAnimationFrame(loop);
