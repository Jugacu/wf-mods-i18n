import Items from '@wfcd/items';
import { writeFileSync } from 'fs';

const LOCALES = ['de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt', 'ru', 'th', 'tr', 'uk', 'zh'];
const CDN = 'https://cdn.warframestat.us/img/';

const LOCALE_LABELS = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  ja: '日本語', ko: '한국어', pl: 'Polski', pt: 'Português', ru: 'Русский',
  th: 'ภาษาไทย', tr: 'Türkçe', uk: 'Українська', zh: '中文',
};

console.log('Loading mods…');
const items = new Items({ category: ['Mods'], i18n: LOCALES, i18nOnObject: true });

const mods = [];
const searchIndex = [];

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const id = i;

  const cleanStat = s => s.replace(/<LINE_SEPARATOR>/g, ' / ').replace(/<[^>]+>/g, '');

  const mod = {
    id,
    uniqueName: item.uniqueName,
    name: item.name,
    description: item.description || '',
    type: item.uniqueName?.includes('/Mods/Aura/') ? 'Aura Mod' : (item.type || ''),
    compatName: item.compatName || '',
    polarity: item.polarity === 'aura' ? 'universal' : (item.polarity || ''),
    rarity: item.rarity || '',
    baseDrain: item.baseDrain ?? null,
    fusionLimit: item.fusionLimit ?? null,
    imageName: item.imageName || null,
    wikiaUrl: item.wikiaUrl || null,
    tradable: item.tradable || false,
    drops: item.drops || [],
    maxRankStats: (item.levelStats?.at(-1)?.stats || []).map(cleanStat),
    introduced: item.introduced ? { name: item.introduced.name, date: item.introduced.date } : null,
    i18n: {},
  };

  // English goes in search index
  if (item.name) {
    searchIndex.push({ id, locale: 'en', name: item.name.toLowerCase() });
  }

  // Per-locale data
  if (item.i18n) {
    for (const locale of LOCALES) {
      const t = item.i18n[locale];
      if (!t) continue;
      mod.i18n[locale] = {};
      if (t.name) {
        mod.i18n[locale].name = t.name;
        searchIndex.push({ id, locale, name: t.name.toLowerCase() });
      }
      if (t.description) mod.i18n[locale].description = t.description;
    }
  }

  mods.push(mod);
}

console.log(`Loaded ${mods.length} mods, ${searchIndex.length} search entries.`);

// Deduplicate polarity / rarity for filters
const polarities = [...new Set(mods.map(m => m.polarity).filter(Boolean))].sort();
const rarities = [...new Set(mods.map(m => m.rarity).filter(Boolean))].sort();
const types = [...new Set(mods.map(m => m.type).filter(Boolean))].sort();

