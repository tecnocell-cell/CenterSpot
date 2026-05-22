import { themeCfgMerge, THEME_KEYS } from './themeConfig';

function pickThemeKeys(data) {
  const cfg = {};
  THEME_KEYS.forEach((k) => {
    if (data?.[k] != null && String(data[k]).trim()) cfg[k] = String(data[k]).trim();
  });
  return Object.keys(cfg).length ? themeCfgMerge(cfg) : null;
}

export async function fetchEmpresaTheme(token) {
  if (!token) return null;
  try {
    const res = await fetch('/api/empresa-config/aparencia', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return pickThemeKeys(data);
  } catch {
    return null;
  }
}

export async function saveEmpresaTheme(token, cfg) {
  if (!token) return false;
  const payload = {};
  const merged = themeCfgMerge(cfg);
  THEME_KEYS.forEach((k) => {
    payload[k] = merged[k];
  });
  try {
    const res = await fetch('/api/empresa-config/aparencia', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
