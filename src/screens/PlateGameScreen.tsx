import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Animated as RNAnimated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { extractGameNumbers, findSolution, findRandomTarget } from '../utils/plateMath';
import { fetchGame, GameType, RiddleGame, TriviaGame, WordGame } from '../api/game';

// ── Types ─────────────────────────────────────────────────────────────────────

type Op = '+' | '−' | '×' | '÷';

interface Tile {
  id: string;
  value: number;
  expr: string;
  colorIdx: number;
}

type MathPhase = 'target' | 'playing' | 'wrong' | 'won' | 'revealed';
type Mode = 'select' | 'math' | 'riddle' | 'trivia' | 'word';

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

const TILE_BG    = ['#1A3A5C', '#2D1B5C', '#0F3D2E', '#4A2800'];
const TILE_BORDER= ['#4FA3FF', '#A78BFA', '#34D399', '#FBBF24'];
const TILE_TEXT  = ['#93C5FD', '#C4B5FD', '#6EE7B7', '#FDE68A'];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  plate: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  onClose: () => void;
}

export function PlateGameScreen({ visible, plate, make, model, year, onClose }: Props) {
  const nums = extractGameNumbers(plate);
  const isJP = /[\u3040-\u30FF\u4E00-\u9FFF]/.test(plate) ||
               (make ?? '').match(/toyota|honda|nissan|mazda|subaru|mitsubishi/i) !== null;

  // ── Mode ──────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('select');

  // ── Math game state ────────────────────────────────────────────────────────
  const [mathPhase,   setMathPhase]   = useState<MathPhase>('target');
  const [target,      setTarget]      = useState(10);
  const [tiles,       setTiles]       = useState<Tile[]>([]);
  const [selected,    setSelected]    = useState<string[]>([]);
  const [history,     setHistory]     = useState<Tile[][]>([]);
  const [solution,    setSolution]    = useState<string | null>(null);
  const [elapsedSec,  setElapsedSec]  = useState(0);
  const [wrongMsg,    setWrongMsg]    = useState('');
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  // ── API game state ─────────────────────────────────────────────────────────
  const [apiLoading,  setApiLoading]  = useState(false);
  const [apiError,    setApiError]    = useState<string | null>(null);
  const [riddleGame,  setRiddleGame]  = useState<RiddleGame | null>(null);
  const [triviaGame,  setTriviaGame]  = useState<TriviaGame | null>(null);
  const [wordGame,    setWordGame]    = useState<WordGame | null>(null);

  // Riddle state
  const [riddleRevealed, setRiddleRevealed] = useState(false);
  const [hintShown,      setHintShown]      = useState(false);

  // Trivia state
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Word state
  const [hintsShown,   setHintsShown]   = useState(0); // 0,1,2,3
  const [wordAnswered, setWordAnswered] = useState(false);

  // ── Reset when modal opens ─────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setMode('select');
      resetMath();
      resetApiState();
    } else {
      stopTimer();
    }
  }, [visible]);

  function resetMath() {
    setMathPhase('target');
    setSelected([]);
    setHistory([]);
    setSolution(null);
    setElapsedSec(0);
    stopTimer();
  }

  function resetApiState() {
    setApiLoading(false);
    setApiError(null);
    setRiddleGame(null);
    setTriviaGame(null);
    setWordGame(null);
    setRiddleRevealed(false);
    setHintShown(false);
    setSelectedOption(null);
    setHintsShown(0);
    setWordAnswered(false);
  }

  // ── API game loader ─────────────────────────────────────────────────────────
  async function loadApiGame(gameType: GameType) {
    setApiLoading(true);
    setApiError(null);
    try {
      const lang = isJP ? 'ja' : 'en';
      const result = await fetchGame({ plate, make, model, year, gameType, language: lang });
      if (gameType === 'riddle') setRiddleGame(result.game as RiddleGame);
      if (gameType === 'trivia') setTriviaGame(result.game as TriviaGame);
      if (gameType === 'word')   setWordGame(result.game as WordGame);
    } catch (e: unknown) {
      const err = e as Error;
      setApiError(err.message === 'RATE_LIMIT'
        ? (isJP ? '少し待ってからもう一度試してください' : 'Please wait a moment and try again.')
        : (isJP ? 'ゲームの生成に失敗しました' : 'Failed to generate game. Check your connection.'));
    } finally {
      setApiLoading(false);
    }
  }

  function selectMode(m: Mode) {
    setMode(m);
    resetApiState();
    if (m === 'math') resetMath();
    if (m === 'riddle') loadApiGame('riddle');
    if (m === 'trivia') loadApiGame('trivia');
    if (m === 'word')   loadApiGame('word');
  }

  // ── Timer ──────────────────────────────────────────────────────────────────
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
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  // ── Math game logic ─────────────────────────────────────────────────────────
  function startMathGame(t: number) {
    const sol = findSolution(nums, t);
    if (!sol) {
      const alt = findRandomTarget(nums);
      setTarget(alt); setSolution(findSolution(nums, alt)); startGameWith(alt, nums);
    } else {
      setTarget(t); setSolution(sol); startGameWith(t, nums);
    }
  }

  function startGameWith(t: number, n: number[]) {
    setTiles(n.map((v, i) => makeTile(v, String(v), i)));
    setSelected([]); setHistory([]); setElapsedSec(0);
    setMathPhase('playing'); startTimer();
  }

  function resetGame() {
    stopTimer(); setMathPhase('target'); setSelected([]);
    setHistory([]); setSolution(null); setElapsedSec(0);
  }

  function toggleTile(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2)  return [prev[0], id];
      return [...prev, id];
    });
  }

  const applyOperator = useCallback((op: Op) => {
    if (selected.length !== 2) return;
    const [idA, idB] = selected;
    const tileA = tiles.find(t => t.id === idA)!;
    const tileB = tiles.find(t => t.id === idB)!;
    const result = applyOp(tileA.value, tileB.value, op);
    if (result === null || !isFinite(result) || isNaN(result)) { shake('Division by zero!'); return; }
    if (!isInteger(result)) { shake('Result must be a whole number!'); return; }
    const newTile = makeTile(Math.round(result), fmtExpr(tileA, tileB, op), tileA.colorIdx);
    const newTiles = [...tiles.filter(t => t.id !== idA && t.id !== idB), newTile];
    setHistory(h => [...h, tiles]); setTiles(newTiles); setSelected([]);
    if (newTiles.length === 1) {
      if (Math.abs(newTiles[0].value - target) < 1e-9) { stopTimer(); setMathPhase('won'); }
      else { shake(`Got ${newTiles[0].value}, not ${target}. Try again!`); setMathPhase('wrong'); }
    }
  }, [selected, tiles, target]);

  function undo() {
    if (history.length === 0) return;
    setTiles(history[history.length - 1]);
    setHistory(h => h.slice(0, -1)); setSelected([]);
    if (mathPhase === 'wrong') setMathPhase('playing');
  }

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

  // ── Render: Mode selection ─────────────────────────────────────────────────

  function renderModeSelect() {
    const vehicle = [make, model, year].filter(Boolean).join(' ');
    return (
      <ScrollView contentContainerStyle={styles.phaseWrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.gameTitle}>🎮 Plate Games</Text>

        <View style={styles.plateBox}>
          <Text style={styles.plateLbl}>PLATE</Text>
          <Text style={styles.plateStr}>{plate.toUpperCase()}</Text>
          {vehicle ? <Text style={styles.vehicleSub}>{vehicle}</Text> : null}
        </View>

        <Text style={styles.sectionLbl}>{isJP ? 'ゲームを選んでね' : 'Choose a game'}</Text>

        {[
          { mode: 'math'   as Mode, emoji: '🔢', title: isJP ? '数字パズル'  : 'Number Puzzle',   desc: isJP ? 'プレートの数字で10や24を作ろう'  : 'Make 10 or 24 from plate numbers', badge: isJP ? 'オフライン' : 'Offline', badgeColor: colors.green },
          { mode: 'riddle' as Mode, emoji: '🤔', title: isJP ? 'なぞなぞ'    : 'Riddle',           desc: isJP ? 'プレートをテーマになぞなぞ'        : 'A riddle themed on your plate',     badge: 'AI', badgeColor: colors.blue },
          { mode: 'trivia' as Mode, emoji: '🚗', title: isJP ? '車クイズ'    : 'Car Trivia',       desc: isJP ? 'この車についての4択クイズ'          : '4-choice quiz about this vehicle',  badge: 'AI', badgeColor: colors.blue },
          { mode: 'word'   as Mode, emoji: '💡', title: isJP ? '連想ゲーム'  : 'Word Association', desc: isJP ? 'ヒントからお題を当てよう'           : 'Guess the theme from 3 hints',      badge: 'AI', badgeColor: colors.blue },
        ].map(item => (
          <TouchableOpacity
            key={item.mode}
            style={styles.modeCard}
            onPress={() => selectMode(item.mode)}
            activeOpacity={0.78}
          >
            <Text style={styles.modeEmoji}>{item.emoji}</Text>
            <View style={styles.modeBody}>
              <View style={styles.modeTitleRow}>
                <Text style={styles.modeTitle}>{item.title}</Text>
                <View style={[styles.modeBadge, { backgroundColor: item.badgeColor + '22', borderColor: item.badgeColor + '55' }]}>
                  <Text style={[styles.modeBadgeTxt, { color: item.badgeColor }]}>{item.badge}</Text>
                </View>
              </View>
              <Text style={styles.modeDesc}>{item.desc}</Text>
            </View>
            <Text style={styles.modeArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  // ── Render: API loading / error ────────────────────────────────────────────

  function renderApiLoading() {
    return (
      <View style={[styles.phaseWrap, styles.centeredPhase]}>
        <ActivityIndicator size="large" color={colors.blue} />
        <Text style={styles.loadingTxt}>{isJP ? 'AIがゲームを作成中...' : 'AI is generating your game...'}</Text>
      </View>
    );
  }

  function renderApiError() {
    return (
      <View style={[styles.phaseWrap, styles.centeredPhase]}>
        <Text style={{ fontSize: 48 }}>⚠️</Text>
        <Text style={styles.revealTitle}>{isJP ? 'エラー' : 'Oops'}</Text>
        <Text style={styles.revealNote}>{apiError}</Text>
        <View style={styles.endActions}>
          <TouchableOpacity style={styles.endBtnSecondary} onPress={() => setMode('select')}>
            <Text style={styles.endBtnSecondaryTxt}>{isJP ? '戻る' : 'Back'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtnPrimary} onPress={() => selectMode(mode as GameType)}>
            <Text style={styles.endBtnPrimaryTxt}>{isJP ? 'もう一度' : 'Retry'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render: Riddle ─────────────────────────────────────────────────────────

  function renderRiddle() {
    if (!riddleGame) return null;
    return (
      <ScrollView contentContainerStyle={[styles.phaseWrap, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 48 }}>🤔</Text>
        <View style={styles.questionBox}>
          <Text style={styles.questionTxt}>{riddleGame.question}</Text>
        </View>

        {!riddleRevealed && (
          <View style={styles.apiActions}>
            {!hintShown && (
              <TouchableOpacity style={styles.hintBtn} onPress={() => setHintShown(true)} activeOpacity={0.8}>
                <Text style={styles.hintBtnTxt}>💡 {isJP ? 'ヒントを見る' : 'Show Hint'}</Text>
              </TouchableOpacity>
            )}
            {hintShown && (
              <View style={styles.hintBox}>
                <Text style={styles.hintLbl}>{isJP ? 'ヒント' : 'HINT'}</Text>
                <Text style={styles.hintTxt}>{riddleGame.hint}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.endBtnPrimary} onPress={() => setRiddleRevealed(true)} activeOpacity={0.8}>
              <Text style={styles.endBtnPrimaryTxt}>{isJP ? '答えを見る' : 'Reveal Answer'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {riddleRevealed && (
          <View style={[styles.solutionBox, { width: '100%' }]}>
            <Text style={styles.solutionLbl}>{isJP ? 'こたえ' : 'ANSWER'}</Text>
            <Text style={styles.solutionExpr}>{riddleGame.answer}</Text>
          </View>
        )}

        <View style={[styles.endActions, { width: '100%', marginTop: spacing.lg }]}>
          <TouchableOpacity style={styles.endBtnSecondary} onPress={() => setMode('select')}>
            <Text style={styles.endBtnSecondaryTxt}>{isJP ? '戻る' : 'Back'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtnPrimary} onPress={() => selectMode('riddle')}>
            <Text style={styles.endBtnPrimaryTxt}>{isJP ? '新しいなぞなぞ' : 'New Riddle'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Render: Trivia ─────────────────────────────────────────────────────────

  function renderTrivia() {
    if (!triviaGame) return null;
    const correct = selectedOption === triviaGame.answer;
    return (
      <ScrollView contentContainerStyle={[styles.phaseWrap, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 48 }}>🚗</Text>
        <View style={styles.questionBox}>
          <Text style={styles.questionTxt}>{triviaGame.question}</Text>
        </View>

        <View style={{ width: '100%', gap: spacing.sm }}>
          {triviaGame.options.map(opt => {
            const letter = opt[0]; // "A", "B", "C", "D"
            const isSelected = selectedOption === letter;
            const isCorrect  = selectedOption !== null && letter === triviaGame.answer;
            const isWrong    = isSelected && letter !== triviaGame.answer;
            return (
              <TouchableOpacity
                key={letter}
                style={[
                  styles.optionBtn,
                  isCorrect && styles.optionCorrect,
                  isWrong   && styles.optionWrong,
                  isSelected && !isCorrect && !isWrong && styles.optionSelected,
                ]}
                onPress={() => !selectedOption && setSelectedOption(letter)}
                disabled={selectedOption !== null}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionTxt, (isCorrect || isWrong) && { color: '#fff' }]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedOption && (
          <View style={[styles.hintBox, { width: '100%', borderColor: correct ? colors.green + '55' : colors.red + '55' }]}>
            <Text style={[styles.hintLbl, { color: correct ? colors.green : colors.red }]}>
              {correct ? (isJP ? '正解！' : 'Correct!') : (isJP ? '不正解...' : 'Incorrect...')}
            </Text>
            <Text style={styles.hintTxt}>{triviaGame.explanation}</Text>
          </View>
        )}

        {selectedOption && (
          <View style={[styles.endActions, { width: '100%' }]}>
            <TouchableOpacity style={styles.endBtnSecondary} onPress={() => setMode('select')}>
              <Text style={styles.endBtnSecondaryTxt}>{isJP ? '戻る' : 'Back'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endBtnPrimary} onPress={() => selectMode('trivia')}>
              <Text style={styles.endBtnPrimaryTxt}>{isJP ? '次の問題' : 'Next Quiz'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Render: Word association ───────────────────────────────────────────────

  function renderWord() {
    if (!wordGame) return null;
    return (
      <ScrollView contentContainerStyle={[styles.phaseWrap, { alignItems: 'center' }]} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 48 }}>💡</Text>
        <Text style={styles.wonTitle}>{isJP ? '連想ゲーム' : 'Word Association'}</Text>
        <Text style={styles.revealNote}>
          {isJP ? `ヒントからお題を当てよう（ヒントは${hintsShown}/3）` : `Guess the theme from hints (${hintsShown}/3 shown)`}
        </Text>

        <View style={{ width: '100%', gap: spacing.sm }}>
          {wordGame.hints.slice(0, hintsShown).map((hint, i) => (
            <View key={i} style={[styles.hintBox, { borderColor: colors.borderBlue }]}>
              <Text style={styles.hintLbl}>{isJP ? `ヒント ${i + 1}` : `Hint ${i + 1}`}</Text>
              <Text style={styles.hintTxt}>{hint}</Text>
            </View>
          ))}
        </View>

        {!wordAnswered && (
          <View style={[styles.apiActions, { width: '100%' }]}>
            {hintsShown < 3 && (
              <TouchableOpacity
                style={styles.hintBtn}
                onPress={() => setHintsShown(h => h + 1)}
                activeOpacity={0.8}
              >
                <Text style={styles.hintBtnTxt}>
                  {hintsShown === 0
                    ? (isJP ? '最初のヒントを見る' : 'Show First Hint')
                    : (isJP ? '次のヒントを見る' : 'Next Hint')}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.endBtnPrimary} onPress={() => setWordAnswered(true)} activeOpacity={0.8}>
              <Text style={styles.endBtnPrimaryTxt}>{isJP ? '答えを見る' : 'Reveal Answer'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {wordAnswered && (
          <View style={[styles.solutionBox, { width: '100%' }]}>
            <Text style={styles.solutionLbl}>{isJP ? 'お題' : 'ANSWER'}</Text>
            <Text style={styles.solutionExpr}>{wordGame.theme}</Text>
          </View>
        )}

        {wordAnswered && (
          <View style={[styles.endActions, { width: '100%', marginTop: spacing.lg }]}>
            <TouchableOpacity style={styles.endBtnSecondary} onPress={() => setMode('select')}>
              <Text style={styles.endBtnSecondaryTxt}>{isJP ? '戻る' : 'Back'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.endBtnPrimary} onPress={() => selectMode('word')}>
              <Text style={styles.endBtnPrimaryTxt}>{isJP ? '新しいお題' : 'New Word'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Render: Math phases ────────────────────────────────────────────────────

  function renderTargetPhase() {
    const randomTarget = findRandomTarget(nums);
    return (
      <ScrollView contentContainerStyle={styles.phaseWrap} showsVerticalScrollIndicator={false}>
        <Text style={styles.gameTitle}>🔢 {isJP ? '数字パズル' : 'Number Puzzle'}</Text>
        <View style={styles.plateBox}>
          <Text style={styles.plateLbl}>PLATE</Text>
          <Text style={styles.plateStr}>{plate.toUpperCase()}</Text>
        </View>
        <Text style={styles.sectionLbl}>{isJP ? 'このプレートの数字' : 'Numbers from this plate'}</Text>
        <View style={styles.previewRow}>
          {nums.map((n, i) => (
            <View key={i} style={[styles.previewTile, { backgroundColor: TILE_BG[i], borderColor: TILE_BORDER[i] }]}>
              <Text style={[styles.previewNum, { color: TILE_TEXT[i] }]}>{n}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.sectionLbl}>{isJP ? '目標を選んでね' : 'Choose a target'}</Text>
        <Text style={styles.targetDesc}>
          {isJP
            ? '4つの数字を +  −  ×  ÷ で組み合わせて目標を作ろう。\n全員で一緒に考えてOK！'
            : 'Use +  −  ×  ÷ with these 4 numbers to reach the target.\nEveryone can think together!'}
        </Text>
        <View style={styles.targetRow}>
          {[10, 24].map(t => {
            const solvable = findSolution(nums, t) !== null;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.targetBtn, !solvable && styles.targetBtnOff]}
                onPress={() => startMathGame(t)}
                disabled={!solvable}
                activeOpacity={0.8}
              >
                <Text style={[styles.targetNum, !solvable && styles.targetNumOff]}>{t}</Text>
                {!solvable && <Text style={styles.targetImpossible}>{isJP ? '不可能' : 'Impossible'}</Text>}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.targetBtn, styles.targetBtnRandom]} onPress={() => startMathGame(randomTarget)} activeOpacity={0.8}>
            <Text style={styles.targetRandIcon}>🎲</Text>
            <Text style={[styles.targetNum, { color: colors.yellow }]}>{randomTarget}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.backLink} onPress={() => setMode('select')}>
          <Text style={styles.backLinkTxt}>‹ {isJP ? 'ゲーム選択に戻る' : 'Back to game select'}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderPlayPhase() {
    return (
      <View style={styles.phaseWrap}>
        <View style={styles.playHeader}>
          <View style={styles.targetBadge}>
            <Text style={styles.targetBadgeLbl}>TARGET</Text>
            <Text style={styles.targetBadgeNum}>{target}</Text>
          </View>
          <View style={styles.timerBadge}>
            <Text style={styles.timerTxt}>{fmtTime(elapsedSec)}</Text>
          </View>
        </View>
        {wrongMsg
          ? <Text style={styles.wrongMsg}>{wrongMsg}</Text>
          : <Text style={styles.hint}>
              {selected.length === 0 ? (isJP ? '2つ選んでね' : 'Select two numbers') :
               selected.length === 1 ? (isJP ? 'もう1つ選んでね' : 'Select one more') :
               (isJP ? '演算子を選んでね' : 'Choose an operator')}
            </Text>
        }
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
                <Text style={[styles.tileNum, { color: isSel ? '#fff' : TILE_TEXT[tile.colorIdx % 4] }]}>{tile.value}</Text>
                {tile.expr !== String(tile.value) && (
                  <Text style={styles.tileExpr} numberOfLines={1}>{tile.expr}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </RNAnimated.View>
        <View style={styles.opsRow}>
          {(['+', '−', '×', '÷'] as Op[]).map(op => (
            <TouchableOpacity key={op} style={[styles.opBtn, canMerge && styles.opBtnActive]} onPress={() => applyOperator(op)} disabled={!canMerge} activeOpacity={0.75}>
              <Text style={[styles.opTxt, canMerge && styles.opTxtActive]}>{op}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {history.length > 0 && (
          <View style={styles.historyBox}>
            {history.map((_, i) => {
              const before = history[i];
              const after  = i + 1 < history.length ? history[i + 1] : tiles;
              const merged = after.find(t => !before.some(b => b.id === t.id));
              return merged ? <Text key={i} style={styles.historyTxt}>Step {i + 1}: {merged.expr} = {merged.value}</Text> : null;
            })}
          </View>
        )}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, history.length === 0 && styles.actionBtnOff]} onPress={undo} disabled={history.length === 0}>
            <Text style={[styles.actionTxt, history.length === 0 && { color: colors.t4 }]}>↩ {isJP ? '戻す' : 'Undo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => { stopTimer(); setMathPhase('revealed'); }}>
            <Text style={[styles.actionTxt, { color: colors.red }]}>{isJP ? '降参' : 'Give Up'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderWonPhase() {
    return (
      <View style={[styles.phaseWrap, styles.centeredPhase]}>
        <Text style={styles.wonEmoji}>🎉</Text>
        <Text style={styles.wonTitle}>{isJP ? `${target}が完成！` : `You got ${target}!`}</Text>
        <Text style={styles.wonTime}>{isJP ? `${fmtTime(elapsedSec)}で解けた！` : `Solved in ${fmtTime(elapsedSec)}`}</Text>
        {tiles[0] && (
          <View style={styles.solutionBox}>
            <Text style={styles.solutionLbl}>{isJP ? 'あなたの式' : 'YOUR SOLUTION'}</Text>
            <Text style={styles.solutionExpr}>{tiles[0].expr} = {target}</Text>
          </View>
        )}
        <View style={styles.endActions}>
          <TouchableOpacity style={styles.endBtnSecondary} onPress={resetGame}>
            <Text style={styles.endBtnSecondaryTxt}>{isJP ? 'もう一度' : 'Play Again'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtnPrimary} onPress={onClose}>
            <Text style={styles.endBtnPrimaryTxt}>{isJP ? '終わり' : 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderRevealedPhase() {
    return (
      <View style={[styles.phaseWrap, styles.centeredPhase]}>
        <Text style={styles.revealEmoji}>🔍</Text>
        <Text style={styles.revealTitle}>{isJP ? '解答例はこちら' : "Here's one solution"}</Text>
        <View style={styles.solutionBox}>
          <Text style={styles.solutionLbl}>{isJP ? '解答' : 'SOLUTION'}</Text>
          <Text style={styles.solutionExpr}>{solution ?? (isJP ? '解なし' : 'No solution found')}</Text>
          <Text style={styles.solutionTarget}>= {target}</Text>
        </View>
        <Text style={styles.revealNote}>
          {isJP ? '他の解き方を見つけた人はいる？' : 'Did anyone find a different way?'}
        </Text>
        <View style={styles.endActions}>
          <TouchableOpacity style={styles.endBtnSecondary} onPress={resetGame}>
            <Text style={styles.endBtnSecondaryTxt}>{isJP ? '別の目標で' : 'Try Another'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.endBtnPrimary} onPress={onClose}>
            <Text style={styles.endBtnPrimaryTxt}>{isJP ? '終わり' : 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Header title ───────────────────────────────────────────────────────────

  function headerTitle() {
    if (mode === 'select')  return isJP ? 'プレートゲーム' : 'Plate Games';
    if (mode === 'riddle')  return isJP ? 'なぞなぞ' : 'Riddle';
    if (mode === 'trivia')  return isJP ? '車クイズ' : 'Car Trivia';
    if (mode === 'word')    return isJP ? '連想ゲーム' : 'Word Association';
    if (mathPhase === 'won')      return isJP ? 'やった！' : 'Well done!';
    if (mathPhase === 'revealed') return isJP ? '答え' : 'Answer';
    if (mathPhase === 'target')   return isJP ? '数字パズル' : 'Number Puzzle';
    return isJP ? `${target}を作ろう` : `Make ${target}`;
  }

  // ── Modal shell ───────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle()}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Mode select */}
        {mode === 'select' && renderModeSelect()}

        {/* API games */}
        {(mode === 'riddle' || mode === 'trivia' || mode === 'word') && apiLoading && renderApiLoading()}
        {(mode === 'riddle' || mode === 'trivia' || mode === 'word') && !apiLoading && apiError && renderApiError()}
        {mode === 'riddle' && !apiLoading && !apiError && riddleGame && renderRiddle()}
        {mode === 'trivia' && !apiLoading && !apiError && triviaGame && renderTrivia()}
        {mode === 'word'   && !apiLoading && !apiError && wordGame   && renderWord()}

        {/* Math game */}
        {mode === 'math' && mathPhase === 'target'                        && renderTargetPhase()}
        {mode === 'math' && (mathPhase === 'playing' || mathPhase === 'wrong') && renderPlayPhase()}
        {mode === 'math' && mathPhase === 'won'                           && renderWonPhase()}
        {mode === 'math' && mathPhase === 'revealed'                      && renderRevealedPhase()}
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

  // ── Mode select ─────────────────────────────────────────────────────────
  gameTitle:  { fontSize: font.sizes.xxl, fontWeight: font.weights.extrabold, color: colors.t1, textAlign: 'center' },
  plateBox:   { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  plateLbl:   { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.5, color: colors.t4, marginBottom: 4 },
  plateStr:   { fontSize: font.sizes.xl, fontWeight: font.weights.extrabold, color: colors.t1, letterSpacing: 2 },
  vehicleSub: { fontSize: font.sizes.sm, color: colors.t4, marginTop: 4 },
  sectionLbl: { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.t3 },

  modeCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: spacing.md,
  },
  modeEmoji:    { fontSize: 32 },
  modeBody:     { flex: 1, gap: 3 },
  modeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  modeTitle:    { fontSize: font.sizes.md, fontWeight: font.weights.bold, color: colors.t1 },
  modeBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full, borderWidth: 1 },
  modeBadgeTxt: { fontSize: 10, fontWeight: font.weights.bold, letterSpacing: 0.5 },
  modeDesc:     { fontSize: font.sizes.xs, color: colors.t4, lineHeight: 16 },
  modeArrow:    { fontSize: 22, color: colors.t4 },

  backLink:    { alignItems: 'center', paddingVertical: spacing.sm },
  backLinkTxt: { fontSize: font.sizes.sm, color: colors.blue },

  // ── API loading ─────────────────────────────────────────────────────────
  loadingTxt: { fontSize: font.sizes.md, color: colors.t3, textAlign: 'center', marginTop: spacing.md },

  // ── Question / hint ─────────────────────────────────────────────────────
  questionBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, width: '100%' },
  questionTxt: { fontSize: font.sizes.lg, color: colors.t1, lineHeight: 28, textAlign: 'center', fontWeight: font.weights.semibold },
  hintBox:     { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, width: '100%' },
  hintLbl:     { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1, color: colors.t4, marginBottom: 4 },
  hintTxt:     { fontSize: font.sizes.md, color: colors.t2, lineHeight: 22 },
  hintBtn:     { height: 46, borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderBlue, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueDim, width: '100%' },
  hintBtnTxt:  { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, color: colors.blue },
  apiActions:  { width: '100%', gap: spacing.sm },

  // ── Trivia options ───────────────────────────────────────────────────────
  optionBtn:     { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  optionSelected:{ borderColor: colors.blue, backgroundColor: colors.blueDim },
  optionCorrect: { borderColor: colors.green, backgroundColor: colors.green },
  optionWrong:   { borderColor: colors.red,   backgroundColor: colors.red },
  optionTxt:     { fontSize: font.sizes.md, color: colors.t1, lineHeight: 22 },

  // ── Target phase ────────────────────────────────────────────────────────
  targetDesc: { fontSize: font.sizes.sm, color: colors.t3, lineHeight: 20, textAlign: 'center' },
  previewRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  previewTile:{ width: 60, height: 60, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  previewNum: { fontSize: font.sizes.xl, fontWeight: font.weights.extrabold },
  targetRow:  { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  targetBtn:  { flex: 1, height: 90, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderBlue, gap: 4 },
  targetBtnOff:    { borderColor: colors.border, opacity: 0.5 },
  targetBtnRandom: { borderColor: 'rgba(252,211,77,0.4)', backgroundColor: 'rgba(252,211,77,0.07)' },
  targetNum:       { fontSize: 30, fontWeight: font.weights.extrabold, color: colors.blue },
  targetNumOff:    { color: colors.t4 },
  targetImpossible:{ fontSize: font.sizes.xs, color: colors.red },
  targetRandIcon:  { fontSize: 22 },

  // ── Play phase ───────────────────────────────────────────────────────────
  playHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  targetBadge:   { backgroundColor: colors.blueDim, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.borderBlue, alignItems: 'center' },
  targetBadgeLbl:{ fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.5, color: colors.blue },
  targetBadgeNum:{ fontSize: 32, fontWeight: font.weights.extrabold, color: colors.t1, lineHeight: 38 },
  timerBadge:    { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  timerTxt:      { fontSize: font.sizes.xl, fontWeight: font.weights.bold, color: colors.t2 },
  hint:     { textAlign: 'center', fontSize: font.sizes.sm, color: colors.t3 },
  wrongMsg: { textAlign: 'center', fontSize: font.sizes.sm, color: colors.red, fontWeight: font.weights.semibold },
  tilesRow:   { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  tile:       { width: 72, height: 72, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tileSelected:{ borderWidth: 3, transform: [{ scale: 1.08 }] },
  tileNum:    { fontSize: 26, fontWeight: font.weights.extrabold },
  tileExpr:   { fontSize: 9, color: 'rgba(255,255,255,0.45)', maxWidth: 68 },
  opsRow:     { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  opBtn:      { width: 64, height: 64, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  opBtnActive:{ borderColor: colors.blue, backgroundColor: colors.blueDim },
  opTxt:      { fontSize: 28, color: colors.t4, fontWeight: font.weights.bold },
  opTxtActive:{ color: colors.blue },
  historyBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.md, padding: spacing.md, gap: 4 },
  historyTxt: { fontSize: font.sizes.xs, color: colors.t3, fontFamily: 'monospace' },
  actionsRow:     { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
  actionBtn:      { flex: 1, height: 46, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  actionBtnOff:   { opacity: 0.4 },
  actionBtnDanger:{ borderColor: 'rgba(248,113,113,0.3)', backgroundColor: 'rgba(248,113,113,0.07)' },
  actionTxt:      { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, color: colors.t2 },

  // ── Won / Revealed ──────────────────────────────────────────────────────
  wonEmoji:   { fontSize: 64 },
  wonTitle:   { fontSize: font.sizes.xxl, fontWeight: font.weights.extrabold, color: colors.t1, textAlign: 'center' },
  wonTime:    { fontSize: font.sizes.md, color: colors.t3 },
  revealEmoji:{ fontSize: 48 },
  revealTitle:{ fontSize: font.sizes.xl, fontWeight: font.weights.bold, color: colors.t1 },
  revealNote: { fontSize: font.sizes.sm, color: colors.t3, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.md },
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