const DATA = { mods, searchIndex, polarities, rarities, types, locales: ['en', ...LOCALES], localeLabels: LOCALE_LABELS };
const dataJson = JSON.stringify(DATA);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Warframe Mods Browser</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #07090e;
    --surface: #0f1520;
    --surface2: #141c2c;
    --surface3: #1a2540;
    --border: #1e2d45;

    --gold: #c8a84b;
    --gold-bright: #eed96a;
    --gold-dim: #6b5a28;
    --gold-glow: rgba(200,168,75,.28);

    --energy: #4dc8ff;
    --energy-dim: #1a4460;
    --energy-glow: rgba(77,200,255,.2);

    --text: #dce3f0;
    --text-dim: #8fa5c0;
    --muted: #4e6178;

    --r-common: #8a9ab0;      --r-common-glow: rgba(138,154,176,.18);
    --r-uncommon: #6ab0e0;    --r-uncommon-glow: rgba(106,176,224,.22);
    --r-rare: #c8a84b;        --r-rare-glow: rgba(200,168,75,.28);
    --r-legendary: #c44dff;   --r-legendary-glow: rgba(196,77,255,.32);
    --r-primed: #f0d070;      --r-primed-glow: rgba(240,208,112,.38);

    --pol-madurai: #e05050;
    --pol-vazarin: #50c8e0;
    --pol-naramon: #c8a84b;
    --pol-zenurik: #6080e0;
    --pol-penjaga: #50d890;
    --pol-unairu: #c8a870;
    --pol-umbra: #d0782a;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    background-image: radial-gradient(ellipse 70% 35% at 50% -5%, rgba(200,168,75,.07) 0%, transparent 60%);
    color: var(--text);
    font-family: 'Rajdhani', 'Segoe UI', system-ui, sans-serif;
    font-size: 15px;
    font-weight: 400;
    min-height: 100vh;
  }

  body::before {
    content: '';
    position: fixed; inset: 0;
    background-image: repeating-linear-gradient(
      0deg, transparent, transparent 3px,
      rgba(255,255,255,.008) 3px, rgba(255,255,255,.008) 4px
    );
    pointer-events: none; z-index: 0;
  }

  /* ─── Header ────────────────────────────────────────────────── */
  header {
    background: linear-gradient(180deg, rgba(5,7,11,.98) 0%, rgba(12,17,28,.96) 100%);
    border-bottom: 1px solid var(--border);
    padding: 14px 24px 10px;
    position: sticky; top: 0; z-index: 100;
    backdrop-filter: blur(16px);
  }

  .header-top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }

  .logo {
    font-family: 'Orbitron', monospace;
    font-size: 1.15rem; font-weight: 900;
    letter-spacing: .14em; color: var(--gold);
    text-transform: uppercase; white-space: nowrap;
    user-select: none; position: relative; padding-bottom: 5px;
  }
  .logo::after {
    content: ''; position: absolute;
    bottom: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }
  .logo span { color: var(--text); font-weight: 400; }

  .search-wrap { flex: 1; min-width: 200px; position: relative; display: flex; align-items: center; }
  .search-icon { position: absolute; left: 12px; color: var(--muted); pointer-events: none; display: flex; }

  #search {
    width: 100%; height: 42px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); border-radius: 6px;
    padding: 0 86px 0 38px;
    font-size: .88rem; font-family: 'Rajdhani', sans-serif;
    font-weight: 500; letter-spacing: .025em;
    outline: none; transition: border-color .15s, box-shadow .15s;
  }
  #search::placeholder { color: var(--muted); }
  #search:focus {
    border-color: var(--gold-dim);
    box-shadow: 0 0 0 1px var(--gold-dim), 0 0 22px -6px var(--gold-glow);
  }
  .search-kbd {
    position: absolute; right: 10px;
    background: var(--surface3); border: 1px solid var(--border);
    border-radius: 4px; color: var(--muted);
    font-size: .6rem; padding: 2px 6px;
    letter-spacing: .06em; white-space: nowrap;
    pointer-events: none; font-family: 'Orbitron', monospace;
  }

  .header-row2 {
    display: flex; align-items: center; gap: 8px;
    flex-wrap: wrap; margin-top: 9px;
  }

  select {
    height: 30px;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text); border-radius: 20px;
    padding: 0 26px 0 12px;
    font-size: .75rem; font-family: 'Rajdhani', sans-serif;
    font-weight: 600; letter-spacing: .05em;
    cursor: pointer; outline: none;
    appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%234e6178' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 9px center;
    transition: border-color .15s;
  }
  select:hover { border-color: var(--gold-dim); }
  select:focus { border-color: var(--gold); }

  .view-toggle {
    display: flex; gap: 2px; margin-left: auto;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 6px; padding: 3px;
  }
  .view-btn {
    border: none; background: transparent; color: var(--muted);
    width: 26px; height: 24px; border-radius: 4px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background .12s, color .12s;
  }
  .view-btn.active { background: var(--surface3); color: var(--gold); }
  .view-btn:hover:not(.active) { color: var(--text); }

  .filter-toggle {
    display: none;
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text-dim); border-radius: 5px;
    padding: 5px 14px; font-size: .7rem;
    font-family: 'Orbitron', monospace; letter-spacing: .07em;
    text-transform: uppercase; cursor: pointer;
    transition: border-color .15s; margin-left: auto;
  }
  .filter-toggle:hover { border-color: var(--gold-dim); color: var(--gold); }

  /* Lang chips */
  .lang-chips-wrap { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 8px; }
  .chip {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--muted); border-radius: 3px;
    padding: 2px 8px; font-size: .62rem; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
    cursor: pointer; user-select: none; transition: all .1s;
  }
  .chip.active {
    background: rgba(200,168,75,.1); border-color: var(--gold-dim); color: var(--gold);
  }
  .chip:hover:not(.active) { border-color: var(--muted); color: var(--text); }
  .chip-more {
    color: var(--energy); border-color: var(--energy-dim);
    background: rgba(77,200,255,.05);
  }
  .chip-more:hover { background: rgba(77,200,255,.1); color: var(--energy) !important; }

  /* ─── Results meta ──────────────────────────────────────────── */
  .results-meta {
    padding: 10px 24px 0;
    display: flex; align-items: center; gap: 10px;
    font-size: .7rem; color: var(--muted);
    font-family: 'Orbitron', monospace; letter-spacing: .05em;
  }
  .results-bar-wrap {
    flex: 1; max-width: 180px; height: 2px;
    background: var(--surface3); border-radius: 1px; overflow: hidden;
  }
  .results-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--gold-dim), var(--gold));
    border-radius: 1px; transition: width .35s ease;
  }

  /* ─── Grid ──────────────────────────────────────────────────── */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px; padding: 16px 24px 40px;
  }

  /* ─── Card ──────────────────────────────────────────────────── */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; overflow: hidden;
    display: flex; flex-direction: column;
    position: relative;
    transition: border-color .2s, box-shadow .2s, transform .15s;
    --r-color: var(--r-common); --r-glow: var(--r-common-glow);
    content-visibility: auto;
    contain-intrinsic-size: auto 300px;
  }
  .card[data-rarity="Uncommon"]  { --r-color: var(--r-uncommon);  --r-glow: var(--r-uncommon-glow);  }
  .card[data-rarity="Rare"]      { --r-color: var(--r-rare);      --r-glow: var(--r-rare-glow);      }
  .card[data-rarity="Legendary"] { --r-color: var(--r-legendary); --r-glow: var(--r-legendary-glow); }
  .card[data-rarity="Primed"]    { --r-color: var(--r-primed);    --r-glow: var(--r-primed-glow);    }

  .card:hover {
    transform: translateY(-3px);
    border-color: var(--r-color);
    box-shadow: 0 0 22px -4px var(--r-glow), 0 10px 28px -10px rgba(0,0,0,.55);
  }

  /* ─── Introduced badge ───────────────────────────────────────── */
  .intro-badge {
    font-size: .6rem; font-weight: 600; letter-spacing: .04em;
    padding: 2px 7px; border-radius: 3px; text-transform: uppercase;
    color: var(--energy); border: 1px solid var(--energy-dim);
    background: rgba(77,200,255,.05);
    white-space: nowrap;
  }

  /* ─── Max rank stats ─────────────────────────────────────────── */
  .stat-list { display: flex; flex-direction: column; gap: 3px; flex: 1; }
  .stat-line {
    font-size: .8rem; color: var(--text-dim); line-height: 1.45; font-weight: 500;
    padding-left: 10px; position: relative;
  }
  .stat-line::before {
    content: '▸'; position: absolute; left: 0;
    color: var(--gold-dim); font-size: .6rem; top: 3px;
  }

  /* ─── Drops ──────────────────────────────────────────────────── */
  .drops-table { margin-top: 7px; display: flex; flex-direction: column; gap: 3px; }
  .drop-row { display: flex; align-items: baseline; gap: 6px; }
  .drop-chance {
    font-size: .62rem; font-weight: 700; font-family: 'Orbitron', monospace;
    min-width: 44px; text-align: right; flex-shrink: 0;
  }
  .drop-chance.dc-common   { color: #5fbf8d; }
  .drop-chance.dc-uncommon { color: var(--r-uncommon); }
  .drop-chance.dc-rare     { color: var(--r-rare); }
  .drop-loc { font-size: .75rem; color: var(--text-dim); font-weight: 500; line-height: 1.4; }

  /* ─── Shimmer on Legendary / Primed */
  .card[data-rarity="Legendary"]::after,
  .card[data-rarity="Primed"]::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(108deg, transparent 38%, rgba(255,255,255,.045) 50%, transparent 62%);
    background-size: 200% 100%;
    animation: shimmer 3.5s linear infinite;
    border-radius: inherit; pointer-events: none; z-index: 1;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card::after { animation: none !important; }
    .card { transition: border-color .2s, box-shadow .2s; }
    .card:hover { transform: none; }
  }

  /* ─── Card top bar ──────────────────────────────────────────── */
  .card-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 12px 5px;
    background: var(--surface2); border-bottom: 1px solid var(--border);
  }

  .polarity-wrap { display: flex; align-items: center; gap: 6px; }
  .polarity-wrap svg { width: 17px; height: 17px; flex-shrink: 0; }
  .polarity-label {
    font-size: .63rem; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: var(--muted);
  }

  .drain-pips { display: flex; align-items: center; gap: 3px; }
  .pip {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--surface3); border: 1px solid var(--border);
  }
  .pip.on {
    background: var(--gold); border-color: var(--gold-bright);
    box-shadow: 0 0 5px var(--gold-glow);
  }
  .pip.neg {
    background: var(--energy); border-color: var(--energy);
    box-shadow: 0 0 5px var(--energy-glow);
  }
  .pip-extra { font-size: .62rem; color: var(--gold); font-family: 'Orbitron', monospace; font-weight: 700; margin-left: 2px; }
  .pip-extra.neg-ex { color: var(--energy); }

  /* ─── Card image ─────────────────────────────────────────────── */
  .card-img {
    background: linear-gradient(145deg, var(--surface2) 0%, var(--surface) 55%);
    display: flex; align-items: center; justify-content: center;
    height: 120px; position: relative; overflow: hidden;
  }
  .card-img::before {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(145deg, rgba(200,168,75,.05) 0%, transparent 60%);
    pointer-events: none;
  }
  .card-img img {
    max-height: 86px; max-width: 86px;
    object-fit: contain; position: relative; z-index: 1;
    filter: drop-shadow(0 3px 10px rgba(0,0,0,.65));
  }
  .no-img { font-size: .6rem; color: var(--muted); opacity: .4; font-family: 'Orbitron', monospace; letter-spacing: .06em; }

  /* ─── Card body ──────────────────────────────────────────────── */
  .card-body { padding: 11px 13px; flex: 1; display: flex; flex-direction: column; gap: 6px; }

  .card-name {
    font-family: 'Orbitron', monospace; font-size: .8rem;
    font-weight: 700; letter-spacing: .05em; line-height: 1.3;
    text-transform: uppercase;
  }
  .card-name a { color: var(--text); text-decoration: none; transition: color .12s; }
  .card-name a:hover { color: var(--gold); }
  .ext { font-size: .58rem; margin-left: 3px; opacity: .35; }

  .card-compat {
    font-size: .7rem; color: var(--gold-dim); font-weight: 700;
    letter-spacing: .07em; text-transform: uppercase;
  }

  .rarity-tag {
    font-family: 'Orbitron', monospace; font-size: .52rem;
    font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    padding: 2px 7px; border-radius: 3px;
  }
  .rt-Common    { color: var(--r-common);    background: rgba(138,154,176,.08);  border: 1px solid rgba(138,154,176,.22); }
  .rt-Uncommon  { color: var(--r-uncommon);  background: rgba(106,176,224,.08);  border: 1px solid rgba(106,176,224,.22); }
  .rt-Rare      { color: var(--r-rare);      background: rgba(200,168,75,.08);   border: 1px solid rgba(200,168,75,.24); }
  .rt-Legendary { color: var(--r-legendary); background: rgba(196,77,255,.08);   border: 1px solid rgba(196,77,255,.24); }
  .rt-Primed    { color: var(--r-primed);    background: rgba(240,208,112,.08);  border: 1px solid rgba(240,208,112,.28); }

  .tags-row { display: flex; gap: 5px; flex-wrap: wrap; }
  .tag {
    font-size: .62rem; font-weight: 700; letter-spacing: .06em;
    padding: 2px 7px; border-radius: 3px; text-transform: uppercase;
    color: var(--text-dim); border: 1px solid var(--border); background: var(--surface2);
  }
  .tag-tradable { color: #5fbf8d; border-color: rgba(95,191,141,.28); background: rgba(95,191,141,.06); }

  .card-desc {
    font-size: .8rem; font-weight: 400; color: var(--text-dim);
    line-height: 1.55; flex: 1;
    display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;
  }

  /* ─── Translations ───────────────────────────────────────────── */
  details { margin-top: 3px; }
  summary {
    font-size: .62rem; color: var(--gold-dim); cursor: pointer;
    user-select: none; list-style: none;
    display: flex; align-items: center; gap: 5px;
    padding-top: 6px; border-top: 1px solid var(--border);
    letter-spacing: .08em; font-weight: 700; text-transform: uppercase;
    font-family: 'Orbitron', monospace; transition: color .12s;
  }
  summary:hover { color: var(--gold); }
  summary::before { content: '▶'; font-size: .48rem; transition: transform .15s; }
  details[open] summary::before { transform: rotate(90deg); }
  summary::-webkit-details-marker { display: none; }

  .translations { margin-top: 7px; display: flex; flex-direction: column; gap: 4px; }
  .trans-row { display: flex; gap: 8px; align-items: baseline; }
  .trans-flag {
    font-size: .6rem; color: var(--gold); font-weight: 700;
    min-width: 70px; letter-spacing: .06em; text-transform: uppercase;
    font-family: 'Orbitron', monospace; flex-shrink: 0;
  }
  .trans-name { font-size: .8rem; color: var(--text-dim); font-weight: 500; }

  /* ─── Compact list ───────────────────────────────────────────── */
  .list-view { display: flex; flex-direction: column; gap: 2px; padding: 14px 24px 40px; }

  .list-hdr {
    display: grid;
    grid-template-columns: 26px 1fr 130px 100px 80px 70px;
    gap: 10px; padding: 4px 14px 6px;
    font-size: .6rem; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: var(--muted);
    font-family: 'Orbitron', monospace;
    border-bottom: 1px solid var(--border); margin-bottom: 4px;
  }

  .list-row {
    display: grid;
    grid-template-columns: 26px 1fr 130px 100px 80px 70px;
    align-items: center; gap: 10px;
    padding: 7px 14px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 5px;
    transition: border-color .15s, background .12s;
    content-visibility: auto;
    contain-intrinsic-size: auto 34px;
  }
  .list-row:hover { background: var(--surface2); border-color: var(--gold-dim); }

  .list-pol { display: flex; align-items: center; }
  .list-pol svg { width: 16px; height: 16px; }

  .list-name { font-family: 'Orbitron', monospace; font-size: .72rem; font-weight: 600; letter-spacing: .03em; }
  .list-name a { color: var(--text); text-decoration: none; }
  .list-name a:hover { color: var(--gold); }

  .list-compat { font-size: .72rem; color: var(--muted); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .list-rarity {
    font-size: .6rem; font-weight: 700; font-family: 'Orbitron', monospace;
    letter-spacing: .08em; text-transform: uppercase; text-align: center;
  }

  .list-drain { font-size: .72rem; color: var(--gold); font-family: 'Orbitron', monospace; text-align: center; font-weight: 600; }

  .list-tradable { text-align: center; font-size: .7rem; color: #5fbf8d; }

  /* ─── Landing screen ────────────────────────────────────────── */
  .landing {
    display: flex; flex-direction: column; align-items: center;
    gap: 22px; padding: 90px 24px; text-align: center;
  }
  .landing-count {
    font-family: 'Orbitron', monospace; font-size: 3.5rem; font-weight: 900;
    color: var(--gold); letter-spacing: .06em; line-height: 1;
    text-shadow: 0 0 50px var(--gold-glow), 0 0 20px var(--gold-glow);
  }
  .landing-sub {
    color: var(--text-dim); font-size: .95rem; font-weight: 500;
    max-width: 480px; line-height: 1.65; letter-spacing: .02em;
  }
  .landing-stats { display: flex; gap: 36px; flex-wrap: wrap; justify-content: center; margin: 6px 0; }
  .landing-stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .landing-stat-num {
    font-family: 'Orbitron', monospace; font-size: 1.5rem; font-weight: 700; color: var(--text);
  }
  .landing-stat-lbl {
    font-size: .6rem; color: var(--muted); letter-spacing: .12em;
    text-transform: uppercase; font-family: 'Orbitron', monospace;
  }
  .btn-show-all {
    background: linear-gradient(180deg, var(--gold-bright) 0%, var(--gold) 100%);
    color: #18120a; border: none; border-radius: 7px;
    padding: 14px 44px; font-size: .8rem;
    font-family: 'Orbitron', monospace; font-weight: 900;
    letter-spacing: .14em; text-transform: uppercase; cursor: pointer;
    box-shadow: 0 0 36px -6px var(--gold-glow), 0 2px 0 rgba(255,255,255,.12) inset;
    transition: transform .12s, box-shadow .2s;
  }
  .btn-show-all:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 44px -4px var(--gold-glow);
  }
  .landing-hint {
    color: var(--muted); font-size: .62rem; font-family: 'Orbitron', monospace;
    letter-spacing: .12em; text-transform: uppercase;
  }

  /* ─── Empty state ────────────────────────────────────────────── */
  .empty {
    grid-column: 1/-1;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    padding: 80px 0; color: var(--muted);
  }
  .empty-glyph { font-size: 2.2rem; opacity: .25; font-family: 'Orbitron', monospace; }
  .empty-text { font-size: .85rem; font-weight: 600; letter-spacing: .1em; font-family: 'Orbitron', monospace; }
  .btn-clear {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text-dim); border-radius: 5px;
    padding: 7px 20px; font-size: .68rem;
    font-family: 'Orbitron', monospace; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; cursor: pointer;
    transition: border-color .15s, color .15s;
  }
  .btn-clear:hover { border-color: var(--gold); color: var(--gold); }

  /* ─── Stagger fade-in ────────────────────────────────────────── */
  @keyframes cardIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: none; }
  }
  .grid.mounted .card,
  .list-view.mounted .list-row {
    animation: cardIn .22s ease both;
  }
  @media (prefers-reduced-motion: reduce) {
    .card, .list-row { animation: none !important; }
  }

  /* ─── Mobile ─────────────────────────────────────────────────── */
  @media (max-width: 640px) {
    header { padding: 10px 14px 8px; }
    .logo { font-size: .95rem; }
    .filter-toggle { display: block; }
    .header-row2 { display: none; }
    .header-row2.open { display: flex; }
    .lang-chips-wrap { display: none; }
    .lang-chips-wrap.open { display: flex; }
    .grid { padding: 10px 10px 28px; gap: 10px; }
    .list-view { padding: 10px 10px 28px; }
    .results-meta { padding: 8px 14px 0; }
    .results-bar-wrap { max-width: 80px; }
    .list-hdr, .list-row { grid-template-columns: 22px 1fr 80px; }
    .list-hdr > *:nth-child(n+4),
    .list-row > *:nth-child(n+4) { display: none; }
  }
