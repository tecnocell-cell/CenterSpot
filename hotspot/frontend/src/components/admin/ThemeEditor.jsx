import React, { useEffect, useState } from 'react';
import { Palette, Eye, RefreshCw, Save, Loader2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  PRESET_META,
  THEME_KEYS,
  themeToHexPickers,
  themeCfgMerge,
} from '../../theme/themeConfig';
import BrandingPanel from './BrandingPanel';

const PICKER_FIELDS = [
  {
    block: 'Barra lateral',
    items: [
      { key: 'theme_sidebar_bg', label: 'Fundo da barra' },
      { key: 'theme_sidebar_text', label: 'Texto dos menus' },
      { key: 'theme_menu_active', label: 'Menu selecionado (texto)' },
      { key: 'theme_menu_active_bg', label: 'Menu selecionado (fundo)' },
      { key: 'theme_indicator', label: 'Destaque (avatar, badges)' },
    ],
  },
  {
    block: 'Botões',
    items: [
      { key: 'theme_btn_primary', label: 'Botão primário' },
      { key: 'theme_btn_primary_hover', label: 'Botão primário (hover)' },
    ],
  },
  {
    block: 'Campos e formulários',
    items: [
      { key: 'theme_field_bg', label: 'Fundo do campo' },
      { key: 'theme_field_border', label: 'Borda do campo' },
      { key: 'theme_field_focus', label: 'Foco do campo' },
    ],
  },
];

export default function ThemeEditor() {
  const { theme, activePreset, themeLoading, applyDraft, saveTheme, applyPreset, resetTheme } = useTheme();
  const [draft, setDraft] = useState(() => themeToHexPickers(theme));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setDraft(themeToHexPickers(theme));
  }, [theme]);

  const updateDraft = (key, hex) => {
    setSaved(false);
    setError(null);
    const nextDraft = { ...draft, [key]: hex };
    setDraft(nextDraft);
    const cfg = { ...themeCfgMerge(theme) };
    THEME_KEYS.forEach((k) => {
      cfg[k] = nextDraft[k] || cfg[k];
    });
    applyDraft(cfg);
  };

  const handlePreset = (id) => {
    applyPreset(id);
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const cfg = {};
      THEME_KEYS.forEach((k) => {
        cfg[k] = draft[k] || theme[k];
      });
      const ok = await saveTheme(cfg);
      if (!ok) throw new Error('Falha ao salvar');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Não foi possível salvar a aparência. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restaurar o tema padrão CenterSpot (azul) para esta empresa?')) return;
    setSaving(true);
    setError(null);
    try {
      await resetTheme();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Erro ao restaurar o tema padrão.');
    } finally {
      setSaving(false);
    }
  };

  if (themeLoading) {
    return (
      <div className="rn-card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted-foreground)' }}>
        <Loader2 size={18} className="rn-spin" />
        Carregando aparência da empresa…
      </div>
    );
  }

  return (
    <>
      <BrandingPanel />
      <div className="theme-editor-grid">
      <div className="rn-card">
        <div className="rn-section-header">
          <span className="rn-section-title">
            <Palette size={15} />
            Personalização visual
          </span>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Configure as cores do painel no padrão <strong>CenterSpot</strong> (azul da marca): barra lateral, menus ativos,
            botões e campos. A pré-visualização atualiza em tempo real; clique em <strong>Salvar aparência</strong> para
            gravar para todos os usuários desta empresa.
          </p>

          <div className="rn-section-sub">Temas rápidos</div>
          <div className="color-swatch-row">
            {PRESET_META.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`color-swatch ${activePreset === p.id ? 'selected' : ''}`}
                style={{ background: p.color }}
                title={p.label}
                onClick={() => handlePreset(p.id)}
                aria-label={p.label}
              />
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '6px 0 0' }}>
            {PRESET_META.map((p) => p.label).join(' · ')}
          </p>

          {PICKER_FIELDS.map((section) => (
            <div key={section.block} className="theme-color-block">
              <h4>{section.block}</h4>
              {section.items.map((item) => (
                <div key={item.key} className="theme-color-row">
                  <label htmlFor={item.key}>{item.label}</label>
                  <input
                    type="color"
                    id={item.key}
                    value={draft[item.key] || '#000000'}
                    onChange={(e) => updateDraft(item.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}

          {error && (
            <div className="rn-alert rn-alert--danger" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <button
              type="button"
              className="rn-btn rn-btn--primary rn-btn--sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="rn-spin" /> : <Save size={14} />}
              {saved ? 'Salvo!' : saving ? 'Salvando…' : 'Salvar aparência'}
            </button>
            <button type="button" className="rn-btn rn-btn--secondary rn-btn--sm" onClick={handleReset} disabled={saving}>
              <RefreshCw size={14} />
              Restaurar padrão CenterSpot
            </button>
          </div>
        </div>
      </div>

      <div className="rn-card">
        <div className="rn-section-header">
          <span className="rn-section-title">
            <Eye size={15} />
            Pré-visualização
          </span>
        </div>
        <div className="theme-preview-wrap">
          <div className="theme-preview-sidebar">
            <strong>CenterSpot</strong>
            <div className="theme-preview-nav">
              <span>Dashboard</span>
              <span className="on">Configurações</span>
              <span>MikroTik</span>
            </div>
            <div className="theme-preview-user">
              <div className="theme-preview-av">A</div>
              <span>Administrador</span>
            </div>
          </div>
          <div className="theme-preview-form">
            <input type="text" placeholder="Exemplo de campo" readOnly />
            <div className="theme-preview-btns">
              <span className="p">Primário</span>
              <span className="s">Secundário</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
