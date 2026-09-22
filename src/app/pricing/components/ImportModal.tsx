"use client";

import React, { useState, useRef } from "react";
import { formatBRL } from "@/lib/pricing/calculator";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [csvContent, setCsvContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    importedSales: number;
    importedBudgets: number;
    totalImported: number;
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.onerror = () => {
      setError("Erro ao ler o arquivo selecionado.");
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const template =
      "Produto;Material;Custo/kg (R$);Material gasto (g);Tempo de impressão (horas);Tempo de impressão (minutos);Valor Vendido;Cliente\n" +
      "Luminária Voronoi LED;PLA Standard;110,00;120;4;30;150,00;Mariana Silva\n" +
      "Suporte Articulado Câmera;PETG;130,00;85;3;00;95,00;Oficina Maker\n" +
      "Engrenagem Helicoidal RC;ABS;120,00;35;1;15;;Carlos Drone\n";

    const blob = new Blob(["\ufeff" + template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "modelo_vendas_martins3dvault.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!csvContent.trim()) {
      setError("Por favor, selecione um arquivo CSV ou cole os dados da planilha.");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/pricing/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao processar arquivo.");
      }

      setResult(data);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao importar dados.";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const previewLines = csvContent
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">table_view</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Importar Vendas e Orçamentos da Planilha
              </h3>
              <p className="text-xs text-on-surface-variant">
                Carregue registros históricos do Excel diretamente para o banco de dados
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-sm">
          {/* Instrução e Formato Suportado */}
          <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/25 text-xs text-on-surface-variant space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                Colunas Reconhecidas Automaticamente
              </span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1 text-primary-container hover:underline font-medium text-xs"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Baixar Planilha Modelo (.csv)
              </button>
            </div>
            <p>
              <strong>Campos:</strong> Produto, Material, Custo/kg (R$), Material gasto (g), Tempo (horas), Tempo (minutos), Valor Vendido, Cliente.
            </p>
            <p className="text-[11px] text-on-surface-variant">
              💡 <em>Linhas com &quot;Valor Vendido&quot; preenchido são salvas como vendas concretizadas e entram no Dashboard. Se estiver vazio, são salvas como orçamentos abertos.</em>
            </p>
          </div>

          {/* Abas de Envio: Arquivo CSV vs Colar Texto */}
          <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
            <button
              onClick={() => setActiveTab("file")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "file"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Arquivo CSV (.csv)
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "paste"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-sm">content_paste</span>
              Colar do Excel (Ctrl+V)
            </button>
          </div>

          {/* Erro */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          {/* Sucesso */}
          {result && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-emerald-500 text-lg">task_alt</span>
                Importação Concluída com Sucesso!
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <span className="block text-[10px] text-on-surface-variant">Vendas Efetivas</span>
                  <span className="font-bold text-sm font-mono">{result.importedSales}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <span className="block text-[10px] text-on-surface-variant">Orçamentos Abertos</span>
                  <span className="font-bold text-sm font-mono">{result.importedBudgets}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <span className="block text-[10px] text-on-surface-variant">Faturamento</span>
                  <span className="font-bold text-sm font-mono">{formatBRL(result.totalRevenue)}</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <span className="block text-[10px] text-on-surface-variant">Lucro Líquido</span>
                  <span className="font-bold text-sm font-mono">{formatBRL(result.totalProfit)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Upload Arquivo */}
          {activeTab === "file" && !result && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-outline-variant/40 hover:border-primary-container/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-surface-container-low hover:bg-surface-container"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary-container flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                </div>
                <span className="font-bold text-on-surface text-sm">
                  {fileName ? fileName : "Clique para selecionar o arquivo CSV do Excel"}
                </span>
                <span className="text-xs text-on-surface-variant mt-1">
                  Formatos suportados: CSV separado por vírgula (,) ou ponto-e-vírgula (;)
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Colar Texto Direto */}
          {activeTab === "paste" && !result && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-on-surface-variant">
                Selecione as linhas no Excel, copie (Ctrl+C) e cole abaixo:
              </label>
              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => {
                  setCsvContent(e.target.value);
                  setError(null);
                  setResult(null);
                }}
                placeholder="Cole aqui os dados copiados do Excel (com o cabeçalho)..."
                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs font-mono text-on-surface focus:outline-none focus:border-primary-container resize-y"
              />
            </div>
          )}

          {/* Pré-visualização das Primeiras Linhas */}
          {previewLines.length > 0 && !result && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-on-surface-variant block">
                Pré-visualização ({previewLines.length} primeiras linhas):
              </span>
              <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 overflow-x-auto">
                <pre className="text-[11px] font-mono text-on-surface whitespace-pre">
                  {previewLines.join("\n")}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            {result ? "Fechar" : "Cancelar"}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={uploading || !csvContent.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary-container text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
            >
              {uploading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Importando Vendas...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">file_upload</span>
                  Subir para o Banco
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
