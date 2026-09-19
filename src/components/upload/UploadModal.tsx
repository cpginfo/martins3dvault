"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  X,
  FileBox,
  Image as ImageIcon,
  FileText,
  Check,
  AlertCircle,
  Plus,
  Layers,
  FolderTree,
} from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (newModel: any) => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [filamentType, setFilamentType] = useState("PLA");
  const [collectionId, setCollectionId] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [libraryId, setLibraryId] = useState("");

  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [libraries, setLibraries] = useState<Array<{ id: string; name: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [successModel, setSuccessModel] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setFiles([]);
      setModelName("");
      setDescription("");
      setErrorMsg("");
      setSuccessModel(null);
      setUploading(false);
      setProgress(0);
      setIsCreatingNewCollection(false);

      // Carrega bibliotecas e coleções
      fetch("/api/libraries")
        .then((r) => (r.ok ? r.json() : []))
        .then((libs) => {
          setLibraries(libs);
          if (libs.length > 0) setLibraryId(libs[0].id);
        })
        .catch(() => {});

      fetch("/api/collections")
        .then((r) => (r.ok ? r.json() : []))
        .then((cols) => setCollections(cols))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const newFileList = Array.from(selectedFiles);
    setFiles((prev) => [...prev, ...newFileList]);

    // Se ainda não temos um nome, sugere o nome do primeiro arquivo 3D
    if (!modelName) {
      const first3D = newFileList.find((f) => {
        const ext = f.name.toLowerCase();
        return ext.endsWith(".stl") || ext.endsWith(".3mf") || ext.endsWith(".obj") || ext.endsWith(".step");
      });
      if (first3D) {
        const base = first3D.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setModelName(base);
      }
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setErrorMsg("Selecione pelo menos um arquivo 3D.");
      return;
    }

    const has3D = files.some((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith(".stl") || ext.endsWith(".3mf") || ext.endsWith(".obj") || ext.endsWith(".step");
    });

    if (!has3D) {
      setErrorMsg("O envio precisa conter pelo menos um arquivo 3D (.stl, .3mf, .obj, .step).");
      return;
    }

    setUploading(true);
    setErrorMsg("");
    setProgress(20);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    if (modelName) formData.append("name", modelName.trim());
    if (description) formData.append("description", description.trim());
    if (filamentType) formData.append("filamentType", filamentType);
    if (libraryId) formData.append("libraryId", libraryId);

    if (isCreatingNewCollection && newCollectionName.trim()) {
      formData.append("newCollectionName", newCollectionName.trim());
    } else if (collectionId) {
      formData.append("collectionId", collectionId);
    }

    try {
      setProgress(50);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setProgress(90);
      if (res.ok) {
        const created = await res.json();
        setProgress(100);
        setSuccessModel(created);
        if (onUploadSuccess) onUploadSuccess(created);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Falha ao enviar arquivos");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão durante o upload");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl rounded-2xl bg-surface-container-low border border-white/10 shadow-2xl p-6 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-primary-container/20 border border-primary-container/30 text-primary">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">Upload Manual de Modelos 3D</h2>
            <p className="text-xs text-on-surface-variant">
              Adicione arquivos STL, 3MF, OBJ, imagens de capa e manuais PDF diretamente.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-error-container/40 border border-error/30 text-xs text-error flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successModel ? (
          /* Success Screen */
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-tertiary/20 border border-tertiary/30 text-tertiary flex items-center justify-center mb-3">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-on-surface mb-1">Upload Realizado com Sucesso!</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mb-6">
              O modelo &quot;{successModel.name}&quot; foi processado, indexado e já está disponível para visualização 3D.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold shadow-lg shadow-primary-container/30 transition-all"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          /* Form Screen */
          <form onSubmit={handleUpload} className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/15 hover:border-primary-container/50 rounded-2xl p-6 text-center cursor-pointer bg-white/[0.02] hover:bg-primary-container/[0.03] transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".stl,.3mf,.obj,.step,.stp,.png,.jpg,.jpeg,.webp,.pdf"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-xl bg-primary-container/15 border border-primary-container/30 text-primary flex items-center justify-center mx-auto mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium text-on-surface">
                Arraste os arquivos aqui ou <span className="text-primary underline">clique para selecionar</span>
              </p>
              <p className="text-[10px] text-outline mt-1">
                Suporta STL, 3MF, OBJ, STEP, fotos de capa (JPG, PNG) e manuais (PDF)
              </p>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Arquivos Selecionados ({files.length}):
                </span>
                {files.map((file, idx) => {
                  const ext = file.name.toLowerCase();
                  const is3D = ext.endsWith(".stl") || ext.endsWith(".3mf") || ext.endsWith(".obj");
                  const isImg = ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg");

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300"
                    >
                      <div className="flex items-center gap-2 truncate">
                        {is3D ? (
                          <FileBox className="w-4 h-4 text-indigo-400 shrink-0" />
                        ) : isImg ? (
                          <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Model Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Nome do Modelo *
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Ex: Suporte de Headset Articulado"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                required
              />
            </div>

            {/* Collection & Library row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Coleção */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Coleção</label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingNewCollection(!isCreatingNewCollection)}
                    className="text-[10px] text-indigo-400 hover:underline"
                  >
                    {isCreatingNewCollection ? "Selecionar existente" : "+ Criar nova"}
                  </button>
                </div>

                {isCreatingNewCollection ? (
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Nome da nova coleção..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                ) : (
                  <select
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0f121d] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="">Nenhuma coleção</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Biblioteca de Destino */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Biblioteca de Armazenamento
                </label>
                <select
                  value={libraryId}
                  onChange={(e) => setLibraryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0f121d] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  {libraries.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filament Type */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Material Recomendado
              </label>
              <select
                value={filamentType}
                onChange={(e) => setFilamentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0f121d] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="PLA">PLA</option>
                <option value="PETG">PETG</option>
                <option value="ABS">ABS</option>
                <option value="TPU">TPU (Flexível)</option>
                <option value="RESIN">Resina UV</option>
                <option value="NYLON">Nylon / PA</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Descrição / Notas
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes ou instruções de impressão..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Progress Bar */}
            {uploading && (
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-1.5 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={files.length === 0 || uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
                <span>{uploading ? "Enviando e Processando..." : "Enviar Modelo"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