</style>
</head>
<body>

<header>
  <div class="header-top">
    <div class="logo">WARFRAME <span>Mods</span></div>
    <div class="search-wrap">
      <span class="search-icon">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M11 11l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </span>
      <input id="search" type="search" placeholder="Search any language… Serration, Durchschlag, 連射" autocomplete="off" spellcheck="false">
      <span class="search-kbd">Ctrl+K</span>
    </div>
    <button class="filter-toggle" id="filter-toggle">Filters</button>
  </div>
  <div class="header-row2" id="header-row2">
    <select id="filter-rarity"><option value="">All Rarities</option></select>
    <select id="filter-polarity"><option value="">All Polarities</option></select>
    <select id="filter-type"><option value="">All Types</option></select>
    <select id="sort-by">
      <option value="name">Name A–Z</option>
      <option value="drain">By Drain</option>
      <option value="rarity">By Rarity</option>
    </select>
    <div class="view-toggle">
      <button class="view-btn active" id="btn-grid" title="Grid view">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="0" y="0" width="5" height="5" rx="1"/><rect x="7" y="0" width="5" height="5" rx="1"/>
          <rect x="0" y="7" width="5" height="5" rx="1"/><rect x="7" y="7" width="5" height="5" rx="1"/>
        </svg>
      </button>
      <button class="view-btn" id="btn-list" title="List view">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="0" y="0" width="12" height="2.5" rx="1.2"/>
          <rect x="0" y="4.75" width="12" height="2.5" rx="1.2"/>
          <rect x="0" y="9.5" width="12" height="2.5" rx="1.2"/>
        </svg>
      </button>
    </div>
  </div>
  <div class="lang-chips-wrap" id="lang-chips"></div>
