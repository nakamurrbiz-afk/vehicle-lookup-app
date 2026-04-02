import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_URL in .env.local (dev) or EAS dashboard (production)
const ENV_URL = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL = ENV_URL
  ? ENV_URL
  : Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'http://192.168.3.7:3000';

/**
 * Build a server-side click-tracking redirect URL.
 * The API logs the event then 302s to the real destination.
 */
export function buildTrackUrl(
  listingId: string,
  dest:      string,
  plate:     string,
  country:   string,
): string {
  const p = new URLSearchParams({ lid: listingId, dest, plate, country });
  return `${API_BASE_URL}/v1/track/click?${p.toString()}`;
}

export interface MileageRecord { date: string; mileage: number; passed: boolean; }
export interface RunningCost { fuelPerYear: string; totalPerYear: string; perMile: string; source: string; }
export interface InsuranceGroup { min: number; max: number; label: string; }

export interface VehicleResult {
  plate: string; country: string;
  make: string | null; model: string | null; year: number | null;
  colour: string | null; fuelType: string | null;
  vin: string | null; engineSize: number | null;
  co2Emissions: number | null;
  mileageHistory: MileageRecord[];
  commonFailures: string[];
  runningCost: RunningCost | null;
  euroncapStars: number | null;
  insuranceGroup: InsuranceGroup | null;
  popularityCount: number;
  source: string; cachedAt: string | null;
  affiliateLinks: { platform: string; label: string; url: string }[];
  // US-specific
  recallCount: number | null;
  nhtsaSafetyRating: number | null;
  mpgCity: number | null;
  mpgHighway: number | null;
}


export interface ApiError { status: number; title: string; detail: string; }

export type LookupResult =
  | { ok: true;  data:  VehicleResult }
  | { ok: false; error: ApiError };

export async function lookupVehicle(plate: string, country: string, state?: string): Promise<LookupResult> {
  const p = new URLSearchParams({ plate, country });
  if (state) p.set('state', state);
  const url = `${API_BASE_URL}/v1/lookup?${p}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await res.json();
  return res.ok ? { ok: true, data: body } : { ok: false, error: body };
}

export interface CarImage { url: string; alt: string; source: string; }
export interface ListingLink {
  id: string; site: string; flag: string;
  url: string; affiliateUrl: string | null;
  cta: string; color: string; minPrice: string | null;
}
export interface PriceSummary {
  new:  { from: string; to: string; note?: string; source: string } | null;
  used: { from: string; source: string } | null;
}
export interface MediaResult { images: CarImage[]; listings: ListingLink[]; prices: PriceSummary; }

export async function fetchVehicleMedia(
  make: string,
  model: string | null,
  year: number | null,
  country: string,
  postcode?: string,
): Promise<MediaResult | null> {
  const p = new URLSearchParams({ make, country });
  if (model)    p.set('model',    model);
  if (year)     p.set('year',     String(year));
  if (postcode) p.set('postcode', postcode);
  try {
    const res = await fetch(`${API_BASE_URL}/v1/vehicle-media?${p}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
