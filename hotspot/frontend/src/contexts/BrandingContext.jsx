import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  applyFaviconToDocument,
  DEFAULT_FAVICON_URL,
  DEFAULT_LOGO_URL,
  fetchEmpresaBranding,
  fetchPublicBranding,
} from '../theme/brandingApi';

const BrandingContext = createContext(null);

const FALLBACK = {
  logo_url: DEFAULT_LOGO_URL,
  favicon_url: DEFAULT_FAVICON_URL,
  logo_custom: false,
  favicon_custom: false,
};

export function BrandingProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [branding, setBranding] = useState(FALLBACK);
  const [loading, setLoading] = useState(false);

  const applyBranding = useCallback((data) => {
    const next = {
      logo_url: data?.logo_url || DEFAULT_LOGO_URL,
      favicon_url: data?.favicon_url || DEFAULT_FAVICON_URL,
      logo_custom: Boolean(data?.logo_custom),
      favicon_custom: Boolean(data?.favicon_custom),
      empresa_nome: data?.empresa_nome,
      empresa_slug: data?.empresa_slug,
    };
    setBranding(next);
    applyFaviconToDocument(next.favicon_url);
    return next;
  }, []);

  const refreshBranding = useCallback(async () => {
    const token = localStorage.getItem('admin_token');
    if (token && user) {
      const remote = await fetchEmpresaBranding(token);
      if (remote) return applyBranding(remote);
    }
    const slug = user?.empresa_slug || 'default';
    const pub = await fetchPublicBranding(slug);
    return applyBranding(pub || FALLBACK);
  }, [user, applyBranding]);

  useEffect(() => {
    if (authLoading) return undefined;
    let cancelled = false;
    setLoading(true);

    (async () => {
      if (!user) {
        const pub = await fetchPublicBranding('default');
        if (!cancelled) applyBranding(pub || FALLBACK);
      } else {
        const token = localStorage.getItem('admin_token');
        const remote = token ? await fetchEmpresaBranding(token) : null;
        if (!cancelled) {
          if (remote) applyBranding(remote);
          else {
            const pub = await fetchPublicBranding(user.empresa_slug || 'default');
            applyBranding(pub || FALLBACK);
          }
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.empresa_id, user?.empresa_slug, authLoading, applyBranding]);

  const value = useMemo(
    () => ({
      branding,
      brandingLoading: loading,
      refreshBranding,
      setBranding: applyBranding,
    }),
    [branding, loading, refreshBranding, applyBranding]
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding deve ser usado dentro de BrandingProvider');
  return ctx;
}
