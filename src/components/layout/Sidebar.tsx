"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }
  };

interface NavItem {
  name: string;
  href: string;
  icon: string;
  activeColor: string;
  hasPing?: boolean;
}

interface NavSection {
  group: string;
  badge?: string;
  items: NavItem[];
}

  const navItems: NavSection[] = [
    {
      group: "Repositórios Locais",
      items: [
        {
          name: "Coleções",
          href: "/collections",
          icon: "dataset",
          activeColor: "text-primary",
        },
        {
          name: "Modelos 3D",
          href: "/",
          icon: "view_in_ar",
          activeColor: "text-secondary",
        },
        {
          name: "Mapear Pastas & Scan",
          href: "/libraries",
          icon: "sync_saved_locally",
          activeColor: "text-tertiary",
          hasPing: true,
        },
      ],
    },
    {
      group: "Oficina de Impressão",
      badge: "Oficina 01",
      items: [
        {
          name: "Terminal de Oficina & Bancada",
          href: "/metrics",
          icon: "precision_manufacturing",
          activeColor: "text-secondary",
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
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-base text-on-surface tracking-tight leading-none truncate">
                  Martins<span className="text-primary-container font-bold">3D</span>Vault
                </span>
                <span className="text-[10px] text-secondary tracking-widest uppercase font-mono mt-0.5">
                  Additive Vault v2.4
                </span>
              </div>
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
        <div className="py-3 flex flex-col gap-4 overflow-y-auto">
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
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);

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

      {/* Bottom Area: Storage NAS & User Profile */}
      <div className="flex flex-col p-3 gap-3 bg-surface-container-lowest border-t border-white/5">
        {/* Storage NAS Widget */}
        {!isCollapsed ? (
          <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary-container">
                  hard_drive
                </span>
                <span className="text-xs font-semibold text-on-surface">Storage NAS</span>
              </div>
              <span className="text-xs text-secondary font-mono font-medium">35%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
              <div className="bg-primary-container h-full w-[24%]" title="Modelos 3D"></div>
              <div className="bg-secondary h-full w-[11%]" title="G-Codes & Slices"></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
              <span>1.4 TB / 4 TB</span>
              <span className="text-tertiary">RAID 5 OK</span>
            </div>
          </div>
        ) : (
          <div
            className="flex justify-center p-2 rounded-lg bg-surface-container-low text-primary-container"
            title="Storage NAS: 1.4 TB / 4 TB (35%)"
          >
            <span className="material-symbols-outlined text-[20px]">hard_drive</span>
          </div>
        )}

        {/* User Badge */}
        <div className="relative">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <Image
                  src="/avatar.png"
                  alt="Profile"
                  width={32}
                  height={32}
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
                onClick={handleLogout}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-error-container/40 text-error hover:text-white transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Encerrar Sessão</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
