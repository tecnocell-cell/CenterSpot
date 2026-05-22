import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Abas de seção via ?tab=
 * @param {Array<{id:string, label:string, perm?:string}>} allTabs
 * @param {{ isSuperAdmin: boolean, hasPermission: Function }} auth
 */
export function useSectionTabs(allTabs, { isSuperAdmin, hasPermission }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const tabs = useMemo(() => {
    return allTabs.filter((t) => {
      if (!t.perm) return true;
      if (isSuperAdmin) return true;
      return hasPermission(t.perm, 'ver');
    });
  }, [allTabs, isSuperAdmin, hasPermission]);

  const aba = tabs.some((t) => t.id === tabParam) ? tabParam : tabs[0]?.id || 'geral';
  const setAba = (id) => setSearchParams({ tab: id }, { replace: true });

  useEffect(() => {
    if (!tabs.length) return;
    if (tabParam !== aba) {
      setSearchParams({ tab: aba }, { replace: true });
    }
  }, [tabParam, aba, tabs.length, setSearchParams]);

  return { tabs, aba, setAba };
}
