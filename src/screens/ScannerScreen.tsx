import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withTiming, withRepeat, withSequence,
} from 'react-native-reanimated';
import { colors, spacing, radius, font } from '../theme';

// ── Plate regex patterns per country ────────────────────────────────────────

const PLATE_PATTERNS: Record<string, RegExp> = {
  GB: /^[A-Z]{2}\d{2}\s?[A-Z]{3}$/,           // AB12 CDE
  US: /^[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{3,4}$/,   // 1ABC234 / ABC-1234
  NL: /^[A-Z0-9]{2}-[A-Z0-9]{2,3}-[A-Z0-9]{2}$/, // 12-ABC-3
  JP: /^[A-Z\u3040-\u30FF\u4E00-\u9FFF]{1,4}\s?\d{1,4}$/,
};
const GENERIC_PATTERN = /^[A-Z0-9]{5,8}$/;

const CONFIDENCE_THRESHOLD = 3; // 同じプレートを3回検出したら確定

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  country: string;
  onDetected: (plate: string) => void;
  onClose: () => void;
}

interface DetectedPlate {
  text: string;
  count: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ScannerScreen({ visible, country, onDetected, onClose }: Props) {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const isProcessing = useRef(false);
  const counts = useRef<Record<string, number>>({});

  const [confirmed, setConfirmed] = useState<DetectedPlate | null>(null);
  const [active, setActive] = useState(true);

  const frameOpacity  = useSharedValue(1);
  const frameColor    = useSharedValue(0); // 0 = white, 1 = green

  // リセット（Modalが開くたびにリセット）
  useEffect(() => {
    if (visible) {
      setConfirmed(null);
      setActive(true);
      counts.current = {};
      frameColor.value = withTiming(0);
      frameOpacity.value = 1;
    }
  }, [visible]);

  // パーミッション要求
  useEffect(() => {
    if (visible && !hasPermission) requestPermission();
  }, [visible, hasPermission]);

  // 検出確定時のパルスアニメーション
  useEffect(() => {
    if (confirmed) {
      frameColor.value = withTiming(1, { duration: 200 });
      frameOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 500 }),
          withTiming(1.0, { duration: 500 }),
        ),
        -1, true,
      );
    }
  }, [!!confirmed]);

  // ── スナップショット撮影→OCR処理ループ ───────────────────────────────────

  const processFrame = useCallback(async () => {
    if (!isProcessing.current && cameraRef.current && active) {
      isProcessing.current = true;
      try {
        const snapshot = await cameraRef.current.takeSnapshot({ quality: 60, skipMetadata: true });
        const result = await TextRecognition.recognize('file://' + snapshot.path);

        const pattern = PLATE_PATTERNS[country] ?? GENERIC_PATTERN;
        const found: string[] = [];

        for (const block of result.blocks) {
          for (const line of block.lines) {
            const raw = line.text.toUpperCase().replace(/[^A-Z0-9\s\-]/g, '').trim();
            // スペースなし版でもマッチできるよう両方試す
            if (pattern.test(raw) || pattern.test(raw.replace(/\s/g, ''))) {
              const normalized = raw.replace(/\s+/g, ' ').trim();
              found.push(normalized);
            }
          }
        }

        // 検出カウントを更新
        for (const plate of found) {
          counts.current[plate] = (counts.current[plate] ?? 0) + 1;
          if (counts.current[plate] >= CONFIDENCE_THRESHOLD && active) {
            setConfirmed({ text: plate, count: counts.current[plate] });
            setActive(false);
            return;
          }
        }

        // 今回検出されなかったプレートのカウントを減衰
        for (const key of Object.keys(counts.current)) {
          if (!found.includes(key)) {
            counts.current[key] = Math.max(0, counts.current[key] - 1);
          }
        }
      } catch {
        // スナップ失敗は無視
      } finally {
        isProcessing.current = false;
      }
    }
  }, [country, active]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(processFrame, 650);
    return () => clearInterval(id);
  }, [processFrame, visible]);

  // ── Animated styles ──────────────────────────────────────────────────────

  const frameStyle = useAnimatedStyle(() => ({
    opacity: frameOpacity.value,
    borderColor: frameColor.value === 1
      ? colors.green
      : 'rgba(255,255,255,0.7)',
    borderWidth: frameColor.value === 1 ? 3 : 2,
  }));

  const cornerStyle = useAnimatedStyle(() => ({
    borderColor: frameColor.value === 1 ? colors.green : '#fff',
  }));

  // ── Render helpers ───────────────────────────────────────────────────────

  function renderPermissionScreen() {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permDesc}>
          Ban-go needs your camera to scan license plates automatically.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnTxt}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeTextBtn} onPress={onClose}>
          <Text style={styles.closeTextTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderNoDevice() {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.blue} size="large" />
        <Text style={styles.permDesc}>Starting camera…</Text>
      </View>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>

        {!hasPermission ? renderPermissionScreen()
          : !device    ? renderNoDevice()
          : (<>
              {/* カメラ */}
              <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={visible && active}
                photo
              />

              {/* 暗幕オーバーレイ（中央くり抜き） */}
              <View style={styles.overlay} pointerEvents="none">
                <View style={styles.maskTop} />
                <View style={styles.maskRow}>
                  <View style={styles.maskSide} />
                  <Animated.View style={[styles.scanFrame, frameStyle]} />
                  <View style={styles.maskSide} />
                </View>
                <View style={styles.maskBottom} />
              </View>

              {/* 四隅コーナー */}
              <View style={styles.cornersWrap} pointerEvents="none">
                {(['TL','TR','BL','BR'] as const).map(pos => (
                  <Animated.View
                    key={pos}
                    style={[styles.corner, styles[`corner${pos}`], cornerStyle]}
                  />
                ))}
              </View>

              {/* ヘッダー */}
              <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                  <Text style={styles.closeBtnTxt}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.hintTxt}>
                  {confirmed ? 'Plate detected!' : 'Point at a license plate'}
                </Text>
                <View style={{ width: 44 }} />
              </SafeAreaView>

              {/* フッター（検出カード） */}
              <SafeAreaView style={styles.footer} edges={['bottom']}>
                {confirmed ? (
                  <View style={styles.detectedCard}>
                    <Text style={styles.detectedLabel}>DETECTED PLATE</Text>
                    <Text style={styles.detectedPlate}>{confirmed.text}</Text>
                    <View style={styles.detectedActions}>
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => {
                          setConfirmed(null);
                          counts.current = {};
                          setActive(true);
                          frameColor.value = withTiming(0);
                          frameOpacity.value = 1;
                        }}
                      >
                        <Text style={styles.retryTxt}>Retry</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.confirmBtn}
                        onPress={() => onDetected(confirmed.text)}
                      >
                        <Text style={styles.confirmTxt}>Search This Plate</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.scanningPill}>
                    <ActivityIndicator color={colors.blue} size="small" />
                    <Text style={styles.scanningTxt}>Scanning for plates…</Text>
                  </View>
                )}
              </SafeAreaView>
            </>)
        }
      </View>
    </Modal>
  );
}

