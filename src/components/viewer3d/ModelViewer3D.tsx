"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import {
  RotateCcw,
  Camera,
  Layers,
  Box,
  Check,
  Eye,
  EyeOff,
  Palette,
  Play,
  Pause,
  Compass,
} from "lucide-react";

export interface ModelFileItem {
  id: string;
  fileName: string;
  relativePath: string;
  format: string;
  fileSize: number;
  dimensionsX?: number | null;
  dimensionsY?: number | null;
  dimensionsZ?: number | null;
  triangleCount?: number | null;
  isPrimary?: boolean;
  isPrinted?: boolean;
}

interface ModelViewer3DProps {
  libraryId: string;
  files: ModelFileItem[];
  modelId: string;
  coverImageUrl?: string | null;
  onSnapshotSaved?: (coverUrl: string) => void;
}

type MaterialType = "pla" | "abs" | "translucent" | "matte";

const FILAMENT_COLORS = [
  { name: "Preto", hex: "#18181b" },
  { name: "Branco", hex: "#f8fafc" },
  { name: "Cinza", hex: "#64748b" },
  { name: "Vermelho", hex: "#ef4444" },
  { name: "Azul", hex: "#2563eb" },
  { name: "Verde", hex: "#16a34a" },
  { name: "Amarelo", hex: "#eab308" },
  { name: "Laranja", hex: "#f97316" },
  { name: "Roxo", hex: "#9333ea" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Dourado", hex: "#ca8a04" },
  { name: "Cobre", hex: "#b45309" },
];

export default function ModelViewer3D({
  libraryId,
  files,
  modelId,
  coverImageUrl,
  onSnapshotSaved,
}: ModelViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const boundingBoxHelperRef = useRef<THREE.Box3Helper | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [showBoundingBox, setShowBoundingBox] = useState(true);
  const [materialType, setMaterialType] = useState<MaterialType>("pla");
  const [materialColor, setMaterialColor] = useState("#2563eb");
  const [activeFiles, setActiveFiles] = useState<Record<string, boolean>>({});
  const [dimensions, setDimensions] = useState<{ x: number; y: number; z: number } | null>(null);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  // Inicializa a visibilidade de todos os arquivos como ativa
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    files.forEach((f) => {
      initial[f.id] = true;
    });
    setActiveFiles(initial);
  }, [files]);

  // Cria os materiais Three.js otimizados para Impressão 3D
  const createMaterial = (type: MaterialType, color: string, isWire: boolean) => {
    const baseColor = new THREE.Color(color);
    switch (type) {
      case "pla":
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.38,
          metalness: 0.05,
          wireframe: isWire,
        });
      case "abs":
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.65,
          metalness: 0.02,
          wireframe: isWire,
        });
      case "translucent":
        return new THREE.MeshPhysicalMaterial({
          color: baseColor,
          roughness: 0.15,
          transmission: 0.8,
          opacity: 0.75,
          transparent: true,
          wireframe: isWire,
        });
      case "matte":
      default:
        return new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.95,
          metalness: 0.0,
          wireframe: isWire,
        });
    }
  };

  // Inicializa o Canvas Three.js
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0b0e17");
    sceneRef.current = scene;

    // Câmera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(150, 150, 200);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controles Orbitais
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 2.0;
    controlsRef.current = controls;

    // Iluminação Profissional para Impressão 3D
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(150, 250, 200);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.7);
    fillLight.position.set(-150, 100, -150);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xc084fc, 0.8);
    rimLight.position.set(0, -100, -200);
    scene.add(rimLight);

    // Grid de Impressão (Build Plate 256x256mm estilo Bambu Lab / Prusa)
    const gridHelper = new THREE.GridHelper(256, 32, 0x6366f1, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Grupo de Objetos 3D carregados
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // Bounding Box Helper
    const bbox = new THREE.Box3();
    const bboxHelper = new THREE.Box3Helper(bbox, new THREE.Color(0x06b6d4));
    bboxHelper.visible = showBoundingBox;
    scene.add(bboxHelper);
    boundingBoxHelperRef.current = bboxHelper;

    // Loop de Animação
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Redimensionamento responsivo
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Carrega os arquivos 3D na cena
  useEffect(() => {
    const group = objectsGroupRef.current;
    const scene = sceneRef.current;
    if (!group || !scene || files.length === 0) return;

    // Limpa malhas anteriores
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      group.remove(child);
    }

    setLoading(true);
    setLoadProgress(null);
    setLoadError(null);

    const stlLoader = new STLLoader();
    const objLoader = new OBJLoader();
    const threeMfLoader = new ThreeMFLoader();

    let loadedCount = 0;
    const totalFiles = files.length;
    const overallBox = new THREE.Box3();

    files.forEach((file) => {
      const ext = file.format.toLowerCase();
      const fileUrl = `/api/assets/file?libraryId=${libraryId}&relPath=${encodeURIComponent(
        file.relativePath
      )}`;

      const currentMat = createMaterial(materialType, materialColor, wireframe);

      const onModelLoaded = (meshOrGroup: THREE.Object3D) => {
        meshOrGroup.name = file.id;

        // Arquivos STL/3MF em manufatura aditiva são exportados em Z-Up.
        // No Three.js o espaço é Y-Up. Rotacionamos -90 deg no eixo X para orientação vertical correta na mesa.
        meshOrGroup.rotation.x = -Math.PI / 2;
        meshOrGroup.updateMatrixWorld(true);

        // Aplica material a todos os nós filhos se for grupo
        meshOrGroup.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.material = currentMat;
            m.castShadow = true;
            m.receiveShadow = true;
          }
        });

        // Visibilidade inicial baseada no estado
        meshOrGroup.visible = activeFiles[file.id] !== false;
        group.add(meshOrGroup);

        loadedCount++;
        if (loadedCount === totalFiles) {
          // Calcula a Bounding Box geral para centralizar e posicionar na mesa de impressão
          overallBox.setFromObject(group);
          if (!overallBox.isEmpty()) {
            const size = new THREE.Vector3();
            overallBox.getSize(size);
            const center = new THREE.Vector3();
            overallBox.getCenter(center);

            // Ajusta o grupo para ficar centrado em X/Z e apoiado perfeitamente na mesa (y = 0)
            group.position.x = -center.x;
            group.position.z = -center.z;
            group.position.y = -overallBox.min.y;

            // Recalcula a caixa delimitadora após posicionamento
            overallBox.setFromObject(group);
            if (boundingBoxHelperRef.current) {
              boundingBoxHelperRef.current.box = overallBox;
            }

            // Centraliza a câmera no modelo olhando para o ponto médio de altura
            if (cameraRef.current && controlsRef.current) {
              const maxDim = Math.max(size.x, size.y, size.z, 50);
              const fov = cameraRef.current.fov * (Math.PI / 180);
              let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
              cameraDistance = Math.max(cameraDistance, 80);

              cameraRef.current.position.set(
                cameraDistance * 0.9,
                cameraDistance * 0.8,
                cameraDistance * 1.2
              );
              controlsRef.current.target.set(0, size.y / 2, 0);
              controlsRef.current.update();
            }

            setDimensions({
              x: Math.round(size.x * 10) / 10,
              y: Math.round(size.y * 10) / 10,
              z: Math.round(size.z * 10) / 10,
            });
          }
          setLoading(false);
          setLoadProgress(null);
        }
      };

      const onProgress = (xhr: ProgressEvent) => {
        if (xhr.lengthComputable && xhr.total > 0) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          setLoadProgress(percent);
        }
      };

      const onError = (err: any) => {
        console.error(`Erro ao carregar arquivo 3D ${file.fileName}:`, err);
        loadedCount++;
        if (loadedCount === totalFiles) {
          setLoading(false);
          setLoadProgress(null);
        }
      };

      if (ext === "stl" || ext === "3mf") {
        const meshUrl = `/api/assets/mesh?libraryId=${libraryId}&relPath=${encodeURIComponent(
          file.relativePath
        )}`;
        stlLoader.load(
          meshUrl,
          (geometry) => {
            geometry.computeVertexNormals();
            const mesh = new THREE.Mesh(geometry, currentMat);
            onModelLoaded(mesh);
          },
          onProgress,
          (err) => {
            console.warn("Fallback para ThreeMFLoader:", err);
            threeMfLoader.load(fileUrl, onModelLoaded, onProgress, onError);
          }
        );
      } else if (ext === "obj") {
        objLoader.load(fileUrl, onModelLoaded, onProgress, onError);
      } else {
        threeMfLoader.load(fileUrl, onModelLoaded, onProgress, onError);
      }
    });
  }, [files, libraryId]);

  // Atualiza materiais quando o usuário troca cor ou tipo
  useEffect(() => {
    const group = objectsGroupRef.current;
    if (!group) return;

    const newMat = createMaterial(materialType, materialColor, wireframe);
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).material = newMat;
      }
    });
  }, [materialType, materialColor, wireframe]);

  // Atualiza auto-rotação
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Atualiza visibilidade da Bounding Box
  useEffect(() => {
    if (boundingBoxHelperRef.current) {
      boundingBoxHelperRef.current.visible = showBoundingBox;
    }
  }, [showBoundingBox]);

  // Alterna a visibilidade de arquivos/peças individuais
  const toggleFileVisibility = (fileId: string) => {
    const group = objectsGroupRef.current;
    const newState = !activeFiles[fileId];
    setActiveFiles((prev) => ({ ...prev, [fileId]: newState }));

    if (group) {
      const child = group.getObjectByName(fileId);
      if (child) {
        child.visible = newState;
      }
    }
  };

  // Predefinições de Câmera
  const setCameraView = (view: "iso" | "front" | "top" | "reset") => {
    if (!cameraRef.current || !controlsRef.current || !dimensions) return;
    const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z, 50);
    const centerY = dimensions.y / 2;

    switch (view) {
      case "iso":
      case "reset":
        cameraRef.current.position.set(maxDim * 1.2, maxDim * 1.0, maxDim * 1.4);
        controlsRef.current.target.set(0, centerY, 0);
        break;
      case "front":
        cameraRef.current.position.set(0, centerY, maxDim * 2.2);
        controlsRef.current.target.set(0, centerY, 0);
        break;
      case "top":
        cameraRef.current.position.set(0, maxDim * 2.5, 0.0001);
        controlsRef.current.target.set(0, 0, 0);
        break;
    }
    controlsRef.current.update();
  };

  // Captura o ângulo atual do Canvas e salva como Thumbnail do Modelo
  const captureSnapshot = async () => {
    if (!rendererRef.current) return;
    setSavingSnapshot(true);
    setSnapshotSuccess(false);

    try {
      const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
      const res = await fetch(`/api/models/${modelId}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setSnapshotSuccess(true);
        if (onSnapshotSaved) onSnapshotSaved(data.coverImage);
        setTimeout(() => setSnapshotSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Erro ao salvar snapshot:", err);
    } finally {
      setSavingSnapshot(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[420px] rounded-xl overflow-hidden bg-[#090b12] border border-white/10 select-none">
      {/* 3D Viewport Mount */}
      <div ref={mountRef} className="w-full h-full min-h-[420px] cursor-grab active:cursor-grabbing" />

      {/* Loading Indicator with instant cover preview */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090b12]/85 backdrop-blur-md z-20 overflow-hidden">
          {coverImageUrl && (
            <img
              src={coverImageUrl}
              alt="Pré-visualização 2D"
              className="absolute inset-0 w-full h-full object-contain opacity-25 filter blur-xs pointer-events-none scale-105 transition-transform duration-1000"
            />
          )}
          <div className="relative z-10 flex flex-col items-center p-5 rounded-2xl bg-[#111422]/95 border border-white/15 shadow-2xl">
            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-white tracking-wide">
              {loadProgress === 100 ? "Renderizando malha 3D..." : "Carregando malha 3D..."}
            </p>
            {loadProgress !== null && (
              <div className="mt-2.5 flex flex-col items-center w-40">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-200"
                    style={{ width: `${loadProgress}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 font-mono">
                  {loadProgress === 100 ? "Processando geometria..." : `${loadProgress}%`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Measurement Box HUD */}
      {dimensions && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 p-2.5 rounded-lg bg-[#111422]/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300 shadow-xl">
          <div className="flex items-center gap-2 font-semibold text-indigo-400">
            <Box className="w-3.5 h-3.5" />
            <span>Dimensões (mm)</span>
          </div>
          <div className="flex gap-3">
            <span className="text-rose-400">X: {dimensions.x}</span>
            <span className="text-emerald-400">Y: {dimensions.y}</span>
            <span className="text-cyan-400">Z: {dimensions.z}</span>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#111422]/85 backdrop-blur-md border border-white/10 shadow-2xl">
        {/* Camera Views Selector */}
        <div className="flex items-center gap-1 pr-1 border-r border-white/10">
          <button
            onClick={() => setCameraView("iso")}
            title="Visão Isométrica"
            className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            Iso
          </button>
          <button
            onClick={() => setCameraView("front")}
            title="Visão Frontal"
            className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            Frente
          </button>
          <button
            onClick={() => setCameraView("top")}
            title="Visão Superior (Topo)"
            className="px-2 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
          >
            Topo
          </button>
        </div>

        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title={autoRotate ? "Pausar Rotação" : "Iniciar Rotação"}
          className={`p-2 rounded-lg transition-all ${
            autoRotate ? "bg-indigo-600/30 text-indigo-400" : "text-slate-400 hover:text-white"
          }`}
        >
          {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        {/* Wireframe Toggle */}
        <button
          onClick={() => setWireframe(!wireframe)}
          title="Alternar Modo Wireframe"
          className={`p-2 rounded-lg transition-all ${
            wireframe ? "bg-indigo-600/30 text-indigo-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Bounding Box Toggle */}
        <button
          onClick={() => setShowBoundingBox(!showBoundingBox)}
          title="Alternar Caixa Delimitadora"
          className={`p-2 rounded-lg transition-all ${
            showBoundingBox ? "bg-indigo-600/30 text-cyan-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <Box className="w-4 h-4" />
        </button>

        {/* Reset Camera View */}
        <button
          onClick={() => setCameraView("reset")}
          title="Resetar Câmera"
          className="p-2 rounded-lg text-slate-400 hover:text-white transition-all hover:bg-white/5"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-white/10 mx-0.5" />

        {/* Snapshot Cover Capture Button */}
        <button
          onClick={captureSnapshot}
          disabled={savingSnapshot}
          title="Capturar Ângulo Atual como Capa"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
        >
          {snapshotSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300" />
              <span>Salvo!</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5" />
              <span>{savingSnapshot ? "Salvando..." : "Capa 3D"}</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom Material & Color Palette Selector */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#111422]/90 backdrop-blur-md border border-white/10 text-xs shadow-2xl max-w-[calc(100%-2rem)]">
        <span className="text-slate-400 font-medium px-1 flex items-center gap-1">
          <Palette className="w-3.5 h-3.5 text-indigo-400" /> Material:
        </span>
        <button
          onClick={() => setMaterialType("pla")}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            materialType === "pla" ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          PLA
        </button>
        <button
          onClick={() => setMaterialType("abs")}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            materialType === "abs" ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          ABS
        </button>
        <button
          onClick={() => setMaterialType("translucent")}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            materialType === "translucent" ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          PETG
        </button>
        <button
          onClick={() => setMaterialType("matte")}
          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
            materialType === "matte" ? "bg-indigo-600 text-white shadow-md" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          Fosco
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block" />

        {/* Color Swatches */}
        <div className="flex items-center gap-1.5 px-1 flex-wrap">
          {FILAMENT_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => setMaterialColor(c.hex)}
              title={c.name}
              style={{ backgroundColor: c.hex }}
              className={`w-4 h-4 rounded-full border transition-all ${
                materialColor === c.hex
                  ? "border-white scale-125 ring-2 ring-indigo-500/80 shadow-md"
                  : "border-white/20 opacity-80 hover:opacity-100 hover:scale-110"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Multi-Part File Visibility Toggler (if > 1 file) */}
      {files.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 p-2 rounded-xl bg-[#111422]/85 backdrop-blur-md border border-white/10 max-h-36 overflow-y-auto text-xs shadow-2xl">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
            Peças do Modelo ({files.length})
          </span>
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFileVisibility(f.id)}
              className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-white/5 text-slate-300 text-left transition-all"
            >
              <span className="truncate max-w-[120px]">{f.fileName}</span>
              {activeFiles[f.id] !== false ? (
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
