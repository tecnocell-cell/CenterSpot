import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminTopBar from "./AdminTopBar";
import { resolveAdminPageTitle } from "../../utils/adminPageTitle";

export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { empresaSlug } = useParams();
  const { user, logout, isSuperAdmin, empresas, switchEmpresa, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switchingEmpresa, setSwitchingEmpresa] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [whatsappAvisoFechado, setWhatsappAvisoFechado] = useState(false);

  const toggleMenu = (key) => setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));

  const slug = empresaSlug || user?.empresa_slug || "default";
  const basePath = `/admin/${slug}`;

  useEffect(() => {
    const fetchWhatsappStatus = async () => {
      try {
        const token = localStorage.getItem("admin_token");
        const res = await fetch("/api/whatsapp/instance/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setWhatsappStatus(await res.json());
      } catch {
        /* silencioso */
      }
    };
    setWhatsappAvisoFechado(sessionStorage.getItem(`wa_aviso_fechado_${slug}`) === "1");
    if (slug) fetchWhatsappStatus();
  }, [slug]);

  const fecharAvisoWhatsapp = () => {
    setWhatsappAvisoFechado(true);
    sessionStorage.setItem(`wa_aviso_fechado_${slug}`, "1");
  };

  const whatsappDesconectado =
    whatsappStatus && (!whatsappStatus.exists || whatsappStatus.state !== "open");
  const mostrarAvisoWhatsapp =
    whatsappDesconectado && !whatsappAvisoFechado && !location.pathname.includes("/whatsapp");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    {
      key: "dashboard",
      title: "Dashboard",
      path: basePath,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "empresas",
            title: "Empresas",
            path: `${basePath}/empresas`,
            icon: (
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ),
          },
        ]
      : []),
    {
      key: "mikrotik",
      title: "Mikrotik",
      path: `${basePath}/mikrotik`,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
      ),
    },
    {
      key: "portais",
      title: "Portais",
      path: `${basePath}/portais`,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      ),
    },
    {
      key: "campanhas",
      title: "Campanhas",
      path: `${basePath}/campanhas`,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
    },
    {
      key: "planos",
      title: "Planos",
      path: `${basePath}/planos`,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      key: "clientes",
      title: "Clientes",
      path: `${basePath}/clientes`,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      key: "radius",
      title: "Radius",
      path: `${basePath}/radius`,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      key: "whatsapp",
      title: "WhatsApp",
      path: `${basePath}/whatsapp`,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 20l1.3-3.9A9 9 0 113.9 18.7L3 20zm9-14a7 7 0 00-5.9 10.7l.3.5-.8 2.3 2.4-.8.5.3A7 7 0 1012 6z" />
        </svg>
      ),
    },
    {
      key: "configuracoes",
      title: "Configurações",
      path: `${basePath}/configuracoes`,
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const filteredMenuItems = menuItems
    .map((item) => {
      if (item.children) {
        const filteredChildren = item.children.filter((child) => {
          if (!child.key || child.key === "dashboard") return true;
          if (isSuperAdmin) return true;
          if (child.key === "empresas" || child.key === "grupos-permissao") return false;
          return hasPermission(child.key, "ver");
        });
        return filteredChildren.length > 0 ? { ...item, children: filteredChildren } : null;
      }
      if (!item.key || item.key === "dashboard") return item;
      if (isSuperAdmin) return item;
      if (item.key === "empresas") return null;
      if (item.key === "configuracoes") {
        return hasPermission("configuracoes", "ver") || hasPermission("usuarios", "ver") ? item : null;
      }
      if (item.key === "mikrotik") {
        return hasPermission("mikrotiks", "ver") || hasPermission("vpn", "ver") ? item : null;
      }
      if (item.key === "clientes") {
        return hasPermission("clientes", "ver") || hasPermission("leads", "ver") ? item : null;
      }
      if (item.key === "radius") {
        return (
          hasPermission("radius", "ver") ||
          hasPermission("sessoes", "ver") ||
          hasPermission("sessoeslog", "ver") ||
          hasPermission("compliance", "ver")
        )
          ? item
          : null;
      }
      return hasPermission(item.key, "ver") ? item : null;
    })
    .filter(Boolean);

  const isActive = (path) => {
    const [pathname, search = ""] = path.split("?");
    if (pathname === basePath) return location.pathname === basePath;
    if (!location.pathname.startsWith(pathname)) return false;
    if (search) {
      const want = new URLSearchParams(search);
      const have = new URLSearchParams(location.search);
      for (const [k, v] of want.entries()) {
        if (have.get(k) !== v) return false;
      }
      return true;
    }
    if (pathname.endsWith("/radius") && location.pathname.match(/\/(radius|sessoes|sessoeslog|compliance)(\/|$)/)) {
      return true;
    }
    if (pathname.endsWith("/mikrotik") && location.pathname.match(/\/(mikrotik|mikrotiks|vpn)(\/|$)/)) {
      return true;
    }
    if (pathname.endsWith("/clientes") && location.pathname.match(/\/(clientes|lgpd|leads)(\/|$)/)) {
      return true;
    }
    if (pathname.endsWith("/configuracoes") && location.pathname.includes("/configuracoes")) {
      return true;
    }
    return location.pathname === pathname && !location.search;
  };

  const pageTitle = useMemo(
    () => resolveAdminPageTitle(location.pathname, location.search, basePath),
    [location.pathname, location.search, basePath]
  );

  const handleSwitchEmpresa = async (newId) => {
    if (newId === user?.empresa_id) return;
    setSwitchingEmpresa(true);
    try {
      const emp = await switchEmpresa(newId);
      window.location.href = `/admin/${emp.slug}`;
    } catch {
      alert("Erro ao trocar empresa");
    } finally {
      setSwitchingEmpresa(false);
    }
  };

  return (
    <div className="rn-admin-shell">
      {sidebarOpen && (
        <div className="rn-sidebar-overlay lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <aside className={`rn-admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        {isSuperAdmin && (
          <div className="rn-admin-sidebar__head">
            <Link to="/super" className="rn-nav-item rn-super-link" onClick={() => setSidebarOpen(false)}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Painel Super Admin</span>
            </Link>
          </div>
        )}

        <nav className="rn-admin-sidebar__nav">
          {filteredMenuItems.map((item) => {
            if (item.children) {
              const isOpen = openMenus[item.key] || false;
              const isChildActive = item.children.some((child) => isActive(child.path));

              return (
                <div key={item.key}>
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.key)}
                    className={`rn-nav-item ${isChildActive ? "active" : ""}`}
                    style={{ justifyContent: "space-between" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {item.icon}
                      {item.title}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="rn-nav-sub">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`rn-nav-item ${isActive(child.path) ? "active" : ""}`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`rn-nav-item ${isActive(item.path) ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="rn-admin-sidebar__footer">
          <div className="rn-sidebar-footer__brand">
            <strong>CenterSpot</strong>
            <span> · Hotspot &amp; WhatsApp</span>
          </div>
          <p className="rn-sidebar-footer__credit">
            Desenvolvido por <strong>Center Tech</strong>
          </p>
        </div>
      </aside>

      <div className="rn-admin-workspace">
        <AdminTopBar
          pageTitle={pageTitle}
          user={user}
          empresas={empresas}
          switchingEmpresa={switchingEmpresa}
          onSwitchEmpresa={handleSwitchEmpresa}
          onLogout={handleLogout}
          onOpenMenu={() => setSidebarOpen(true)}
        />

        <main className="rn-admin-main__content">
          {mostrarAvisoWhatsapp && (
            <div className="rn-alert rn-alert--warning" style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <strong>WhatsApp desconectado.</strong>{" "}
                {whatsappStatus?.exists
                  ? "A instância não está conectada. Mensagens automáticas não serão enviadas."
                  : "Nenhuma instância configurada para esta empresa."}{" "}
                <Link to={`${basePath}/whatsapp`} style={{ fontWeight: 600, color: "inherit" }}>
                  Configurar agora
                </Link>
              </div>
              <button type="button" className="rn-btn rn-btn--ghost rn-btn--sm" onClick={fecharAvisoWhatsapp} aria-label="Fechar aviso">
                ×
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
