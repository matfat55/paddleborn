// --- CONSTANTS ---
export const GW = 800,
	GH = 500,
	BALL_SZ = 10,
	PAD_W = 12,
	BASE_PAD_H = 80; // slightly larger base paddles
export const PX_HOME = 40,
	EX = GW - 40,
	HORIZ = 50,
	PTS_WIN = 5,
	MAX_WAVE = 12,
	TRAIL = 24,
	BASE_SPD = 340;
export const MAX_BALL_SPD = 2200;
// Visual/particle caps (raised to allow richer effects)
export const MAX_SPARKS = 350,
	MAX_MULTI = 14,
	MAX_BOLTS = 16;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rng = (a, b) => a + Math.random() * (b - a);
export const easeOut = (t) => 1 - (1 - t) ** 3;
export function simBallY(bx, by, vx, vy, tx) {
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
export function simYAtX(bx, by, vx, vy, tx) {
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
export function pickIncomingThreatY(g, targetX, dir) {
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
export function getRallyMul(hits) {
	if (!hits || hits <= 0) return 1;
	// Growth eases out so rallies speed up without becoming chaotic too fast.
	const extra = Math.min(0.12, Math.log2(hits + 1) * 0.012);
	return 1 + extra;
}

// --- DIFFICULTY RATINGS ---
export const DIFF_RANKS = ["F", "E", "D", "C", "B", "A", "S", "SS", "SSS"];
export const DIFF_COLORS = {
	F: "#446644",
	"F-": "#8c8c8c",
	©: "#e6dcff",
	E: "#558855",
	D: "#669966",
	C: "#88aa88",
	B: "#66aaff",
	A: "#5588ff",
	S: "#ffaa44",
	SS: "#ff6644",
	SSS: "#ff44ff",
};
export const DIFF_GLOW = {
	F: "68,102,68",
	"F-": "140,140,140",
	©: "230,220,255",
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
export const DIFF_REWARD = {
	F: "common",
	"F-": "common",
	©: "klein",
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
export const DIFF_TIERS = {
	F: ["common"],
	"F-": ["common"],
	©: ["mythical", "secret", "klein"],
	E: ["common", "uncommon"],
	D: ["common", "uncommon"],
	C: ["common", "uncommon", "rare"],
	B: ["uncommon", "rare"],
	A: ["uncommon", "rare", "epic"],
	S: ["rare", "epic", "legendary"],
	SS: ["epic", "legendary", "mythical"],
	SSS: ["legendary", "mythical", "secret", "klein"],
};
export const DIFF_BALL_MUL = {
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
	©: 2.38,
};
export const BASE_BALL_SPEED_CAP = 760;
export const FOOL_SEQUENCES = [
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
export const FOOL_SEQ_KEY = [
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
export const FOOL_ASCENT_LINES = {
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
export const FOOL_START_LINES = [
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
export const FOOL_ENTRY_LINES = [
	"You crossed the threshold. Now endure what waits behind the mask.",
	"The audience is silent because your fate has already spoken.",
	"You did not arrive for victory; you arrived for judgment.",
	"Stand your ground, if you can. The throne does not move.",
	"You sought an easy hunt and found a final sequence.",
];
export const FOOL_START_WARNING_LINES = [
	"You can inflict only one point of damage per wave.",
	"All your tricks are useless against me.",
	"I begin at Sequence 9. Your first point forces Sequence 8.",
];
export const FOOL_MECHANIC_LINES = [
	"I grant you one point of damage per wave, no more.",
	"I erase extra scoring tricks the moment they touch me.",
	"I ascend by a sequence every time you score.",
	"Break my rhythm if you can; I built it to break you.",
];
export const FOOL_DEFEAT_LINES = [
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
export const FOOL_SCORE_PLAYER_LINES = [
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
export const FOOL_SCORE_ENEMY_LINES = [
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
export const FOOL_FOOLED_WIN_LINES = [
	"You were the fool.",
	"You were playing against yourself all along.",
	"You were never worthy to change me.",
	"You touched the throne and called it victory.",
];
export const FOOL_SEQ_AMBIENT = {
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
export const FOOL_SPECIALS = {
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
export const FOOL_SPECIAL_LINES = {
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
export const TIER_NAMES = {
	common: "COMMON",
	uncommon: "UNCOMMON",
	rare: "RARE",
	epic: "EPIC",
	legendary: "LEGENDARY",
	mythical: "MYTHICAL",
	secret: "SECRET",
	klein: "ARCANA",
};
export const TIER_COLORS = {
	common: "#667788",
	uncommon: "#55aa77",
	rare: "#5588ff",
	epic: "#ffaa44",
	legendary: "#ff5555",
	mythical: "#ff44ff",
	secret: "#00ffcc",
	klein: "#d8d2ff",
};
export const TIER_GLOW = {
	common: "102,119,136",
	uncommon: "85,170,119",
	rare: "85,136,255",
	epic: "255,170,68",
	legendary: "255,85,85",
	mythical: "255,68,255",
	secret: "0,255,204",
	klein: "216,210,255",
};
export const TIER_ICON = {
	common: "\u25C7",
	uncommon: "\u25C8",
	rare: "\u2605",
	epic: "\u2726",
	legendary: "\u2742",
	mythical: "\u2748",
	secret: "\u2756",
	klein: "\u2736",
};
export const TIER_ORDER = [
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
export const PCOL = {
	classic: { p: "#ffffff", g: "rgba(255,255,255,", t: [1, 1, 1] },
	oracle: { p: "#44ddff", g: "rgba(68,221,255,", t: [0.27, 0.87, 1] },
	paradox: { p: "#c7b3ff", g: "rgba(199,179,255,", t: [0.78, 0.7, 1] },
	inferno: { p: "#cc88ff", g: "rgba(204,136,255,", t: [0.8, 0.53, 1] },
	frost: { p: "#88ccff", g: "rgba(136,204,255,", t: [0.53, 0.8, 1] },
	storm: { p: "#ffee44", g: "rgba(255,238,68,", t: [1, 0.93, 0.27] },
	voidp: { p: "#ff44aa", g: "rgba(255,68,170,", t: [1, 0.27, 0.67] },
};

// --- PADDLES ---
export const PADDLES = [
	{
		id: "classic",
		name: "STANDARD",
		hMul: 1.1,
		desc: "No tricks. Just a slightly bigger paddle.",
		abil: "NONE",
		akey: "",
		ainfo: "",
		cd: 999,
	},
	{
		id: "oracle",
		name: "ORACLE",
		hMul: 1,
		desc: "Briefly reveals the ball's trajectory.",
		abil: "FUTURE FORESIGHT",
		akey: "Q",
		ainfo: "Projected path window",
		cd: 8,
	},
	{
		id: "paradox",
		name: "PARADOX",
		hMul: 1,
		desc: "Rewinds the ball mid-flight and fires it back at a new angle.",
		abil: "PARADOX SNAP",
		akey: "Q",
		ainfo: "Rewind teleport + relaunch",
		cd: 9,
	},
	{
		id: "inferno",
		name: "PHANTOM",
		hMul: 0.95,
		desc: "Your next hit phases through anything in the way.",
		abil: "PHASE",
		akey: "Q",
		ainfo: "Next hit ghost-pierces",
		cd: 6,
	},
	{
		id: "frost",
		name: "GLACIER",
		hMul: 1.05,
		desc: "Ices the enemy side. Slows the ball and locks their movement.",
		abil: "ABSOLUTE ZERO",
		akey: "Q",
		ainfo: "Slow zone + brief freeze",
		cd: 8,
	},
	{
		id: "storm",
		name: "STORM",
		hMul: 0.9,
		desc: "Loads your next hit with a bolt that stuns on contact.",
		abil: "THUNDER",
		akey: "Q",
		ainfo: "Stun bolt on next hit",
		cd: 6,
	},
	{
		id: "voidp",
		name: "VOID",
		hMul: 1,
		desc: "Drops a gravity well that bends the ball around it.",
		abil: "GRAVITY WELL",
		akey: "Q",
		ainfo: "Gravity well 3s",
		cd: 6,
	},
];

// --- ENEMIES with difficulty --- (multiple per tier for variety)
export const ENEMIES = [
	// F-tier
	{ id: "basic", name: "ROOKIE", tag: "", diff: "F", mod: (c) => { c.aiSpd *= 1.2; c.aiReact *= 0.6; } },
	{
		id: "sleepy",
		name: "DROWSY",
		tag: "zz",
		diff: "F",
		mod: (c) => {
			c.aiSpd *= 1.05;
			c.aiReact *= 0.5;
		},
	},
	// E-tier
	{
		id: "wide",
		name: "WALL",
		tag: "=",
		diff: "E",
		mod: (c) => {
			c.aiSpd *= 1.1;
			c.aiReact *= 0.65;
		},
	},
	{
		id: "stubborn",
		name: "BRICK",
		tag: "[]",
		diff: "E",
		mod: (c) => {
			c.aiSpd *= 1.0;
			c.aiReact *= 0.6;
		},
	},
	// D-tier
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
	// C-tier
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
	// B-tier
	{
		id: "clown",
		name: "CLOWN",
		tag: "JOKE",
		diff: "B",
		mod: (c) => {
			c.aiSpd *= 1.26;
			c.aiReact = Math.min(c.aiReact + 0.08, 0.94);
		},
	},
	{
		id: "marionettist",
		name: "MARIONETTIST",
		tag: "STRINGS",
		diff: "B",
		mod: (c) => {
			c.aiSpd *= 1.22;
			c.aiReact = Math.min(c.aiReact + 0.1, 0.95);
		},
	},
	// A-tier
	{
		id: "tank",
		name: "FORTRESS",
		tag: "##",
		diff: "A",
		mod: (c) => {
			c.aiSpd *= 0.85;
		},
	},
	{
		id: "jugg",
		name: "JUGGERNAUT",
		tag: "###",
		diff: "A",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.08, 0.95);
		},
	},
	// S-tier
	{
		id: "sniper",
		name: "SNIPER",
		tag: "+",
		diff: "S",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.14, 0.97);
		},
	},
	{
		id: "hunter",
		name: "HUNTER",
		tag: ">+",
		diff: "S",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.1, 0.96);
			c.aiSpd *= 1.2;
		},
	},
	{
		id: "thunder",
		name: "THUNDERLORD",
		tag: "¡",
		diff: "S",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.12, 0.97);
			c.aiSpd *= 1.16;
			c.trickAng = true;
		},
	},
	// SS-tier
	{
		id: "accel",
		name: "CHAOS",
		tag: "!!",
		diff: "SS",
		mod: (c) => {
			c.chaos = true;
			c.aiSpd *= 1.1;
		},
	},
	{
		id: "warden",
		name: "WARDEN",
		tag: "!#",
		diff: "SS",
		mod: (c) => {
			c.aiReact = Math.min(c.aiReact + 0.15, 0.97);
			c.chaos = true;
			c.trickAng = true;
		},
	},
	// SSS-tier (boss-only) - terrifying
	{
		id: "apex",
		name: "APEX",
		tag: "\u2620",
		diff: "SSS",
		mod: (c) => {
			c.chaos = true;
			c.trickAng = true;
			c.aiReact = Math.min(c.aiReact + 0.2, 0.98);
			c.aiSpd *= 1.3;
		},
	},
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
		tag: "<Ï",
		diff: "F-",
		mod: (c) => {
			c.aiSpd = 220;
			c.aiReact = 0.18;
			c.eH = BASE_PAD_H * 0.92;
		},
	},
];

export function getEnemiesForDiff(diff) {
	return ENEMIES.filter((e) => e.diff === diff);
}

// --- ENEMY ABILITIES ---
// Each ability: id, name, desc, icon, cd (cooldown), dur (active duration), minDiff (minimum rank index to appear)
export const E_ABILS = {
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
		desc: "Ball accelerates to 2x speed for 2s",
		icon: "\u00BB",
		cd: 8,
		dur: 2,
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
export const ENEMY_ABIL_MAP = {
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
