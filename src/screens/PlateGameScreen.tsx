import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { extractGameNumbers, findSolution, findRandomTarget } from '../utils/plateMath';

// ── Types ─────────────────────────────────────────────────────────────────────

type Op = '+' | '−' | '×' | '÷';

interface Tile {
  id: string;
  value: number;
  /** Human-readable expression that produced this tile, e.g. "(3+1)" */
  expr: string;
  /** Color index 0-3 for visual variety */
  colorIdx: number;
}

type Phase = 'target' | 'playing' | 'wrong' | 'won' | 'revealed';

let _tileSeq = 0;
function makeTile(value: number, expr: string, colorIdx: number): Tile {
  return { id: String(++_tileSeq), value, expr, colorIdx };
}

function applyOp(a: number, b: number, op: Op): number | null {
  if (op === '+') return a + b;
  if (op === '−') return a - b;
  if (op === '×') return a * b;
  if (op === '÷') {
    if (Math.abs(b) < 1e-9) return null;
    return a / b;
  }
  return null;
}

function fmtExpr(a: Tile, b: Tile, op: Op): string {
  return `(${a.expr}${op}${b.expr})`;
}

function isInteger(n: number): boolean {
  return Math.abs(n - Math.round(n)) < 1e-9;
}

// ── Tile colors ───────────────────────────────────────────────────────────────

const TILE_BG   = ['#1A3A5C', '#2D1B5C', '#0F3D2E', '#4A2800'];
const TILE_BORDER= ['#4FA3FF', '#A78BFA', '#34D399', '#FBBF24'];
const TILE_TEXT  = ['#93C5FD', '#C4B5FD', '#6EE7B7', '#FDE68A'];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  plate: string;
  onClose: () => void;
}