</header>

<div class="results-meta" id="meta">
  <span id="meta-text"></span>
  <div class="results-bar-wrap"><div class="results-bar" id="results-bar" style="width:0%"></div></div>
</div>
<div id="container"></div>

<script>
const DATA = ${dataJson};

// ── Polarity glyphs ────────────────────────────────────────────
// Paths sourced from https://wiki.warframe.com/images/{Name}_Pol(xBlack).svg
// Format: [cssColorVar, viewBox, innerMarkup]
const POLARITY_SVG = {
  Madurai: ['var(--pol-madurai)', '0 0 50 50',
    '<path d="m 10.59322,45.127118 0.635593,-29.449152 c 0,0 -2.3305077,-2.542373 -5.5084737,-4.025424 C 13.559322,8.2627119 19.915254,4.8728813 19.915254,4.8728813 l 0.211865,18.6440677 c 8.68644,-6.991526 16.313559,-13.9830507 16.313559,-13.9830507 5.932204,-1.2711865 9.322034,5.2966097 9.322034,5.2966097 0,0 -26.483051,7.415255 -35.169492,30.29661 z" fill="currentColor" fill-rule="evenodd"/>'],
  Vazarin: ['var(--pol-vazarin)', '0 0 50 50',
    '<path d="m 36.652538,6.3559322 c 0,0 -13.559317,0 -31.355928,0.8474576 C 33.262712,25.211865 35.381356,44.279661 35.381356,44.279661 50.211868,27.330509 37.711868,4.0254237 37.711868,4.0254237 Z" fill="none" stroke="currentColor"/>'
    + '<path d="m 38.135598,16.949153 -12.500004,0.847458 9.745763,11.440678 c 0,0 4.237291,-5.29661 2.754241,-12.288136 z" fill="none" stroke="currentColor"/>'
    + '<path d="M 37.640856,5.1003873 C 36.765017,5.2841879 37.028695,6.7637876 35.901504,6.308675 26.719831,6.602264 17.523026,6.6025768 8.3526715,7.15241 7.5312902,7.0176536 6.7787941,7.9655835 7.6243876,8.5229078 11.40461,11.59298 15.425424,14.356797 18.925202,17.760941 c 7.318042,6.861254 13.4384,15.241864 16.215076,24.977241 0.705891,1.031852 1.741461,-0.291445 2.158368,-0.93601 C 41.62747,35.649636 43.195017,27.881506 42.40768,20.465226 41.853131,15.267761 40.540519,10.085642 38.225966,5.3904595 38.100324,5.1997821 37.878597,5.0560634 37.640856,5.1003873 Z m 0.525938,11.8751657 c 0.841342,4.226753 -0.293565,8.723053 -2.760444,12.237653 -3.277079,-3.736753 -6.494106,-7.526665 -9.656797,-11.35585 4.074873,-0.432813 8.315945,-0.644555 12.417241,-0.881803 z" fill="currentColor"/>'
    + '<path d="M 7.0101176,7.2193778 C 6.5475877,7.255502 6.3929253,7.8639901 6.7369076,8.1492846 7.0042471,8.5658337 7.745735,8.3471082 7.6887024,7.8401981 7.6791581,7.5065169 7.3290564,7.2277311 7.0101176,7.2193778 Z" fill="currentColor"/>'],
  Naramon: ['var(--pol-naramon)', '0 0 50 50',
    '<path d="m 10.242086,35.426443 c 0,0 -2.7932962,-7.44879 -6.8901312,-15.642458 l 20.6703922,-0.558659 15.828677,-0.18622 0.744879,-5.027933 3.165736,7.63501 3.351955,6.89013 -22.346368,0.186219 -12.849162,-0.186219 z" fill="currentColor" fill-rule="evenodd"/>'],
  Zenurik: ['var(--pol-zenurik)', '0 0 50 50',
    '<g transform="translate(2.9033123,12.232624)">'
    + '<path d="M -0.29103557,0.1444304 C 1.5711614,5.451692 6.9715343,9.8278559 6.9715343,9.8278559 12.092577,3.8688249 30.621441,6.7552299 30.621441,6.7552299 c 0,0 -6.517691,-8.7523273 -30.91247657,-6.6107995 z" fill="currentColor" fill-rule="evenodd"/>'
    + '<path d="m 11.440807,14.297129 c 1.955307,4.841713 7.91434,9.869646 7.91434,9.869646 8.752327,-6.517691 24.487895,-2.048417 24.487895,-2.048417 0,0 -9.217877,-10.800743 -32.402235,-7.821229 z" fill="currentColor" fill-rule="evenodd"/>'
    + '</g>'],
  Penjaga: ['var(--pol-penjaga)', '0 0 50 50',
    '<path d="m 30.528858,39.849889 c 0,0 -7.44879,2.793296 -15.642457,6.890131 L 14.327742,26.069628 14.141522,10.240951 9.1135894,9.4960727 l 7.6350086,-3.165736 6.89013,-3.351955 0.186219,22.3463673 -0.186219,12.849162 z" fill="currentColor" fill-rule="evenodd"/>'
    + '<path d="m 30.167597,31.564245 0,-0.558659 0.18622,-10.893855 11.080074,-4.748603 0.27933,11.824953 z" fill="currentColor" fill-rule="evenodd"/>'],
  Unairu:  ['var(--pol-unairu)',  '0 0 50 50',
    '<path d="m 45.24285,24.981603 c -23.070858,-2.696593 -31.010828,0.299621 -31.010828,0.299621 -3.895079,1.947541 -1.94754,13.632779 -1.94754,13.632779 0.125247,4.420632 -3.3480364,1.041886 -3.5954584,0.299622 C 0.14981062,22.43482 12.883725,12.54731 12.883725,12.54731 18.276914,7.3039335 31.759881,7.0043121 31.759881,7.0043121 c 1.198486,2.3969718 -1.498107,4.9437549 -1.498107,4.9437549 -9.438078,4.044891 -5.393187,6.741484 -5.393187,6.741484 16.179561,3.295838 20.374263,6.292052 20.374263,6.292052 z" fill="currentColor" fill-rule="evenodd"/>'],
  Umbra:   ['var(--pol-umbra)',   '0 0 52 52',
    '<path d="M47.9,1.2c-5.2,1.9-9.3,6.9-9.3,6.9l0,0c2.1,2.2,3.4,5,3.4,8c0,5.9-4.9,10.9-11.5,12.5c0,0,0,0,0,0l0,0C27.6,26.1,27.9,18,27.9,18c0-1.5-0.7-3.1-1.9-3.1s-1.9,1.6-1.9,3.1c0,0,0.3,8.2-2.6,10.7C14.9,27,10,22.1,10,16.1c0-3,1.3-5.8,3.4-8c0,0-4.5-5.2-9.4-7C8.6,5.5,7.4,10,6.9,12s-1.7,5-1.3,8.2c0,0,0,0,0-0.1c0,0,0,0,0,0.1c0,7.2,5.7,13.4,13.7,15.6c0,0.7,0,1.5,0,2.4c0,2.1,0.9,3.7,2.2,4.7v3.3c0,2.5,2,4.6,4.4,4.6s4.4-2.1,4.4-4.6v-3.3c1.4-1,2.2-2.6,2.2-4.7c0-0.9,0-1.7,0-2.4c8-2.2,13.7-8.4,13.7-15.6c0.4-3.2-0.8-6.3-1.3-8.2S43.4,5.5,47.9,1.2z M28.4,45.2c0,1.6-1.1,3-2.4,3s-2.4-1.3-2.4-3v-5.9c0-1.6,1.1-3,2.4-3s2.4,1.3,2.4,3V45.2z" fill="currentColor"/>'],
};

