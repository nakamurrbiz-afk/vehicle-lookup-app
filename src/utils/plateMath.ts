// ── Digit extraction ─────────────────────────────────────────────────────────

/**
 * Plate string → 4 game numbers (1-9).
 * Digits: used as-is (0 → 9 to keep games interesting).
 * Letters: position in alphabet mod 9, 1-indexed (A=1 … I=9, J=1 …).
 */
export function extractGameNumbers(plate: string): number[] {
  const cleaned = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const nums: number[] = [];

  for (const ch of cleaned) {
    if (nums.length >= 4) break;
    if (/\d/.test(ch)) {
      const d = parseInt(ch, 10);
      nums.push(d === 0 ? 9 : d);
    } else {
      nums.push(((ch.charCodeAt(0) - 65) % 9) + 1);
    }
  }

  // Pad to 4 if the plate was very short
  while (nums.length < 4) nums.push(nums[nums.length - 1] ?? 3);
  return nums.slice(0, 4);
}

// ── Solver ───────────────────────────────────────────────────────────────────

interface Expr { val: number; str: string; }

function solveR(items: Expr[], target: number): string | null {
  if (items.length === 1) {
    return Math.abs(items[0].val - target) < 1e-9 ? items[0].str : null;
  }

  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const a = items[i];
      const b = items[j];
      const rest = items.filter((_, k) => k !== i && k !== j);

      const ops: Expr[] = [
        { val: a.val + b.val, str: `(${a.str}+${b.str})` },
        { val: a.val - b.val, str: `(${a.str}-${b.str})` },
        { val: a.val * b.val, str: `(${a.str}×${b.str})` },
      ];
      if (Math.abs(b.val) > 1e-9)
        ops.push({ val: a.val / b.val, str: `(${a.str}÷${b.str})` });

      for (const op of ops) {
        if (!isFinite(op.val) || isNaN(op.val)) continue;
        const result = solveR([op, ...rest], target);
        if (result !== null) return result;
      }
    }
  }
  return null;
}

/** Returns a solution expression string, or null if impossible. */
export function findSolution(nums: number[], target: number): string | null {
  return solveR(nums.map(n => ({ val: n, str: String(n) })), target);
}

/** Pick a random achievable target from a curated list. */
export function findRandomTarget(nums: number[]): number {
  const POOL = [10, 12, 15, 20, 24, 30, 36, 48];
  const shuffled = [...POOL].sort(() => Math.random() - 0.5);
  for (const t of shuffled) {
    if (findSolution(nums, t) !== null) return t;
  }
  return 10; // fallback (may be unsolvable – caller should handle)
}
