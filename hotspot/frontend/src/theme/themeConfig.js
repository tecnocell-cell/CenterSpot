export const THEME_STORAGE_KEY = 'hotspot_theme_centerspot_v2';

export const THEME_KEYS = [
  'theme_indicator',
  'theme_sidebar_bg',
  'theme_sidebar_text',
  'theme_menu_active',
  'theme_menu_active_bg',
  'theme_btn_primary',
  'theme_btn_primary_hover',
  'theme_field_border',
  'theme_field_focus',
  'theme_field_bg',
];

/** Padrão CenterSpot (azul institucional da logo) */
export const THEME_DEFAULTS = {
  theme_indicator: '#5eb3ff',
  theme_sidebar_bg: '#0f2847',
  theme_sidebar_text: '#f0f6fc',
  theme_menu_active: '#5eb3ff',
  theme_menu_active_bg: '',
  theme_btn_primary: '#1a6fd4',
  theme_btn_primary_hover: '#1558ad',
  theme_field_border: '#d4e3f0',
  theme_field_focus: '#2b7fd4',
  theme_field_bg: '#f2f7fc',
};

export const THEME_HEX_FALLBACK = {
  theme_indicator: '#5eb3ff',
  theme_sidebar_bg: '#0f2847',
  theme_sidebar_text: '#f0f6fc',
  theme_menu_active: '#5eb3ff',
  theme_menu_active_bg: '#1a3558',
  theme_btn_primary: '#1a6fd4',
  theme_btn_primary_hover: '#1558ad',
  theme_field_border: '#d4e3f0',
  theme_field_focus: '#2b7fd4',
  theme_field_bg: '#f2f7fc',
};

export const THEME_PRESETS = {
  centerspot: { ...THEME_DEFAULTS },
  centeros: { ...THEME_DEFAULTS },
  azul: { ...THEME_DEFAULTS },
  verde: {
    theme_indicator: '#8dd55a',
    theme_sidebar_bg: '#1a2e28',
    theme_sidebar_text: '#f8fcfa',
    theme_menu_active: '#8dd55a',
    theme_menu_active_bg: '#232f2b',
    theme_btn_primary: '#2e5248',
    theme_btn_primary_hover: '#243f38',
    theme_field_border: '#e8ece9',
    theme_field_focus: '#3d6b5c',
    theme_field_bg: '#f4f7f5',
  },
  laranja: {
    theme_indicator: '#f0a070',
    theme_sidebar_bg: '#3d2418',
    theme_sidebar_text: '#fff8f4',
    theme_menu_active: '#f0a070',
    theme_menu_active_bg: '#5c3828',
    theme_btn_primary: '#c45c28',
    theme_btn_primary_hover: '#9e4820',
    theme_field_border: '#e8ddd6',
    theme_field_focus: '#d47840',
    theme_field_bg: '#faf6f2',
  },
  roxo: {
    theme_indicator: '#b89af0',
    theme_sidebar_bg: '#2a1f3d',
    theme_sidebar_text: '#f8f4ff',
    theme_menu_active: '#b89af0',
    theme_menu_active_bg: '#3d2e58',
    theme_btn_primary: '#6b4c9e',
    theme_btn_primary_hover: '#553d7d',
    theme_field_border: '#e4dde8',
    theme_field_focus: '#8b6bb8',
    theme_field_bg: '#f7f4fa',
  },
  dourado: {
    theme_indicator: '#d4c060',
    theme_sidebar_bg: '#2e2a18',
    theme_sidebar_text: '#faf8f0',
    theme_menu_active: '#d4c060',
    theme_menu_active_bg: '#4a4428',
    theme_btn_primary: '#8a7a30',
    theme_btn_primary_hover: '#6e6024',
    theme_field_border: '#e8e4d4',
    theme_field_focus: '#a89438',
    theme_field_bg: '#faf8f2',
  },
  grafite: {
    theme_indicator: '#94a3b8',
    theme_sidebar_bg: '#1f2937',
    theme_sidebar_text: '#f3f4f6',
    theme_menu_active: '#cbd5e1',
    theme_menu_active_bg: '#374151',
    theme_btn_primary: '#4b5563',
    theme_btn_primary_hover: '#374151',
    theme_field_border: '#d1d5db',
    theme_field_focus: '#6b7280',
    theme_field_bg: '#f9fafb',
  },
};