export function PlateGameScreen({ visible, plate, onClose }: Props) {
  const nums = extractGameNumbers(plate);

  const [phase,       setPhase]       = useState<Phase>('target');
  const [target,      setTarget]      = useState(10);
  const [tiles,       setTiles]       = useState<Tile[]>([]);
  const [selected,    setSelected]    = useState<string[]>([]);
  const [history,     setHistory]     = useState<Tile[][]>([]);
  const [solution,    setSolution]    = useState<string | null>(null);
  const [elapsedSec,  setElapsedSec]  = useState(0);
  const [wrongMsg,    setWrongMsg]    = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  // ── Reset when modal opens ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setPhase('target');
      setSelected([]);
      setHistory([]);
      setSolution(null);
      setElapsedSec(0);
    } else {
      stopTimer();
    }
  }, [visible]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  useEffect(() => () => stopTimer(), []);

  function fmtTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  // ── Start game ──────────────────────────────────────────────────────────────
  function startGame(t: number) {
    const sol = findSolution(nums, t);
    if (!sol) {
      // No solution exists — try another target
      const alt = findRandomTarget(nums);
      setTarget(alt);
      setSolution(findSolution(nums, alt));
      startGameWith(alt, nums);
    } else {
      setTarget(t);
      setSolution(sol);
      startGameWith(t, nums);
    }
  }

  function startGameWith(t: number, n: number[]) {
    const initialTiles = n.map((v, i) => makeTile(v, String(v), i));
    setTiles(initialTiles);
    setSelected([]);
    setHistory([]);
    setElapsedSec(0);
    setPhase('playing');
    startTimer();
  }

  function resetGame() {
    stopTimer();
    setPhase('target');
    setSelected([]);
    setHistory([]);
    setSolution(null);
    setElapsedSec(0);
  }

  // ── Tile selection ──────────────────────────────────────────────────────────
  function toggleTile(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2)  return [prev[0], id]; // replace second
      return [...prev, id];
    });
  }

  // ── Merge tiles ─────────────────────────────────────────────────────────────
  const applyOperator = useCallback((op: Op) => {
    if (selected.length !== 2) return;
    const [idA, idB] = selected;
    const tileA = tiles.find(t => t.id === idA)!;
    const tileB = tiles.find(t => t.id === idB)!;
    const result = applyOp(tileA.value, tileB.value, op);

    if (result === null || !isFinite(result) || isNaN(result)) {
      shake('Division by zero!');
      return;
    }
    if (!isInteger(result)) {
      shake('Result must be a whole number!');
      return;
    }

    const newTile = makeTile(
      Math.round(result),
      fmtExpr(tileA, tileB, op),
      tileA.colorIdx,
    );
    const newTiles = [
      ...tiles.filter(t => t.id !== idA && t.id !== idB),
      newTile,
    ];

    setHistory(h => [...h, tiles]);
    setTiles(newTiles);
    setSelected([]);

    // Check win condition
    if (newTiles.length === 1) {
      if (Math.abs(newTiles[0].value - target) < 1e-9) {
        stopTimer();
        setPhase('won');
      } else {
        shake(`Got ${newTiles[0].value}, not ${target}. Try again!`);
        setPhase('wrong');
      }
    }
  }, [selected, tiles, target]);

  // ── Undo ────────────────────────────────────────────────────────────────────
  function undo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setTiles(prev);
    setHistory(h => h.slice(0, -1));
    setSelected([]);
    if (phase === 'wrong') setPhase('playing');
  }

  // ── Give up ─────────────────────────────────────────────────────────────────
  function giveUp() {
    stopTimer();
    setPhase('revealed');
  }

  // ── Shake feedback ───────────────────────────────────────────────────────────
  function shake(msg: string) {
    setWrongMsg(msg);
    RNAnimated.sequence([
      RNAnimated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start(() => setWrongMsg(''));
  }

  const canMerge = selected.length === 2;

  // ── Render phases ─────────────────────────────────────────────────────────

  function renderTargetPhase() {
    const randomTarget = findRandomTarget(nums);
    return (
      <ScrollView contentContainerStyle={styles.phaseWrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.gameTitle}>🎮 Plate Game</Text>

        {/* Plate + derived numbers */}
        <View style={styles.plateBox}>
          <Text style={styles.plateLbl}>PLATE</Text>
          <Text style={styles.plateStr}>{plate.toUpperCase()}</Text>
        </View>

        <Text style={styles.sectionLbl}>Numbers from this plate</Text>
        <View style={styles.previewRow}>
          {nums.map((n, i) => (
            <View key={i} style={[styles.previewTile, { backgroundColor: TILE_BG[i], borderColor: TILE_BORDER[i] }]}>
              <Text style={[styles.previewNum, { color: TILE_TEXT[i] }]}>{n}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLbl}>Choose a target</Text>
        <Text style={styles.targetDesc}>
          Use +  −  ×  ÷ with these 4 numbers to reach the target.{'\n'}
          Everyone can think together — no wrong guesses!
        </Text>

        <View style={styles.targetRow}>
          {[10, 24].map(t => {
            const solvable = findSolution(nums, t) !== null;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.targetBtn, !solvable && styles.targetBtnOff]}
                onPress={() => startGame(t)}
                disabled={!solvable}
                activeOpacity={0.8}
              >
                <Text style={[styles.targetNum, !solvable && styles.targetNumOff]}>{t}</Text>
                {!solvable && <Text style={styles.targetImpossible}>Impossible</Text>}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.targetBtn, styles.targetBtnRandom]}
            onPress={() => startGame(randomTarget)}
            activeOpacity={0.8}
          >
            <Text style={styles.targetRandIcon}>🎲</Text>
            <Text style={[styles.targetNum, { color: colors.yellow }]}>{randomTarget}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  function renderPlayPhase() {
    return (
      <View style={styles.phaseWrap}>

        {/* Target + timer */}
        <View style={styles.playHeader}>
          <View style={styles.targetBadge}>
            <Text style={styles.targetBadgeLbl}>TARGET</Text>
            <Text style={styles.targetBadgeNum}>{target}</Text>
          </View>
          <View style={styles.timerBadge}>
            <Text style={styles.timerTxt}>{fmtTime(elapsedSec)}</Text>
          </View>
        </View>

        {/* Wrong message */}
        {wrongMsg ? (
          <Text style={styles.wrongMsg}>{wrongMsg}</Text>
        ) : (
          <Text style={styles.hint}>
            {selected.length === 0 ? 'Select two numbers' :
             selected.length === 1 ? 'Select one more number' :
             'Choose an operator'}
          </Text>
        )}

        {/* Tiles */}
        <RNAnimated.View style={[styles.tilesRow, { transform: [{ translateX: shakeAnim }] }]}>
          {tiles.map(tile => {
            const isSel = selected.includes(tile.id);
            return (
              <TouchableOpacity
                key={tile.id}
                style={[
                  styles.tile,
                  { backgroundColor: TILE_BG[tile.colorIdx % 4], borderColor: TILE_BORDER[tile.colorIdx % 4] },
                  isSel && styles.tileSelected,
                  isSel && { borderColor: '#fff', backgroundColor: TILE_BORDER[tile.colorIdx % 4] + '55' },
                ]}
                onPress={() => toggleTile(tile.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tileNum, { color: isSel ? '#fff' : TILE_TEXT[tile.colorIdx % 4] }]}>
                  {tile.value}
                </Text>
                {tile.expr !== String(tile.value) && (
                  <Text style={styles.tileExpr} numberOfLines={1}>{tile.expr}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </RNAnimated.View>

        {/* Operators */}
        <View style={styles.opsRow}>
          {(['+', '−', '×', '÷'] as Op[]).map(op => (
            <TouchableOpacity
              key={op}
              style={[styles.opBtn, canMerge && styles.opBtnActive]}
              onPress={() => applyOperator(op)}
              disabled={!canMerge}
              activeOpacity={0.75}
            >
              <Text style={[styles.opTxt, canMerge && styles.opTxtActive]}>{op}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step log */}
        {history.length > 0 && (
          <View style={styles.historyBox}>
            {history.map((_, i) => {
              const before = history[i];
              const after  = i + 1 < history.length ? history[i + 1] : tiles;
              const merged = after.find(t => !before.some(b => b.id === t.id));
              return merged ? (
                <Text key={i} style={styles.historyTxt}>
                  Step {i + 1}: {merged.expr} = {merged.value}
                </Text>
              ) : null;
            })}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, history.length === 0 && styles.actionBtnOff]}
            onPress={undo}
            disabled={history.length === 0}
          >
            <Text style={[styles.actionTxt, history.length === 0 && { color: colors.t4 }]}>
              ↩ Undo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={giveUp}>
            <Text style={[styles.actionTxt, { color: colors.red }]}>Give Up</Text>
          </TouchableOpacity>
        </View>

      </View>
    );
  }

  function renderWonPhase() {
    return (
      <View style={[styles.phaseWrap, styles.centeredPhase]}>
        <Text style={styles.wonEmoji}>🎉</Text>
        <Text style={styles.wonTitle}>You got {target}!</Text>
        <Text style={styles.wonTime}>Solved in {fmtTime(elapsedSec)}</Text>

        {tiles[0] && (
          <View style={styles.solutionBox}>
            <Text style={styles.solutionLbl}>YOUR SOLUTION</Text>
            <Text style={styles.solutionExpr}>{tiles[0].expr} = {target}</Text>
          </View>
        )}

        <View style={styles.endActions}>
          <TouchableOpacity style={styles.endBtnSecondary} onPress={resetGame}>
            <Text style={styles.endBtnSecondaryTxt}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtnPrimary} onPress={onClose}>
            <Text style={styles.endBtnPrimaryTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderRevealedPhase() {
    return (
      <View style={[styles.phaseWrap, styles.centeredPhase]}>
        <Text style={styles.revealEmoji}>🔍</Text>
        <Text style={styles.revealTitle}>Here's one solution</Text>

        <View style={styles.solutionBox}>
          <Text style={styles.solutionLbl}>SOLUTION</Text>
          <Text style={styles.solutionExpr}>
            {solution ?? 'No solution found'}
          </Text>
          <Text style={styles.solutionTarget}>= {target}</Text>
        </View>

        <Text style={styles.revealNote}>
          There may be other ways to reach {target} — did anyone find a different one?
        </Text>

        <View style={styles.endActions}>
          <TouchableOpacity style={styles.endBtnSecondary} onPress={resetGame}>
            <Text style={styles.endBtnSecondaryTxt}>Try Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtnPrimary} onPress={onClose}>
            <Text style={styles.endBtnPrimaryTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Modal shell ───────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {phase === 'target'   ? 'Plate Game' :
             phase === 'won'      ? 'Well done!' :
             phase === 'revealed' ? 'Answer' :
             `Make ${target}`}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Phase content */}
        {phase === 'target'                  && renderTargetPhase()}
        {(phase === 'playing' ||
          phase === 'wrong')                 && renderPlayPhase()}
        {phase === 'won'                     && renderWonPhase()}
        {phase === 'revealed'                && renderRevealedPhase()}

      </SafeAreaView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  closeBtn:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { color: colors.t3, fontSize: 18, fontWeight: font.weights.bold },
  headerTitle: { fontSize: font.sizes.md, fontWeight: font.weights.bold, color: colors.t1 },

  phaseWrap:    { flex: 1, padding: spacing.lg, gap: spacing.lg },
  centeredPhase:{ alignItems: 'center', justifyContent: 'center' },

  // ── Target phase ────────────────────────────────────────────────────────
  gameTitle:  { fontSize: font.sizes.xxl, fontWeight: font.weights.extrabold, color: colors.t1, textAlign: 'center' },
  plateBox:   { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  plateLbl:   { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.5, color: colors.t4, marginBottom: 4 },
  plateStr:   { fontSize: font.sizes.xl, fontWeight: font.weights.extrabold, color: colors.t1, letterSpacing: 2 },
  sectionLbl: { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.t3 },
  targetDesc: { fontSize: font.sizes.sm, color: colors.t3, lineHeight: 20, textAlign: 'center' },

  previewRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  previewTile:{ width: 60, height: 60, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  previewNum: { fontSize: font.sizes.xl, fontWeight: font.weights.extrabold },

  targetRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  targetBtn: {
    flex: 1, height: 90, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderBlue, gap: 4,
  },
  targetBtnOff:    { borderColor: colors.border, opacity: 0.5 },
  targetBtnRandom: { borderColor: 'rgba(252,211,77,0.4)', backgroundColor: 'rgba(252,211,77,0.07)' },
  targetNum:       { fontSize: 30, fontWeight: font.weights.extrabold, color: colors.blue },
  targetNumOff:    { color: colors.t4 },
  targetImpossible:{ fontSize: font.sizes.xs, color: colors.red },
  targetRandIcon:  { fontSize: 22 },

  // ── Play phase ──────────────────────────────────────────────────────────
  playHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetBadge:   { backgroundColor: colors.blueDim, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.borderBlue, alignItems: 'center' },
  targetBadgeLbl:{ fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.5, color: colors.blue },
  targetBadgeNum:{ fontSize: 32, fontWeight: font.weights.extrabold, color: colors.t1, lineHeight: 38 },
  timerBadge:    { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  timerTxt:      { fontSize: font.sizes.xl, fontWeight: font.weights.bold, color: colors.t2, fontVariant: ['tabular-nums'] },

  hint:     { textAlign: 'center', fontSize: font.sizes.sm, color: colors.t3 },
  wrongMsg: { textAlign: 'center', fontSize: font.sizes.sm, color: colors.red, fontWeight: font.weights.semibold },

  tilesRow:   { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tile: {
    width: 72, height: 72, borderRadius: radius.md, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  tileSelected: { borderWidth: 3, transform: [{ scale: 1.08 }] },
  tileNum:  { fontSize: 26, fontWeight: font.weights.extrabold },
  tileExpr: { fontSize: 9, color: 'rgba(255,255,255,0.45)', maxWidth: 68 },

  opsRow:    { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  opBtn:     { width: 64, height: 64, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  opBtnActive:{ borderColor: colors.blue, backgroundColor: colors.blueDim },
  opTxt:     { fontSize: 28, color: colors.t4, fontWeight: font.weights.bold },
  opTxtActive:{ color: colors.blue },

  historyBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, padding: spacing.md, gap: 4 },
  historyTxt: { fontSize: font.sizes.xs, color: colors.t3, fontFamily: 'monospace' },

  actionsRow:    { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
  actionBtn:     { flex: 1, height: 46, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  actionBtnOff:  { opacity: 0.4 },
  actionBtnDanger:{ borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.07)' },
  actionTxt:     { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, color: colors.t2 },

  // ── Won / Revealed phase ────────────────────────────────────────────────
  wonEmoji:   { fontSize: 64 },
  wonTitle:   { fontSize: font.sizes.xxl, fontWeight: font.weights.extrabold, color: colors.t1, textAlign: 'center' },
  wonTime:    { fontSize: font.sizes.md, color: colors.t3 },

  revealEmoji: { fontSize: 48 },
  revealTitle: { fontSize: font.sizes.xl, fontWeight: font.weights.bold, color: colors.t1 },
  revealNote:  { fontSize: font.sizes.sm, color: colors.t3, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.md },

  solutionBox:  { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: spacing.sm, width: '100%' },
  solutionLbl:  { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.5, color: colors.t4 },
  solutionExpr: { fontSize: font.sizes.lg, fontWeight: font.weights.bold, color: colors.t1, textAlign: 'center', fontFamily: 'monospace' },
  solutionTarget:{ fontSize: font.sizes.md, color: colors.green, fontWeight: font.weights.semibold },

  endActions:        { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  endBtnSecondary:   { flex: 1, height: 50, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  endBtnSecondaryTxt:{ color: colors.t2, fontWeight: font.weights.semibold, fontSize: font.sizes.md },
  endBtnPrimary:     { flex: 1, height: 50, borderRadius: radius.full, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  endBtnPrimaryTxt:  { color: '#fff', fontWeight: font.weights.bold, fontSize: font.sizes.md },
});
