"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { APP_VERSION } from "@/lib/version";
import { useTheme } from "@/lib/theme/ThemeContext";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface CollectionSimple {
  id: string;
  name: string;
  modelsCount: number;
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
  activeColor: string;
  hasPing?: boolean;
  isCollections?: boolean;
}

interface NavSection {
  group: string;
  badge?: string;
  items: NavItem[];
}

export default function Sidebar({
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string; avatar?: string | null } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionSimple[]>([]);
  const [collectionsExpanded, setCollectionsExpanded] = useState<boolean | null>(null);
  const collectionsOpen =
    collectionsExpanded !== null ? collectionsExpanded : pathname.startsWith("/collections");
  const [currentSearch, setCurrentSearch] = useState("");

  useEffect(() => {
    const updateSearch = () => {
      if (typeof window !== "undefined") {
        setCurrentSearch(window.location.search);
      }
    };
    updateSearch();
    window.addEventListener("popstate", updateSearch);
    window.addEventListener("locationchange", updateSearch);
    return () => {
      window.removeEventListener("popstate", updateSearch);
      window.removeEventListener("locationchange", updateSearch);
    };
  }, [pathname]);

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const toggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed((prev) => !prev);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    const load = () => {
      fetch("/api/collections")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (!ignore && Array.isArray(data)) {
            setCollections(
              data.map((c: { id: string; name: string; modelsCount?: number }) => ({
                id: c.id,
                name: c.name,
                modelsCount: c.modelsCount || 0,
              }))
            );
          }
        })
        .catch(() => {});
    };

    load();
    const handleRefresh = () => {
      load();
    };
    window.addEventListener("refreshCollections", handleRefresh);
    return () => {
      ignore = true;
      window.removeEventListener("refreshCollections", handleRefresh);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }
  };

  const navItems: NavSection[] = [
    {
      group: "Repositórios Locais",
      items: [
        {
          name: "Coleções",
          href: "/collections",
          icon: "dataset",
          activeColor: "text-primary-container",
          isCollections: true,
        },
        {
          name: "Modelos 3D",
          href: "/",
          icon: "view_in_ar",
          activeColor: "text-secondary",
        },
      ],
    },
    {
      group: "Calculadora",
      items: [
        {
          name: "Orçamentos & Preços",
          href: "/pricing",
          icon: "calculate",
          activeColor: "text-primary-container",
        },
      ],
    },
    {
      group: "Métricas",
      items: [
        {
          name: "Métricas dos Arquivos",
          href: "/metrics",
          icon: "analytics",
          activeColor: "text-secondary",
        },
        {
          name: "Métricas de Vendas",
          href: "/pricing?tab=dashboard",
          icon: "monitoring",
          activeColor: "text-emerald-500",
        },
      ],
    },
    {
      group: "Configurações",
      items: [
        {
          name: "Mapear Pastas & Scan",
          href: "/libraries",
          icon: "sync_saved_locally",
          activeColor: "text-tertiary",
          hasPing: true,
        },
        {
          name: "Gestão de Usuários",
          href: "/users",
          icon: "admin_panel_settings",
          activeColor: "text-primary-container",
        },
      ],
    },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-surface-container-low z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.5)] border-r border-white/5 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Top Header & Brand */}
      <div className="flex flex-col">
        <div className="h-16 px-4 flex items-center justify-between bg-surface-container-lowest border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden group">
            <div className="relative w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-surface-container-high p-1">
              <Image
                src="/logo.png"
                alt="Martins3DVault"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-base text-on-surface tracking-tight leading-none truncate">
                Martins<span className="text-primary-container font-bold">3D</span>Vault
              </span>
            )}
          </Link>
          <button
            onClick={toggleCollapse}
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors p-1.5 rounded-lg"
            title={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isCollapsed ? "dock_to_right" : "dock_to_left"}
            </span>
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="py-3 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navItems.map((section, idx) => (
            <div key={idx} className="flex flex-col gap-1">
              {!isCollapsed && (
                <div className="px-5 py-1 flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
                    {section.group}
                  </span>
                  {section.badge && (
                    <span className="text-[10px] text-secondary font-mono px-1.5 py-0.5 rounded bg-surface-container-highest">
                      {section.badge}
                    </span>
                  )}
                </div>
              )}
              <nav className="flex flex-col gap-1 px-3">
                {section.items.map((item) => {
                  const isActive = (() => {
                    if (item.href === "/") return pathname === "/";
                    if (item.href.includes("?")) {
                      const [itemPath, itemQuery] = item.href.split("?");
                      return pathname === itemPath && currentSearch.includes(itemQuery);
                    }
                    if (item.href === "/pricing") {
                      return pathname === "/pricing" && !currentSearch.includes("tab=dashboard");
                    }
                    return pathname.startsWith(item.href);
                  })();

                  // Special dropdown treatment for "Coleções"
                  if (item.isCollections && !isCollapsed) {
                    return (
                      <div key={item.href} className="flex flex-col">
                        <div
                          className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                            isActive
                              ? "bg-surface-container-highest text-on-surface font-semibold shadow-inner border border-white/10"
                              : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                          }`}
                        >
                          <Link
                            href="/collections"
                            className="flex items-center gap-3 min-w-0 flex-1"
                          >
                            <span
                              className={`material-symbols-outlined text-[22px] flex-shrink-0 transition-colors ${
                                isActive
                                  ? item.activeColor
                                  : "text-on-surface-variant group-hover:text-on-surface"
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span className="truncate">{item.name}</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCollectionsExpanded((prev) =>
                                prev !== null ? !prev : !pathname.startsWith("/collections")
                              );
                            }}
                            className="p-1 rounded hover:bg-white/10 text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center"
                            title={collectionsOpen ? "Recolher lista de coleções" : "Expandir lista de coleções"}
                          >
                            <span
                              className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                                collectionsOpen ? "rotate-180 text-primary-container" : ""
                              }`}
                            >
                              expand_more
                            </span>
                          </button>
                        </div>

                        {/* Collections Dropdown List */}
                        {collectionsOpen && (
                          <div className="flex flex-col gap-0.5 pl-6 pr-1 py-1.5 mt-1 border-l-2 border-white/5 ml-5">
                            <Link
                              href="/collections"
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                pathname === "/collections"
                                  ? "text-primary-container bg-surface-container-highest font-bold"
                                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <span className="material-symbols-outlined text-[14px]">grid_view</span>
                                <span>Todas as Coleções</span>
                              </span>
                              <span className="text-[10px] font-mono text-outline px-1.5 py-0.5 rounded bg-surface-container">
                                {collections.length}
                              </span>
                            </Link>

                            {collections.length === 0 ? (
                              <span className="px-2.5 py-1.5 text-[11px] text-outline font-mono italic">
                                Nenhuma coleção cadastrada
                              </span>
                            ) : (
                              collections.map((col) => {
                                const isColActive = pathname === `/collections/${col.id}`;
                                return (
                                  <Link
                                    key={col.id}
                                    href={`/collections/${col.id}`}
                                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                      isColActive
                                        ? "text-secondary font-bold bg-surface-container-highest border border-secondary/20 shadow-sm"
                                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                                    }`}
                                    title={`${col.name} (${col.modelsCount} modelos)`}
                                  >
                                    <span className="flex items-center gap-2 truncate">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                          isColActive ? "bg-secondary" : "bg-outline/50"
                                        }`}
                                      ></span>
                                      <span className="truncate">{col.name}</span>
                                    </span>
                                    <span className="text-[10px] font-mono text-outline px-1 rounded bg-surface-container flex-shrink-0 ml-1">
                                      {col.modelsCount}
                                    </span>
                                  </Link>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm font-medium ${
                        isActive
                          ? "bg-surface-container-highest text-on-surface font-semibold shadow-inner border border-white/10"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`material-symbols-outlined text-[22px] flex-shrink-0 transition-colors ${
                            isActive
                              ? item.activeColor
                              : "text-on-surface-variant group-hover:text-on-surface"
                          }`}
                        >
                          {item.icon}
                        </span>
                        {!isCollapsed && (
                          <span className="truncate">{item.name}</span>
                        )}
                      </div>

                      {!isCollapsed && item.hasPing && (
                        <span className="flex h-2 w-2 relative flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-container"></span>
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Area: User Profile */}
      <div className="flex flex-col p-3 gap-3 bg-surface-container-lowest border-t border-white/5">
        {/* User Badge */}
        <div className="relative">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <Image
                  src={currentUser?.avatar || "/avatar.png"}
                  alt="Profile"
                  width={32}
                  height={32}
                  unoptimized
                  className="w-8 h-8 rounded-full object-cover border border-white/10"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-tertiary rounded-full ring-2 ring-surface-container-lowest"></span>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-on-surface leading-tight truncate">
                    {currentUser?.name || "Rodrigo Martins"}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                    <span className="text-[10px] text-primary-container uppercase font-mono font-medium">
                      {currentUser?.role || "Admin"}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors"
                title="Opções da conta"
              >
                <span className="material-symbols-outlined text-[18px]">more_vert</span>
              </button>
            )}
          </div>

          {/* User Popup Menu */}
          {userMenuOpen && !isCollapsed && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-surface-container-high border border-white/10 rounded-lg shadow-xl p-1 z-50 flex flex-col gap-0.5 text-xs">
              <Link
                href="/users"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-container-highest text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">settings</span>
                <span>Configurações</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                }}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded hover:bg-surface-container-highest text-on-surface transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-amber-500">
                    {theme === "dark" ? "light_mode" : "dark_mode"}
                  </span>
                  <span>{theme === "dark" ? "Modo Claro" : "Modo Escuro"}</span>
                </div>
                <span className="text-[10px] font-mono text-outline uppercase">{theme}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-error-container/40 text-error hover:text-white transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Encerrar Sessão</span>
              </button>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="flex items-center justify-between px-1 pt-1 border-t border-white/5 text-[10px] font-mono text-outline">
            <div className="flex items-center gap-1">
              <span>Tema:</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="hover:text-primary transition-colors cursor-pointer capitalize font-semibold flex items-center gap-1"
                title="Clique para alternar tema"
              >
                <span className="material-symbols-outlined text-[12px] text-amber-500">
                  {theme === "dark" ? "dark_mode" : "light_mode"}
                </span>
                <span>{theme === "dark" ? "Escuro" : "Claro"}</span>
              </button>
            </div>
            <span className="text-secondary font-medium">{APP_VERSION}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
