import { tone } from "./audio.js";
import { addSparks, resetBall } from "./script.js";
import {
	clamp,
	rng,
	GW,
	GH,
	EX,
	FOOL_SCORE_PLAYER_LINES,
	FOOL_SCORE_ENEMY_LINES,
	FOOL_FOOLED_WIN_LINES,
	FOOL_SPECIALS,
	FOOL_SPECIAL_LINES,
	FOOL_SEQUENCES,
	FOOL_ASCENT_LINES,
	E_ABILS,
	FOOL_SEQ_KEY
} from "./game-data.js";

export function foolStageToKey(stage) {
	return (
		FOOL_SEQ_KEY[
			Math.max(0, Math.min((stage || 1) - 1, FOOL_SEQ_KEY.length - 1))
		] || "seer"
	);
}

export function nextFromBag(g, bagKey, pool) {
	if (!g || !pool || !pool.length) return "";
	if (!g[bagKey] || !Array.isArray(g[bagKey]) || g[bagKey].length === 0) {
		g[bagKey] = [...pool].sort(() => Math.random() - 0.5);
	}
	return g[bagKey].pop() || pool[Math.floor(Math.random() * pool.length)] || "";
}

export function nextTypeDelay(ch) {
	let add = 0.018;
	if (ch === " " || ch === "\t") add = 0.032;
	else if (ch === "," || ch === ";" || ch === ":") add = 0.1;
	else if (ch === "." || ch === "!" || ch === "?" || ch === "&") add = 0.2;
	else if (ch === "" || ch === "-") add = 0.14;
	return add;
}

export function triggerFoolScoreVoice(g, isPlayerScore) {
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

export function triggerFoolScoreAscPulse(g, isPlayerScore) {
	if (!g || g.cfg.enemy.id !== "thefool") return;
	g.foolAscPulse = Math.max(g.foolAscPulse || 0, 1.15);
}

export function triggerFoolSwap(g) {
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

export function foolSpeak(g, lines, dur = 2.6, force = false, blocking = false) {
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

export function queueFoolBlockingLines(g, lines) {
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

export function advanceFoolDialogue(g) {
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

export function getUnlockedFoolSpecials(g) {
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

export function pickFoolSpecial(g, ready) {
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

export function startFoolSpecial(g, id) {
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

export function applyFoolSequence(g, stage) {
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

export function beginFoolAscension(g, fromLabel, toLabel, toSeq) {
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

export function onFoolPlayerScore(g) {
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

export function applyFoolGoal(g, amount) {
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