export const PRESET_META = [
  { id: 'centerspot', label: 'CenterSpot', color: '#5eb3ff' },
  { id: 'verde', label: 'Verde', color: '#8dd55a' },
  { id: 'laranja', label: 'Laranja', color: '#f0a070' },
  { id: 'roxo', label: 'Roxo', color: '#b89af0' },
  { id: 'dourado', label: 'Dourado', color: '#d4c060' },
  { id: 'grafite', label: 'Grafite', color: '#6b7280' },
];

export function themeMenuActiveBg(t) {
  const custom = (t.theme_menu_active_bg || '').trim();
  if (custom) return custom;
  return `color-mix(in oklab, white 8%, ${t.theme_sidebar_bg})`;
}

export function themeCfgMerge(cfg) {
  const out = { ...THEME_DEFAULTS };
  THEME_KEYS.forEach((k) => {
    if (cfg?.[k] != null && String(cfg[k]).trim()) out[k] = String(cfg[k]).trim();
  });
  return out;
}

export function applyThemeFromCfg(cfg) {
  const t = themeCfgMerge(cfg);
  const menuBg = themeMenuActiveBg(t);
  const root = document.documentElement;
  root.style.setProperty('--indicator', t.theme_indicator);
  root.style.setProperty('--sidebar', t.theme_sidebar_bg);
  root.style.setProperty('--sidebar-foreground', t.theme_sidebar_text);
  root.style.setProperty('--forest-900', t.theme_sidebar_bg);
  root.style.setProperty('--forest-800', t.theme_btn_primary_hover);
  root.style.setProperty('--forest-700', t.theme_btn_primary);
  root.style.setProperty('--forest-600', t.theme_field_focus);
  root.style.setProperty('--forest-500', t.theme_field_focus);
  root.style.setProperty('--primary', t.theme_btn_primary);
  root.style.setProperty('--ring', t.theme_field_focus);
  root.style.setProperty('--border', t.theme_field_border);
  root.style.setProperty('--input', t.theme_field_border);
  root.style.setProperty('--surface-2', t.theme_field_bg);
  root.style.setProperty('--theme-menu-active', t.theme_menu_active);
  root.style.setProperty('--theme-menu-active-bg', menuBg);
  root.style.setProperty('--sidebar-primary', t.theme_menu_active);
  root.style.setProperty('--sidebar-accent', menuBg);
  root.style.setProperty('--sidebar-primary-foreground', t.theme_sidebar_bg);
  root.style.setProperty('--forest-50', `color-mix(in oklab, ${t.theme_field_bg} 85%, white)`);
  root.style.setProperty('--forest-100', `color-mix(in oklab, ${t.theme_field_focus} 12%, ${t.theme_field_bg})`);
  root.style.setProperty('--theme-color', t.theme_sidebar_bg);
  root.style.setProperty('--accent', `color-mix(in oklab, ${t.theme_indicator} 18%, ${t.theme_field_bg})`);
  root.style.setProperty('--accent-foreground', t.theme_btn_primary_hover);
}

export function cssColorToHex(css) {
  if (!css) return null;
  const s = String(css).trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(s)) return s.toLowerCase();
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#000';
    ctx.fillStyle = s;
    const norm = String(ctx.fillStyle);
    if (norm.startsWith('#')) return norm.length === 7 ? norm.toLowerCase() : null;
    const m = norm.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return null;
    return '#' + m.slice(0, 3).map((n) => Math.round(+n).toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export function themeToHexPickers(cfg) {
  const t = themeCfgMerge(cfg);
  const tFill = { ...t, theme_menu_active_bg: themeMenuActiveBg(t) };
  const out = {};
  THEME_KEYS.forEach((k) => {
    out[k] = cssColorToHex(tFill[k]) || THEME_HEX_FALLBACK[k];
  });
  return out;
}

export function matchPreset(cfg) {
  const t = themeCfgMerge(cfg);
  for (const [name, preset] of Object.entries(THEME_PRESETS)) {
    if (name === 'verde' || name === 'centeros') continue;
    if (THEME_KEYS.every((k) => (preset[k] || '').toLowerCase() === (t[k] || '').toLowerCase())) {
      return name;
    }
  }
  return null;
}

export function loadStoredTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { ...THEME_DEFAULTS };
    return themeCfgMerge(JSON.parse(raw));
  } catch {
    return { ...THEME_DEFAULTS };
  }
}

export function saveStoredTheme(cfg) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeCfgMerge(cfg)));
}
