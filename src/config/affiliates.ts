// ── Amazon Associates ─────────────────────────────────────────────────────────
// アソシエイトIDは日本（JP）のみ保有。
// 他国ユーザーは適切な地域のAmazonへタグなしでリンクする。

const AMAZON_DOMAINS: Record<string, string> = {
  GB: 'www.amazon.co.uk',
  US: 'www.amazon.com',
  JP: 'www.amazon.co.jp',
  NL: 'www.amazon.nl',
  DE: 'www.amazon.de',
  FR: 'www.amazon.fr',
};

const AMAZON_JP_TAG = process.env.EXPO_PUBLIC_AMAZON_JP_TAG;

export function buildAmazonUrl(query: string, country: string): string {
  const domain = AMAZON_DOMAINS[country] ?? 'www.amazon.com';
  const params = new URLSearchParams({ k: query, i: 'automotive' });
  if (country === 'JP' && AMAZON_JP_TAG) params.set('tag', AMAZON_JP_TAG);
  return `https://${domain}/s?${params}`;
}

// ── eBay Partner Network ──────────────────────────────────────────────────────
// campidはグローバル共通。サイトIDのみ国別に切り替える。

const EBAY_CAMPID = process.env.EXPO_PUBLIC_EBAY_CAMPID ?? '';

// { domain, mkrid, siteid } — EPN tracking params per country
const EBAY_SITES: Record<string, { domain: string; mkrid: string; siteid: string }> = {
  GB: { domain: 'www.ebay.co.uk',  mkrid: '710-53481-19255-0', siteid: '3'   },
  US: { domain: 'www.ebay.com',    mkrid: '711-53200-19255-0', siteid: '0'   },
  DE: { domain: 'www.ebay.de',     mkrid: '707-53477-19255-0', siteid: '77'  },
  FR: { domain: 'www.ebay.fr',     mkrid: '709-53476-19255-0', siteid: '71'  },
  IT: { domain: 'www.ebay.it',     mkrid: '724-53478-19255-0', siteid: '101' },
  AU: { domain: 'www.ebay.com.au', mkrid: '705-53470-19255-0', siteid: '15'  },
};
const EBAY_DEFAULT = EBAY_SITES['US'];

export function buildEbayUrl(query: string, country: string): string {
  const site = EBAY_SITES[country] ?? EBAY_DEFAULT;
  const searchUrl = `https://${site.domain}/sch/i.html?` + new URLSearchParams({ _nkw: query });
  const params = new URLSearchParams({
    campid:   EBAY_CAMPID,
    toolid:   '10001',
    mkevt:    '1',
    mkcid:    '1',
    mkrid:    site.mkrid,
    siteid:   site.siteid,
    customid: '',
  });
  return `${searchUrl}&${params}`;
}

// ── Rakuten via もしもアフィリエイト ──────────────────────────────────────────

const MOSHIMO_A_ID  = process.env.EXPO_PUBLIC_MOSHIMO_A_ID  ?? '';
const MOSHIMO_P_ID  = process.env.EXPO_PUBLIC_MOSHIMO_P_ID  ?? '30';
const MOSHIMO_PC_ID = process.env.EXPO_PUBLIC_MOSHIMO_PC_ID ?? '663';
const MOSHIMO_PL_ID = process.env.EXPO_PUBLIC_MOSHIMO_PL_ID ?? '2532';

export function buildRakutenUrl(query: string): string {
  const rakutenSearch = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(query)}/`;
  const params = new URLSearchParams({
    a_id:  MOSHIMO_A_ID,
    p_id:  MOSHIMO_P_ID,
    pc_id: MOSHIMO_PC_ID,
    pl_id: MOSHIMO_PL_ID,
    url:   rakutenSearch,
  });
  return `https://af.moshimo.com/af/c/click?${params}`;
}

// ── Platform availability per country ────────────────────────────────────────

export type Platform = 'amazon' | 'ebay' | 'rakuten';

export function getAvailablePlatforms(country: string): Platform[] {
  if (country === 'JP') return ['amazon', 'rakuten'];
  if (country in EBAY_SITES) return ['amazon', 'ebay'];
  return ['amazon', 'ebay']; // US fallback
}
