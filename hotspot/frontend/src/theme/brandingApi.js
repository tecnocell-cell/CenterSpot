export const DEFAULT_LOGO_URL = '/logo-centerspot.png';
export const DEFAULT_FAVICON_URL = '/faveicon.png';

export function applyFaviconToDocument(url) {
  const href = url || DEFAULT_FAVICON_URL;
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = href.endsWith('.ico') ? 'image/x-icon' : 'image/png';
  link.href = href;

  let apple = document.querySelector("link[rel='apple-touch-icon']");
  if (!apple) {
    apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    document.head.appendChild(apple);
  }
  apple.href = href;
}

export async function fetchPublicBranding(slug = 'default') {
  try {
    const res = await fetch(`/api/public/branding/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchEmpresaBranding(token) {
  if (!token) return null;
  try {
    const res = await fetch('/api/empresa-config/branding', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function uploadBrandingFile(token, kind, file) {
  const field = kind === 'logo' ? 'logo' : 'favicon';
  const formData = new FormData();
  formData.append(field, file);
  const res = await fetch(`/api/empresa-config/branding/${kind}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Falha no upload');
  return data;
}

export async function removeBrandingFile(token, kind) {
  const res = await fetch(`/api/empresa-config/branding/${kind}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Falha ao remover');
  return data;
}
