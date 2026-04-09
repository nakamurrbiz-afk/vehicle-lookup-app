export interface AccessoryCategory {
  id: string;
  emoji: string;
  labelEn: string;
  labelJa: string;
  /** When true, make + model (+ year) are prepended to the search query */
  modelSpecific: boolean;
  /** Primary English search term */
  termEn: string;
  /** Primary Japanese search term */
  termJa: string;
}

export const ACCESSORY_CATEGORIES: AccessoryCategory[] = [
  // ── Model-specific (fit/size depends on vehicle) ─────────────────────────
  {
    id: 'floor-mats',
    emoji: '🧩',
    labelEn: 'Floor Mats',
    labelJa: 'フロアマット',
    modelSpecific: true,
    termEn: 'floor mats',
    termJa: 'フロアマット',
  },
  {
    id: 'boot-liner',
    emoji: '📦',
    labelEn: 'Boot Liner',
    labelJa: 'ラゲッジマット',
    modelSpecific: true,
    termEn: 'boot liner trunk mat',
    termJa: 'ラゲッジマット トランクマット',
  },
  {
    id: 'seat-covers',
    emoji: '🪑',
    labelEn: 'Seat Covers',
    labelJa: 'シートカバー',
    modelSpecific: true,
    termEn: 'seat covers',
    termJa: 'シートカバー',
  },
  {
    id: 'car-cover',
    emoji: '🏕️',
    labelEn: 'Car Cover',
    labelJa: 'カーカバー',
    modelSpecific: true,
    termEn: 'waterproof car cover',
    termJa: 'カーカバー ボディカバー',
  },
  {
    id: 'air-filter',
    emoji: '💨',
    labelEn: 'Air Filter',
    labelJa: 'エアフィルター',
    modelSpecific: true,
    termEn: 'air filter',
    termJa: 'エアフィルター エアクリーナー',
  },
  // ── Universal (not vehicle-specific) ────────────────────────────────────
  {
    id: 'dash-cam',
    emoji: '📷',
    labelEn: 'Dash Cam',
    labelJa: 'ドラレコ',
    modelSpecific: false,
    termEn: 'dash cam 4K GPS',
    termJa: 'ドライブレコーダー 前後 4K',
  },
  {
    id: 'phone-mount',
    emoji: '📱',
    labelEn: 'Phone Mount',
    labelJa: 'スマホホルダー',
    modelSpecific: false,
    termEn: 'car phone holder mount wireless charging',
    termJa: 'スマホホルダー 車載 ワイヤレス充電',
  },
  {
    id: 'jump-starter',
    emoji: '⚡',
    labelEn: 'Jump Starter',
    labelJa: 'ジャンプスターター',
    modelSpecific: false,
    termEn: 'portable jump starter power bank',
    termJa: 'ジャンプスターター モバイルバッテリー',
  },
  {
    id: 'usb-charger',
    emoji: '🔌',
    labelEn: 'USB Charger',
    labelJa: 'カーチャージャー',
    modelSpecific: false,
    termEn: 'car USB charger fast charge',
    termJa: 'カーチャージャー USB 急速充電',
  },
  {
    id: 'wax-polish',
    emoji: '✨',
    labelEn: 'Wax & Polish',
    labelJa: 'ワックス・洗車',
    modelSpecific: false,
    termEn: 'car wax polish ceramic coating',
    termJa: 'カーワックス コーティング 洗車',
  },
  {
    id: 'tyre-inflator',
    emoji: '🔄',
    labelEn: 'Tyre Inflator',
    labelJa: 'タイヤ空気入れ',
    modelSpecific: false,
    termEn: 'portable tyre inflator air pump',
    termJa: 'タイヤ 空気入れ 電動 コンパクト',
  },
  {
    id: 'sunshade',
    emoji: '☀️',
    labelEn: 'Sun Shade',
    labelJa: 'サンシェード',
    modelSpecific: false,
    termEn: 'car windscreen sunshade',
    termJa: 'サンシェード 車 フロント',
  },
];

// ── Query builder ─────────────────────────────────────────────────────────────

interface Vehicle {
  make: string | null;
  model: string | null;
  year: number | null;
}

/**
 * Build a search query string for a given category and vehicle.
 * Returns both English and Japanese variants.
 */
export function buildSearchQuery(
  cat: AccessoryCategory,
  vehicle: Vehicle,
  country: string,
): { en: string; ja: string } {
  const isJP = country === 'JP';

  if (cat.modelSpecific && vehicle.make) {
    const vehicleParts = [vehicle.make];
    if (vehicle.model) vehicleParts.push(vehicle.model);
    // Include year only for parts (where year matters), skip for covers/mats
    if (vehicle.year && ['air-filter'].includes(cat.id)) {
      vehicleParts.push(String(vehicle.year));
    }
    return {
      en: `${vehicleParts.join(' ')} ${cat.termEn}`,
      ja: `${vehicle.make}${vehicle.model ? ' ' + vehicle.model : ''} ${cat.termJa}`,
    };
  }

  return {
    en: cat.termEn,
    ja: cat.termJa,
  };
}
