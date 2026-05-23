import React, { useState } from 'react';
import { Image, Upload, Trash2, Loader2 } from 'lucide-react';
import { useBranding } from '../../contexts/BrandingContext';
import {
  DEFAULT_FAVICON_URL,
  DEFAULT_LOGO_URL,
  removeBrandingFile,
  uploadBrandingFile,
} from '../../theme/brandingApi';

function BrandAssetCard({ title, hint, previewUrl, isCustom, defaultUrl, uploading, onUpload, onRemove }) {
  return (
    <div
      className="rn-card"
      style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minWidth: 240 }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        <p className="rn-muted" style={{ margin: '4px 0 0', fontSize: 12, lineHeight: 1.45 }}>
          {hint}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 88,
          padding: 12,
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border)',
          background: 'var(--surface-2)',
        }}
      >
        <img
          src={previewUrl}
          alt={title}
          style={{
            maxHeight: title.includes('Favicon') ? 48 : 64,
            maxWidth: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      {isCustom ? (
        <span className="rn-pill rn-pill--success" style={{ alignSelf: 'flex-start' }}>
          Personalizado
        </span>
      ) : (
        <span className="rn-pill" style={{ alignSelf: 'flex-start' }}>
          Padrão CenterSpot
        </span>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <label className="rn-btn rn-btn--primary rn-btn--sm" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
          {uploading ? <Loader2 size={14} className="rn-spin" /> : <Upload size={14} />}
          Enviar arquivo
          <input
            type="file"
            accept={title.includes('Favicon') ? 'image/png,image/x-icon,image/jpeg,image/webp,.ico' : 'image/png,image/jpeg,image/webp'}
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />
        </label>
        {isCustom && (
          <button type="button" className="rn-btn rn-btn--secondary rn-btn--sm" disabled={uploading} onClick={onRemove}>
            <Trash2 size={14} />
            Usar padrão
          </button>
        )}
      </div>
      <p className="rn-muted" style={{ margin: 0, fontSize: 11 }}>
        Padrão da plataforma: <code style={{ fontSize: 11 }}>{defaultUrl}</code>
      </p>
    </div>
  );
}

export default function BrandingPanel() {
  const { branding, brandingLoading, setBranding } = useBranding();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('admin_token');

  const handleUpload = async (kind, file) => {
    setError(null);
    if (kind === 'logo') setUploadingLogo(true);
    else setUploadingFavicon(true);
    try {
      const data = await uploadBrandingFile(token, kind, file);
      setBranding(data);
    } catch (e) {
      setError(e.message);
    } finally {
      if (kind === 'logo') setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  const handleRemove = async (kind) => {
    setError(null);
    if (kind === 'logo') setUploadingLogo(true);
    else setUploadingFavicon(true);
    try {
      const data = await removeBrandingFile(token, kind);
      setBranding(data);
    } catch (e) {
      setError(e.message);
    } finally {
      if (kind === 'logo') setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  };

  if (brandingLoading && !branding.logo_url) {
    return (
      <div className="rn-card" style={{ padding: '1.5rem', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Loader2 size={18} className="rn-spin" />
        <span className="rn-muted">Carregando logo e favicon…</span>
      </div>
    );
  }

  return (
    <div className="rn-card" style={{ marginBottom: 16 }}>
      <div className="rn-section-header">
        <span className="rn-section-title">
          <Image size={15} />
          Logo e favicon
        </span>
      </div>
      <div style={{ padding: '12px 14px 16px' }}>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 14px', lineHeight: 1.5 }}>
          Personalize a identidade desta empresa no painel e na aba do navegador. A empresa padrão do SaaS
          (<strong>default</strong>) define o visual inicial da plataforma; cada tenant pode enviar a própria logo e
          favicon em <strong>Configurações → Aparência</strong>.
        </p>

        {error && (
          <div className="rn-alert rn-alert--danger" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <BrandAssetCard
            title="Logo do painel"
            hint="Exibida em branco no login e na barra lateral (mesmo se o arquivo for colorido). PNG ou WebP, até 2 MB."
            previewUrl={branding.logo_url}
            isCustom={branding.logo_custom}
            defaultUrl={DEFAULT_LOGO_URL}
            uploading={uploadingLogo}
            onUpload={(f) => handleUpload('logo', f)}
            onRemove={() => handleRemove('logo')}
          />
          <BrandAssetCard
            title="Favicon"
            hint="Ícone da aba do navegador. PNG ou ICO, até 512 KB."
            previewUrl={branding.favicon_url}
            isCustom={branding.favicon_custom}
            defaultUrl={DEFAULT_FAVICON_URL}
            uploading={uploadingFavicon}
            onUpload={(f) => handleUpload('favicon', f)}
            onRemove={() => handleRemove('favicon')}
          />
        </div>
      </div>
    </div>
  );
}