// ── Layout constants ─────────────────────────────────────────────────────────

const { width: W, height: H } = Dimensions.get('window');
const FRAME_W = Math.round(W * 0.80);
const FRAME_H = Math.round(FRAME_W * 0.26); // ナンバープレートの縦横比
const FRAME_TOP = Math.round((H - FRAME_H) / 2) - 40;

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // Permission / loading
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, padding: spacing.xl, backgroundColor: colors.bg,
  },
  permTitle: { fontSize: font.sizes.xl, fontWeight: font.weights.bold, color: colors.t1, textAlign: 'center' },
  permDesc:  { fontSize: font.sizes.sm, color: colors.t3, textAlign: 'center', lineHeight: 20 },
  permBtn:   { backgroundColor: colors.blue, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full, marginTop: spacing.sm },
  permBtnTxt: { color: '#fff', fontWeight: font.weights.bold, fontSize: font.sizes.md },
  closeTextBtn: { marginTop: spacing.xs },
  closeTextTxt: { color: colors.t3, fontSize: font.sizes.sm },

  // Overlay mask
  overlay:    { ...StyleSheet.absoluteFillObject },
  maskTop:    { height: FRAME_TOP, backgroundColor: 'rgba(0,0,0,0.60)' },
  maskRow:    { flexDirection: 'row', height: FRAME_H },
  maskSide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)' },
  maskBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)' },
  scanFrame:  { width: FRAME_W, height: FRAME_H, borderRadius: 8 },

  // Corners
  cornersWrap: {
    position: 'absolute',
    top: FRAME_TOP - 2,
    left: (W - FRAME_W) / 2 - 2,
    width: FRAME_W + 4,
    height: FRAME_H + 4,
  },
  corner: {
    position: 'absolute',
    width: 22, height: 22,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 8 },

  // Header
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  closeBtnTxt: { color: '#fff', fontSize: 16, fontWeight: font.weights.bold },
  hintTxt: {
    color: '#fff', fontSize: font.sizes.sm, fontWeight: font.weights.semibold,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },

  // Footer
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md },
  scanningPill: {
    flexDirection: 'row', gap: spacing.sm,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: radius.full, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  scanningTxt: { color: colors.t3, fontSize: font.sizes.sm },

  // Detected card
  detectedCard: {
    backgroundColor: 'rgba(7,12,26,0.96)',
    borderRadius: radius.xl, padding: spacing.lg,
    borderWidth: 2, borderColor: colors.green,
    gap: spacing.md,
    shadowColor: colors.green, shadowOpacity: 0.35,
    shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  detectedLabel: {
    fontSize: font.sizes.xs, fontWeight: font.weights.bold,
    letterSpacing: 1.8, color: colors.green,
  },
  detectedPlate: {
    fontSize: 40, fontWeight: font.weights.extrabold,
    color: colors.t1, letterSpacing: 3,
  },
  detectedActions: { flexDirection: 'row', gap: spacing.sm },
  retryBtn: {
    flex: 1, height: 50, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  retryTxt: { color: colors.t2, fontWeight: font.weights.semibold, fontSize: font.sizes.md },
  confirmBtn: {
    flex: 2, height: 50, borderRadius: radius.full,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.blue,
    shadowColor: colors.blue, shadowOpacity: 0.45,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  confirmTxt: { color: '#fff', fontWeight: font.weights.bold, fontSize: font.sizes.md },
});