function polarityGlyphSvg(name) {
  const key = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  const cfg = POLARITY_SVG[key];
  if (!cfg) return '<svg width="17" height="17" viewBox="0 0 50 50"><circle cx="25" cy="25" r="10" fill="var(--muted)"/></svg>';
  return '<svg width="17" height="17" viewBox="' + cfg[1] + '" style="color:' + cfg[0] + '">' + cfg[2] + '</svg>';
}

// ── State ──────────────────────────────────────────────────────
const storedView = localStorage.getItem('wf-view');
const state = {
  query: '',
  rarity: '',
  polarity: '',
  type: '',
  sort: 'name',
  activeLangs: new Set(DATA.locales),
  view: storedView === 'list' ? 'list' : 'grid',
  showAll: false,
};

const CHUNK_SIZE = 60;
let renderToken = 0;

// ── DOM refs ───────────────────────────────────────────────────
const searchEl    = document.getElementById('search');
const containerEl = document.getElementById('container');
const metaTextEl  = document.getElementById('meta-text');
const resultsBar  = document.getElementById('results-bar');
const rarityEl    = document.getElementById('filter-rarity');
const polarityEl  = document.getElementById('filter-polarity');
const typeEl      = document.getElementById('filter-type');
const sortEl      = document.getElementById('sort-by');
const chipsEl     = document.getElementById('lang-chips');
const btnGrid     = document.getElementById('btn-grid');
const btnList     = document.getElementById('btn-list');
const row2El      = document.getElementById('header-row2');
const filterToggle = document.getElementById('filter-toggle');

