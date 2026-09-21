"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER" | "VIEWER";
  avatar: string | null;
  createdAt: string;
}

export default function UsersPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER" | "VIEWER">("USER");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal de edição (todos os 5 campos: Nome, Foto, Senha, E-mail, Perfil)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"ADMIN" | "USER" | "VIEWER">("USER");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Search filter
  const [searchFilter, setSearchFilter] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else if (res.status === 403) {
        setError(
          "Apenas administradores podem acessar a gestão de usuários. Faça login com uma conta de administrador."
        );
      } else {
        setError("Não foi possível carregar a lista de usuários.");
      }
    } catch {
      setError("Erro ao conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAvatarFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setTargetAvatar: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem selecionada excede o limite máximo de 5MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setTargetAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError("Nome, e-mail e senha são obrigatórios.");
      return;
    }

    if (password.length < 6) {
      setFormError("A senha deve possuir no mínimo 6 caracteres.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          avatar,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao criar usuário");
      }

      setName("");
      setEmail("");
      setPassword("");
      setRole("USER");
      setAvatar(null);
      if (createFileInputRef.current) createFileInputRef.current.value = "";
      setShowCreateModal(false);
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Erro desconhecido");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPassword("");
    setEditAvatar(u.avatar || null);
    setFormError(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setFormError(null);

    if (!editName.trim() || !editEmail.trim()) {
      setFormError("Nome e e-mail não podem ficar vazios.");
      setSavingEdit(false);
      return;
    }

    try {
      const payload: any = {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        avatar: editAvatar,
      };

      if (editPassword.trim()) {
        if (editPassword.length < 6) {
          throw new Error("A nova senha deve possuir no mínimo 6 caracteres.");
        }
        payload.password = editPassword;
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao atualizar usuário");
      }

      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar alterações");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!confirm(`Deseja realmente remover o usuário "${userName}"?`)) return;

    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchUsers();
      } else {
        const errData = await res.json();
        alert(errData.error || "Falha ao remover usuário");
      }
    } catch {
      alert("Erro de conexão ao remover usuário");
    }
  };

  const filteredUsers = searchFilter
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          u.email.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : users;

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const operatorCount = users.filter((u) => u.role === "USER").length;
  const viewerCount = users.filter((u) => u.role === "VIEWER").length;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "pl-20" : "pl-72"
        }`}
      >
        <Navbar isSidebarCollapsed={isSidebarCollapsed} />

        <main className="relative pt-16 bg-surface min-h-screen w-full px-6 pb-12">
          <div className="flex flex-col w-full gap-6 pt-6">
            {/* Top Header Strip */}
            <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl bg-surface-container-low shadow-sm border border-white/5">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-surface-container-highest text-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-bold text-on-surface tracking-tight">
                    Gestão de Usuários & Permissões
                  </h1>
                  <p className="text-xs text-on-surface-variant max-w-xl">
                    Controle de Acesso Baseado em Papéis (RBAC) para operadores de oficina,
                    makers e visualizadores convidados.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setName("");
                  setEmail("");
                  setPassword("");
                  setRole("USER");
                  setAvatar(null);
                  setFormError(null);
                  if (createFileInputRef.current) createFileInputRef.current.value = "";
                  setShowCreateModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-[0_0_12px_rgba(249,115,22,0.35)] self-start lg:self-auto cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Novo Usuário</span>
              </button>
            </section>

            {/* Metric Strip */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-outline uppercase tracking-wider">
                  Total de Contas
                </span>
                <span className="text-2xl font-bold text-on-surface font-mono">{users.length}</span>
                <span className="text-[11px] text-tertiary font-mono">Controle Local</span>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-outline uppercase tracking-wider">
                  Administradores
                </span>
                <span className="text-2xl font-bold text-primary font-mono">{adminCount}</span>
                <span className="text-[11px] text-primary-container font-mono">Acesso Total</span>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-outline uppercase tracking-wider">
                  Operadores
                </span>
                <span className="text-2xl font-bold text-secondary font-mono">{operatorCount}</span>
                <span className="text-[11px] text-secondary font-mono">Bancada & Impressão</span>
              </div>
              <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-outline uppercase tracking-wider">
                  Visualizadores
                </span>
                <span className="text-2xl font-bold text-outline font-mono">{viewerCount}</span>
                <span className="text-[11px] text-on-surface-variant font-mono">Somente Leitura</span>
              </div>
            </section>

            {/* Filter and Table Section */}
            <section className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por nome ou e-mail..."
                    className="w-full bg-surface-container-low border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              {error ? (
                <div className="p-6 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs">
                  {error}
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
                    sync
                  </span>
                  <span className="text-xs font-mono">Carregando usuários...</span>
                </div>
              ) : (
                <div className="w-full overflow-x-auto rounded-xl bg-surface-container-low border border-white/5 shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-outline bg-surface-container-lowest">
                        <th className="py-3 px-4">Usuário</th>
                        <th className="py-3 px-4">E-mail</th>
                        <th className="py-3 px-4">Papel (Role)</th>
                        <th className="py-3 px-4">Data de Cadastro</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="border-b border-white/5 hover:bg-surface-container-high transition-colors"
                        >
                          <td className="py-3 px-4 font-semibold text-on-surface">
                            <div className="flex items-center gap-2.5">
                              {u.avatar ? (
                                <img
                                  src={u.avatar}
                                  alt={u.name}
                                  className="w-8 h-8 rounded-full object-cover border border-white/10 flex-shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary-container font-mono text-xs font-bold border border-white/5 flex-shrink-0">
                                  {u.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <span>{u.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-on-surface-variant">{u.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                u.role === "ADMIN"
                                  ? "bg-primary-container/20 text-primary border border-primary-container/30"
                                  : u.role === "USER"
                                  ? "bg-secondary/20 text-secondary border border-secondary/30"
                                  : "bg-surface-container-highest text-on-surface-variant border border-white/5"
                              }`}
                            >
                              {u.role === "ADMIN"
                                ? "ADMIN"
                                : u.role === "USER"
                                ? "OPERADOR"
                                : "VISITANTE"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-outline text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenEdit(u)}
                                className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
                                title="Editar usuário (nome, foto, senha, e-mail, perfil)"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-surface-container-highest transition-colors cursor-pointer"
                                title="Excluir usuário"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Modal Criar Usuário: Nome, Foto, Senha, E-mail, Perfil */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-surface-container-low border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary-container text-[22px]">person_add</span>
                <h2 className="text-base font-semibold text-on-surface">Novo Usuário</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-error text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="flex flex-col gap-3.5">
              {/* Foto de Perfil */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-surface-container-lowest border border-white/5">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-surface-container-highest border border-white/10 flex items-center justify-center flex-shrink-0">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="Preview Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-[26px] text-on-surface-variant">
                      person
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-xs font-semibold text-on-surface">Foto de Perfil</span>
                  <span className="text-[10px] text-on-surface-variant">PNG, JPG ou WebP (máx. 5MB)</span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => createFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-[11px] font-medium border border-white/5 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                      <span>{avatar ? "Trocar Foto" : "Escolher Foto"}</span>
                    </button>
                    {avatar && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatar(null);
                          if (createFileInputRef.current) createFileInputRef.current.value = "";
                        }}
                        className="px-2 py-1 rounded bg-error-container/20 text-error hover:bg-error-container/30 text-[11px] font-medium border border-error/20 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={createFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleAvatarFileSelect(e, setAvatar)}
                />
              </div>

              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  required
                />
              </div>

              {/* E-mail */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@exemplo.com"
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                  required
                />
              </div>

              {/* Senha */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Senha Temporária</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  required
                />
              </div>

              {/* Perfil */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Papel / Nível de Acesso</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                >
                  <option value="USER">Operador (Carregar G-Code, Imprimir, Gerenciar Modelos)</option>
                  <option value="ADMIN">Administrador (Acesso Total & Gestão de Usuários)</option>
                  <option value="VIEWER">Visualizador (Somente Leitura e Visualização 3D)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5 mt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Criando..." : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuário: Nome, Foto, Senha, E-mail, Perfil */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-surface-container-low border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-primary-container text-[22px]">manage_accounts</span>
                <h2 className="text-base font-semibold text-on-surface">
                  Editar Usuário
                </h2>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-error text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] flex-shrink-0">error</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
              {/* Foto de Perfil */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-surface-container-lowest border border-white/5">
                <div className="relative w-14 h-14 rounded-full overflow-hidden bg-surface-container-highest border border-white/10 flex items-center justify-center flex-shrink-0">
                  {editAvatar ? (
                    <img
                      src={editAvatar}
                      alt="Preview Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-container font-mono text-sm font-bold">
                      {editName ? editName.slice(0, 2).toUpperCase() : "US"}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-xs font-semibold text-on-surface">Foto de Perfil</span>
                  <span className="text-[10px] text-on-surface-variant">PNG, JPG ou WebP (máx. 5MB)</span>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest text-[11px] font-medium border border-white/5 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                      <span>{editAvatar ? "Trocar Foto" : "Escolher Foto"}</span>
                    </button>
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditAvatar(null);
                          if (editFileInputRef.current) editFileInputRef.current.value = "";
                        }}
                        className="px-2 py-1 rounded bg-error-container/20 text-error hover:bg-error-container/30 text-[11px] font-medium border border-error/20 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => handleAvatarFileSelect(e, setEditAvatar)}
                />
              </div>

              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Nome Completo</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  required
                />
              </div>

              {/* E-mail */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">E-mail</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                  required
                />
              </div>

              {/* Perfil */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Papel / Nível de Acesso</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                >
                  <option value="USER">Operador (Carregar G-Code, Imprimir, Gerenciar Modelos)</option>
                  <option value="ADMIN">Administrador (Acesso Total & Gestão de Usuários)</option>
                  <option value="VIEWER">Visualizador (Somente Leitura e Visualização 3D)</option>
                </select>
              </div>

              {/* Redefinir Senha */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-on-surface">
                    Redefinir Senha
                  </label>
                  <span className="text-[10px] text-on-surface-variant font-normal">
                    Opcional
                  </span>
                </div>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Deixe em branco para manter a senha atual"
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/5 mt-1">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium hover:bg-surface-container-highest transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
