// For Expo Go on your phone: use your PC's local IP (e.g. http://192.168.1.x:3000)
// For Android emulator: http://10.0.2.2:3000
// For iOS simulator: http://localhost:3000
export const API_BASE_URL = 'http://localhost:3000';

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
}

export interface ApiError { status: number; title: string; detail: string; }

export type LookupResult =
  | { ok: true;  data:  VehicleResult }
  | { ok: false; error: ApiError };

export async function lookupVehicle(plate: string, country: string): Promise<LookupResult> {
  const url = `${API_BASE_URL}/v1/lookup?plate=${encodeURIComponent(plate)}&country=${encodeURIComponent(country)}`;
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
export interface MediaResult { image: CarImage; listings: ListingLink[]; prices: PriceSummary; }

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
