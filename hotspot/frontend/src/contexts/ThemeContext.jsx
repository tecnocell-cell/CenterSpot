import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchEmpresaTheme, saveEmpresaTheme } from '../theme/themeApi';
import {
  applyThemeFromCfg,
  loadStoredTheme,
  matchPreset,
  saveStoredTheme,
  THEME_DEFAULTS,
  THEME_PRESETS,
  themeCfgMerge,
} from '../theme/themeConfig';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [theme, setTheme] = useState(() => loadStoredTheme());
  const [themeLoading, setThemeLoading] = useState(false);

  const applyDraft = useCallback((cfg) => {
    const merged = themeCfgMerge(cfg);
    setTheme(merged);
    applyThemeFromCfg(merged);
  }, []);

  const saveTheme = useCallback(async (cfg) => {
    const merged = themeCfgMerge(cfg);
    saveStoredTheme(merged);
    setTheme(merged);
    applyThemeFromCfg(merged);

    const token = localStorage.getItem('admin_token');
    if (!token) return true;
    return saveEmpresaTheme(token, merged);
  }, []);

  const applyPreset = useCallback(
    (presetId) => {
      const preset = THEME_PRESETS[presetId];
      if (preset) applyDraft(preset);
    },
    [applyDraft]
  );

  const resetTheme = useCallback(async () => {
    await saveTheme(THEME_DEFAULTS);
  }, [saveTheme]);

  useEffect(() => {
    if (authLoading) return;

    const token = localStorage.getItem('admin_token');
    if (!token) {
      const local = loadStoredTheme();
      setTheme(local);
      applyThemeFromCfg(local);
      return;
    }

    let cancelled = false;
    setThemeLoading(true);

    (async () => {
      const remote = await fetchEmpresaTheme(token);
      if (cancelled) return;

      const local = loadStoredTheme();
      // Tema salvo no servidor com paleta antiga (verde): preferir padrão azul local até o usuário salvar de novo
      const remoteIsLegacyGreen =
        remote?.theme_sidebar_bg &&
        (remote.theme_sidebar_bg.toLowerCase().includes('1a2e28') ||
          remote.theme_sidebar_bg.toLowerCase().includes('2e5248') ||
          remote.theme_indicator?.toLowerCase().includes('8dd55a'));
      const next = remote && !remoteIsLegacyGreen ? remote : local;
      setTheme(next);
      applyThemeFromCfg(next);
      if (remote) saveStoredTheme(remote);
      setThemeLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.empresa_id, authLoading]);

  const activePreset = useMemo(() => matchPreset(theme), [theme]);

  const value = useMemo(
    () => ({
      theme,
      activePreset,
      themeLoading,
      applyDraft,
      saveTheme,
      applyPreset,
      resetTheme,
    }),
    [theme, activePreset, themeLoading, applyDraft, saveTheme, applyPreset, resetTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}