// ── Populate filter dropdowns ──────────────────────────────────
DATA.rarities.forEach(r => {
  const o = document.createElement('option'); o.value = r; o.textContent = r;
  rarityEl.appendChild(o);
});
DATA.polarities.forEach(p => {
  const o = document.createElement('option'); o.value = p; o.textContent = p;
  polarityEl.appendChild(o);
});
DATA.types.forEach(t => {
  const o = document.createElement('option'); o.value = t; o.textContent = t;
  typeEl.appendChild(o);
});

// ── Language chips ─────────────────────────────────────────────
const CHIP_SHOW = 7;
let chipsExpanded = false;

function buildChips() {
  chipsEl.innerHTML = '';
  DATA.locales.forEach((loc, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (state.activeLangs.has(loc) ? ' active' : '');
    if (idx >= CHIP_SHOW && !chipsExpanded) chip.style.display = 'none';
    chip.textContent = DATA.localeLabels[loc] || loc;
    chip.dataset.locale = loc;
    chip.addEventListener('click', () => {
      if (state.activeLangs.has(loc)) {
        if (state.activeLangs.size === 1) return;
        state.activeLangs.delete(loc);
        chip.classList.remove('active');
      } else {
        state.activeLangs.add(loc);
        chip.classList.add('active');
      }
      render();
    });
    chipsEl.appendChild(chip);
  });

  if (DATA.locales.length > CHIP_SHOW) {
    const more = document.createElement('div');
    more.className = 'chip chip-more';
    more.textContent = chipsExpanded ? 'Less' : '+' + (DATA.locales.length - CHIP_SHOW) + ' more';
    more.addEventListener('click', () => {
      chipsExpanded = !chipsExpanded;
      buildChips();
    });
    chipsEl.appendChild(more);
  }
}
buildChips();

// ── Filter toggle (mobile) ─────────────────────────────────────
filterToggle.addEventListener('click', () => {
  row2El.classList.toggle('open');
  chipsEl.parentElement && chipsEl.classList.toggle('open');
  filterToggle.textContent = row2El.classList.contains('open') ? 'Hide' : 'Filters';
});

// ── View toggle ────────────────────────────────────────────────
function setView(v) {
  state.view = v;
  localStorage.setItem('wf-view', v);
  btnGrid.classList.toggle('active', v === 'grid');
  btnList.classList.toggle('active', v === 'list');
  render();
}
btnGrid.addEventListener('click', () => setView('grid'));
btnList.addEventListener('click', () => setView('list'));
if (state.view === 'list') { btnGrid.classList.remove('active'); btnList.classList.add('active'); }

// ── Ctrl+K shortcut ───────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchEl.focus(); searchEl.select(); }
});

// ── Search ─────────────────────────────────────────────────────
const modById = {};
DATA.mods.forEach(m => { modById[m.id] = m; });

function getMatchingIds(query) {
  if (!query) return null;
  const q = query.toLowerCase();
  const ids = new Set();
  for (const entry of DATA.searchIndex) {
    if (state.activeLangs.has(entry.locale) && entry.name.includes(q)) ids.add(entry.id);
  }
  return ids;
}

// ── Sort ───────────────────────────────────────────────────────
const RARITY_ORDER = { Common: 0, Uncommon: 1, Rare: 2, Legendary: 3 };

function sortedMods(mods) {
  return [...mods].sort((a, b) => {
    if (state.sort === 'drain') return (a.baseDrain ?? 999) - (b.baseDrain ?? 999);
    if (state.sort === 'rarity') {
      return (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99) || a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });
}

// ── Helpers ────────────────────────────────────────────────────
const CDN = '${CDN}';

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function drainPips(val) {
  if (val === null) return '';
  const n = Math.abs(val);
  const neg = val < 0;
  const CAP = 14;
  const show = Math.min(n, CAP);
  let html = '';
  for (let i = 0; i < show; i++) html += '<span class="pip ' + (neg ? 'neg' : 'on') + '"></span>';
  if (n > CAP) html += '<span class="pip-extra' + (neg ? ' neg-ex' : '') + '">' + n + '</span>';
  return '<div class="drain-pips">' + html + '</div>';
}

function rarityClass(r) {
  return 'rt-' + (r || 'Common');
}

// ── Card HTML ──────────────────────────────────────────────────
function cardHtml(mod) {
  const imgSrc = mod.imageName ? CDN + mod.imageName : null;
  const imgEl = imgSrc
    ? '<img src="' + esc(imgSrc) + '" alt="' + esc(mod.name) + '" loading="lazy">'
    : '<span class="no-img">No Image</span>';

  const rarity = mod.rarity || 'Common';
  const polSvg = polarityGlyphSvg(mod.polarity);
  const polLabel = mod.polarity || '';

  const transRows = Object.entries(mod.i18n)
    .filter(([loc]) => state.activeLangs.has(loc) && loc !== 'en')
    .map(([loc, t]) => t.name
      ? '<div class="trans-row"><span class="trans-flag">' + esc(DATA.localeLabels[loc] || loc) + '</span><span class="trans-name">' + esc(t.name) + '</span></div>'
      : ''
    ).join('');

  const translationsBlock = transRows
    ? '<details><summary>Translations</summary><div class="translations">' + transRows + '</div></details>'
    : '';

  const wikiUrl = mod.wikiaUrl || 'https://warframe.fandom.com/wiki/' + encodeURIComponent((mod.name || '').replaceAll(' ', '_'));

  const tags = [];
  if (mod.type) tags.push('<span class="tag">' + esc(mod.type) + '</span>');
  if (mod.tradable) tags.push('<span class="tag tag-tradable">Tradable</span>');
  if (mod.introduced) tags.push('<span class="intro-badge" title="' + esc(mod.introduced.date) + '">' + esc(mod.introduced.name) + '</span>');
  const tagsRow = tags.length ? '<div class="tags-row">' + tags.join('') + '</div>' : '';

  const statsBlock = mod.maxRankStats.length
    ? '<div class="stat-list">' + mod.maxRankStats.map(s => '<div class="stat-line">' + esc(s) + '</div>').join('') + '</div>'
    : (mod.description ? '<div class="card-desc">' + esc(mod.description) + '</div>' : '');

  const dropChanceClass = r => r === 'Rare' ? 'dc-rare' : r === 'Uncommon' ? 'dc-uncommon' : 'dc-common';
  const fmtChance = c => (typeof c === 'number') ? c.toFixed(c < 1 ? 2 : 1) + '%' : '—';
  const dropsBlock = mod.drops.length
    ? '<details><summary>Acquisition (' + mod.drops.length + ')</summary><div class="drops-table">' +
        [...mod.drops]
          .sort((a, b) => (b.chance ?? -1) - (a.chance ?? -1))
          .map(d => '<div class="drop-row"><span class="drop-chance ' + dropChanceClass(d.rarity) + '">' + fmtChance(d.chance) + '</span><span class="drop-loc">' + esc(d.location || '') + '</span></div>')
          .join('') +
      '</div></details>'
    : '';

  return \`<div class="card" data-rarity="\${esc(rarity)}">
  <div class="card-topbar">
    <div class="polarity-wrap">
      \${polSvg}
      \${polLabel ? '<span class="polarity-label">' + esc(polLabel) + '</span>' : ''}
    </div>
    <span class="rarity-tag \${rarityClass(rarity)}">\${esc(rarity)}</span>
    \${drainPips(mod.baseDrain)}
  </div>
  <div class="card-img">\${imgEl}</div>
  <div class="card-body">
    <div class="card-name"><a href="\${esc(wikiUrl)}" target="_blank" rel="noopener">\${esc(mod.name)}<span class="ext">↗</span></a></div>
    \${mod.compatName ? '<div class="card-compat">' + esc(mod.compatName) + '</div>' : ''}
    \${tagsRow}
    \${statsBlock}
    \${dropsBlock}
    \${translationsBlock}
  </div>
</div>\`;
}

// ── Row HTML (list view) ───────────────────────────────────────
function rowHtml(mod) {
  const rarity = mod.rarity || 'Common';
  const polSvg = polarityGlyphSvg(mod.polarity);
  const wikiUrl = mod.wikiaUrl || 'https://warframe.fandom.com/wiki/' + encodeURIComponent((mod.name || '').replaceAll(' ', '_'));
  const drainStr = mod.baseDrain !== null ? (mod.baseDrain >= 0 ? '+' : '') + mod.baseDrain : '—';
  const rarityColors = { Common: 'var(--r-common)', Uncommon: 'var(--r-uncommon)', Rare: 'var(--r-rare)', Legendary: 'var(--r-legendary)', Primed: 'var(--r-primed)' };
  const rCol = rarityColors[rarity] || 'var(--muted)';
  return \`<div class="list-row">
  <div class="list-pol">\${polSvg}</div>
  <div class="list-name"><a href="\${esc(wikiUrl)}" target="_blank" rel="noopener">\${esc(mod.name)}</a></div>
  <div class="list-compat">\${esc(mod.compatName || '')}</div>
  <div class="list-rarity" style="color:\${rCol}">\${esc(rarity)}</div>
  <div class="list-drain">\${drainStr}</div>
  <div class="list-tradable">\${mod.tradable ? '✓' : ''}</div>
</div>\`;
}

// ── Landing ────────────────────────────────────────────────────
function hasActiveFilters() {
  return !!(state.query || state.rarity || state.polarity || state.type);
}

function renderLanding() {
  metaTextEl.textContent = '';
  resultsBar.style.width = '0%';
  containerEl.innerHTML = \`<div class="landing">
  <div class="landing-count">\${DATA.mods.length.toLocaleString()}</div>
  <div class="landing-sub">mods indexed across \${DATA.locales.length} languages — search any name, or reveal the full catalogue.</div>
  <div class="landing-stats">
    <div class="landing-stat"><span class="landing-stat-num">\${DATA.rarities.length}</span><span class="landing-stat-lbl">Rarities</span></div>
    <div class="landing-stat"><span class="landing-stat-num">\${DATA.polarities.length}</span><span class="landing-stat-lbl">Polarities</span></div>
    <div class="landing-stat"><span class="landing-stat-num">\${DATA.types.length}</span><span class="landing-stat-lbl">Types</span></div>
  </div>
  <button class="btn-show-all" id="btn-show-all">Show All Mods</button>
  <div class="landing-hint">or press Ctrl+K to search</div>
</div>\`;
  document.getElementById('btn-show-all').addEventListener('click', () => {
    state.showAll = true;
    render();
  });
}

// ── Render ─────────────────────────────────────────────────────
function chunkAppend(el, items, htmlFn, token) {
  el.insertAdjacentHTML('beforeend', items.slice(0, CHUNK_SIZE).map(htmlFn).join(''));
  if (items.length <= CHUNK_SIZE) return;
  let cursor = CHUNK_SIZE;
  function step() {
    if (token !== renderToken) return;
    el.insertAdjacentHTML('beforeend', items.slice(cursor, cursor + CHUNK_SIZE).map(htmlFn).join(''));
    cursor += CHUNK_SIZE;
    if (cursor < items.length) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

let firstRender = true;

function render() {
  renderToken++;
  const myToken = renderToken;

  if (!hasActiveFilters() && !state.showAll) { renderLanding(); return; }

  const matchIds = getMatchingIds(state.query);
  let visible = DATA.mods.filter(m => {
    if (matchIds !== null && !matchIds.has(m.id)) return false;
    if (state.rarity   && m.rarity   !== state.rarity)   return false;
    if (state.polarity && m.polarity !== state.polarity)  return false;
    if (state.type     && m.type     !== state.type)      return false;
    return true;
  });

  visible = sortedMods(visible);

  const total = DATA.mods.length;
  const pct = total > 0 ? (visible.length / total * 100).toFixed(1) : 0;
  metaTextEl.textContent = visible.length + ' mod' + (visible.length !== 1 ? 's' : '');
  resultsBar.style.width = pct + '%';

  if (visible.length === 0) {
    containerEl.innerHTML = \`<div class="grid"><div class="empty">
      <div class="empty-glyph">◈</div>
      <div class="empty-text">No mods match your search</div>
      <button class="btn-clear" onclick="clearFilters()">Clear Filters</button>
    </div></div>\`;
    return;
  }

  if (state.view === 'list') {
    const hdr = \`<div class="list-hdr"><span></span><span>Name</span><span>Equip</span><span>Rarity</span><span>Drain</span><span>Trade</span></div>\`;
    containerEl.innerHTML = '<div class="list-view">' + hdr + '</div>';
    const lv = containerEl.querySelector('.list-view');
    if (firstRender) { requestAnimationFrame(() => lv && lv.classList.add('mounted')); }
    else lv && lv.classList.add('mounted');
    chunkAppend(lv, visible, rowHtml, myToken);
  } else {
    containerEl.innerHTML = '<div class="grid"></div>';
    const gv = containerEl.querySelector('.grid');
    if (firstRender) { requestAnimationFrame(() => gv && gv.classList.add('mounted')); }
    else gv && gv.classList.add('mounted');
    chunkAppend(gv, visible, cardHtml, myToken);
  }
  firstRender = false;
}

function clearFilters() {
  state.query = ''; searchEl.value = '';
  state.rarity = ''; rarityEl.value = '';
  state.polarity = ''; polarityEl.value = '';
  state.type = ''; typeEl.value = '';
  render();
}

// ── Event wiring ───────────────────────────────────────────────
let renderTimer;
function scheduleRender() { clearTimeout(renderTimer); renderTimer = setTimeout(render, 80); }

searchEl.addEventListener('input', () => {
  const v = searchEl.value.trim();
  if (v.length === 0 || v.length >= 5) { state.query = v; scheduleRender(); }
});
rarityEl.addEventListener('change',   () => { state.rarity   = rarityEl.value;   render(); });
polarityEl.addEventListener('change', () => { state.polarity = polarityEl.value; render(); });
typeEl.addEventListener('change',     () => { state.type     = typeEl.value;      render(); });
sortEl.addEventListener('change',     () => { state.sort     = sortEl.value;      render(); });

render();
</script>
</body>
</html>`;

writeFileSync('mods.html', html, 'utf8');
console.log('Done! Open mods.html in a browser.');
