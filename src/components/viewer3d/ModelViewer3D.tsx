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
  Image as ImageIcon,
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
  onDimensionsCalculated?: (dims: { x: number; y: number; z: number }) => void;
  onTriangleCountCalculated?: (tris: number) => void;
  autoLoad?: boolean;
  headerAction?: React.ReactNode;
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
  onDimensionsCalculated,
  onTriangleCountCalculated,
  autoLoad = false,
  headerAction,
}: ModelViewer3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const boundingBoxHelperRef = useRef<THREE.Box3Helper | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);

  const [meshLoaded, setMeshLoaded] = useState(autoLoad);
  const [canvasReady, setCanvasReady] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [viewportTheme, setViewportTheme] = useState<"studio_light" | "dark_canvas">("dark_canvas");
  const [loading, setLoading] = useState(false);
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

  // Formatos únicos e tamanho total em bytes para o badge e resumo na visualização inicial
  const formats = Array.from(new Set(files.map((f) => f.format.toUpperCase())));
  const totalSize = files.reduce((acc, f) => acc + (f.fileSize || 0), 0);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Reseta para miniatura toda vez que um modelo diferente for aberto
  useEffect(() => {
    setMeshLoaded(autoLoad);
    setCanvasReady(false);
    setLoading(false);
    setLoadProgress(null);
    setLoadError(null);
    setImgError(false);
    setDimensions(null);
  }, [modelId, autoLoad]);

  // Sincroniza tema inicial com o estado do documento
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isLight = document.documentElement.classList.contains("light");
      setViewportTheme(isLight ? "studio_light" : "dark_canvas");
    }
    const handleThemeChange = (e: any) => {
      const nextTheme = e.detail?.theme;
      setViewportTheme(nextTheme === "light" ? "studio_light" : "dark_canvas");
    };
    window.addEventListener("pv_theme_change", handleThemeChange);
    return () => window.removeEventListener("pv_theme_change", handleThemeChange);
  }, []);

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

  // Inicializa o Canvas Three.js quando a malha 3D for solicitada
  useEffect(() => {
    if (!meshLoaded) {
      setCanvasReady(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    // Cena
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(viewportTheme === "studio_light" ? "#f8fafc" : "#0b0e17");
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
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      viewportTheme === "studio_light" ? 1.1 : 0.75
    );
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const keyLight = new THREE.DirectionalLight(
      0xffffff,
      viewportTheme === "studio_light" ? 1.6 : 1.5
    );
    keyLight.position.set(150, 250, 200);
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const fillLight = new THREE.DirectionalLight(
      viewportTheme === "studio_light" ? 0x93c5fd : 0x60a5fa,
      0.7
    );
    fillLight.position.set(-150, 100, -150);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    const rimLight = new THREE.DirectionalLight(0xc084fc, 0.8);
    rimLight.position.set(0, -100, -200);
    scene.add(rimLight);

    // Grid de Impressão (Build Plate 256x256mm estilo Bambu Lab / Prusa)
    const gridHelper =
      viewportTheme === "studio_light"
        ? new THREE.GridHelper(256, 32, 0x0284c7, 0xcbd5e1)
        : new THREE.GridHelper(256, 32, 0x6366f1, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Grupo de Objetos 3D carregados
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // Bounding Box Helper
    const bbox = new THREE.Box3();
    const bboxHelper = new THREE.Box3Helper(
      bbox,
      new THREE.Color(viewportTheme === "studio_light" ? 0x0284c7 : 0x06b6d4)
    );
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

    setCanvasReady(true);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      setCanvasReady(false);
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      objectsGroupRef.current = null;
      boundingBoxHelperRef.current = null;
      gridHelperRef.current = null;
      ambientLightRef.current = null;
      keyLightRef.current = null;
      fillLightRef.current = null;
    };
  }, [meshLoaded]);

  // Atualiza cores do Viewport 3D (Estúdio Claro vs Dark Canvas)
  useEffect(() => {
    if (!meshLoaded || !sceneRef.current) return;
    const scene = sceneRef.current;

    if (viewportTheme === "studio_light") {
      // Estúdio Claro: Fundo em cinza-claro (#f8fafc), grid milimétrico em #cbd5e1 com eixo central em #0284c7
      scene.background = new THREE.Color("#f8fafc");
      if (gridHelperRef.current) {
        scene.remove(gridHelperRef.current);
        gridHelperRef.current.geometry.dispose();
      }
      const newGrid = new THREE.GridHelper(256, 32, 0x0284c7, 0xcbd5e1);
      newGrid.position.y = 0;
      scene.add(newGrid);
      gridHelperRef.current = newGrid;

      if (boundingBoxHelperRef.current) {
        (boundingBoxHelperRef.current.material as THREE.LineBasicMaterial).color.setHex(0x0284c7);
      }
      if (ambientLightRef.current) ambientLightRef.current.intensity = 1.1;
      if (keyLightRef.current) keyLightRef.current.intensity = 1.6;
      if (fillLightRef.current) fillLightRef.current.color.setHex(0x93c5fd);
    } else {
      // Dark Canvas Híbrido: Fundo escuro (#0b0e17), grid em 0x6366f1 / 0x1e293b
      scene.background = new THREE.Color("#0b0e17");
      if (gridHelperRef.current) {
        scene.remove(gridHelperRef.current);
        gridHelperRef.current.geometry.dispose();
      }
      const newGrid = new THREE.GridHelper(256, 32, 0x6366f1, 0x1e293b);
      newGrid.position.y = 0;
      scene.add(newGrid);
      gridHelperRef.current = newGrid;

      if (boundingBoxHelperRef.current) {
        (boundingBoxHelperRef.current.material as THREE.LineBasicMaterial).color.setHex(0x06b6d4);
      }
      if (ambientLightRef.current) ambientLightRef.current.intensity = 0.75;
      if (keyLightRef.current) keyLightRef.current.intensity = 1.5;
      if (fillLightRef.current) fillLightRef.current.color.setHex(0x60a5fa);
    }
  }, [viewportTheme, meshLoaded]);

  // Carrega os arquivos 3D na cena quando solicitado e com o canvas pronto
  useEffect(() => {
    if (!meshLoaded || !canvasReady) return;
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

            const roundedDims = {
              x: Math.round(size.x * 10) / 10,
              y: Math.round(size.y * 10) / 10,
              z: Math.round(size.z * 10) / 10,
            };
            setDimensions(roundedDims);
            if (onDimensionsCalculated) {
              onDimensionsCalculated(roundedDims);
            }

            // Conta triângulos totais da malha
            let totalTris = 0;
            group.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                if (m.geometry) {
                  if (m.geometry.index) {
                    totalTris += m.geometry.index.count / 3;
                  } else if (m.geometry.attributes.position) {
                    totalTris += m.geometry.attributes.position.count / 3;
                  }
                }
              }
            });
            if (totalTris > 0 && onTriangleCountCalculated) {
              onTriangleCountCalculated(Math.round(totalTris));
            }
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
  }, [files, libraryId, meshLoaded, canvasReady]);

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
    <div
      className={`relative w-full h-full min-h-[420px] rounded-xl overflow-hidden select-none border transition-colors ${
        viewportTheme === "studio_light"
          ? "bg-[#f8fafc] border-slate-200"
          : "bg-[#090b12] border-white/10"
      }`}
    >
      {!meshLoaded ? (
        /* Visualização de Miniatura 2D inicial quando a malha 3D não foi requisitada */
        <div className="relative w-full h-full min-h-[420px] flex flex-col items-center justify-center p-4">
          {/* Fundo gradiente sutil e grid de mesa de impressão */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/25 via-[#080b12] to-[#04060a] pointer-events-none z-0" />
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Barra superior de badges informativos */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
            <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-highest/90 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-300 shadow-lg">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Miniatura</span>
              </span>
              {formats.map((fmt) => (
                <span
                  key={fmt}
                  className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold uppercase tracking-wider"
                >
                  .{fmt}
                </span>
              ))}
              {totalSize > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-[#0b1017]/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-400 shadow-lg">
                  {formatBytes(totalSize)}
                </span>
              )}
            </div>

            {headerAction && (
              <div className="pointer-events-auto flex items-center gap-2">
                {headerAction}
              </div>
            )}
          </div>

          {/* Área Central: Imagem de Capa (Thumb) ou Placeholder */}
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center py-6 px-4">
            {coverImageUrl && !imgError ? (
              <div className="relative w-full max-w-md max-h-[260px] sm:max-h-[300px] flex items-center justify-center">
                {/* Glow desfocado da capa ao fundo */}
                <img
                  src={coverImageUrl}
                  alt="Pré-visualização 2D"
                  className="absolute inset-0 w-full h-full object-contain opacity-25 filter blur-xl scale-110 pointer-events-none transition-opacity duration-700"
                />
                {/* Capa com nitidez máxima */}
                <img
                  src={coverImageUrl}
                  alt="Miniatura do Modelo"
                  onError={() => setImgError(true)}
                  className="relative max-h-[240px] sm:max-h-[280px] w-auto max-w-full object-contain rounded-2xl shadow-2xl border border-white/10 hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
            ) : (
              <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-surface-container-lowest/60 border border-white/5 backdrop-blur-sm">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center mb-3 shadow-inner shadow-indigo-500/20">
                  <span className="material-symbols-outlined text-[44px] text-cyan-400 animate-pulse">
                    view_in_ar
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-300">
                  Visualização 3D Disponível
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {files.length} {files.length === 1 ? "peça 3D cadastrada" : "peças 3D cadastradas"}
                </span>
              </div>
            )}

            {/* Botão de Ação: Carregar Malha 3D */}
            <div className="relative z-20 mt-5 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setMeshLoaded(true)}
                className="group/btn relative flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 hover:shadow-cyan-500/40 border border-white/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer"
              >
                <div className="p-1.5 rounded-xl bg-white/20 backdrop-blur-sm group-hover/btn:scale-110 transition-transform">
                  <Box className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="leading-tight font-bold tracking-wide">
                    Carregar Malha 3D
                  </span>
                  <span className="text-[10px] text-cyan-100/90 font-normal">
                    {files.length > 1
                      ? `Renderizar ${files.length} peças interativas`
                      : "Interagir no visualizador 3D"}
                  </span>
                </div>
                <span className="material-symbols-outlined text-[20px] text-cyan-200 group-hover/btn:translate-x-1 transition-transform ml-1">
                  play_arrow
                </span>
              </button>

              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                <span>Malha sob demanda • Economia de tráfego e GPU</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
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

          {/* Top Viewport Control Overlay */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
            {/* Technical Dimension Badge Widget */}
            {dimensions ? (
              <div className="pointer-events-auto bg-[#0b1017]/90 backdrop-blur-md border border-[#1d2b3a] rounded-lg p-2 px-3 shadow-2xl flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-cyan-400 font-medium text-xs">
                  <Box className="w-4 h-4" />
                  <span>Dimensões <span className="text-slate-500 font-mono text-[10px]">(mm)</span></span>
                </div>
                <div className="h-4 w-[1px] bg-slate-800"></div>
                <div className="font-mono text-xs flex items-center gap-2 tracking-tight">
                  <span className="text-slate-400">X: <strong className="text-rose-400 font-semibold">{dimensions.x}</strong></span>
                  <span className="text-slate-400">Y: <strong className="text-emerald-400 font-semibold">{dimensions.y}</strong></span>
                  <span className="text-slate-400">Z: <strong className="text-cyan-400 font-semibold">{dimensions.z}</strong></span>
                </div>
              </div>
            ) : <div />}

            {/* Center Camera Controls Pill */}
            <div className="pointer-events-auto bg-[#0b1017]/90 backdrop-blur-md border border-[#1d2b3a] rounded-xl p-1 shadow-2xl flex items-center gap-1">
              <button
                onClick={() => setCameraView("iso")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 bg-[#16212e] border border-cyan-500/30 hover:text-white transition"
              >
                Iso
              </button>
              <button
                onClick={() => setCameraView("front")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#131c26] transition"
              >
                Frente
              </button>
              <button
                onClick={() => setCameraView("top")}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#131c26] transition"
              >
                Topo
              </button>
              <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`p-1.5 rounded-lg transition ${
                  autoRotate ? "text-cyan-400 bg-cyan-950/40 border border-cyan-700/50" : "text-slate-300 hover:bg-[#182330] hover:text-cyan-400"
                }`}
                title={autoRotate ? "Pausar Rotação" : "Iniciar Rotação"}
              >
                {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setWireframe(!wireframe)}
                className={`p-1.5 rounded-lg transition ${
                  wireframe ? "text-cyan-400 bg-cyan-950/40 border border-cyan-700/50" : "text-slate-300 hover:bg-[#182330] hover:text-cyan-400"
                }`}
                title="Alternar Modo Wireframe / Sólido"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowBoundingBox(!showBoundingBox)}
                className={`p-1.5 rounded-lg transition ${
                  showBoundingBox ? "text-cyan-400 bg-cyan-950/40 border border-cyan-700/50" : "text-slate-300 hover:bg-[#182330] hover:text-cyan-400"
                }`}
                title="Alternar Caixa Delimitadora"
              >
                <Box className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCameraView("reset")}
                className="p-1.5 rounded-lg text-slate-300 hover:bg-[#182330] hover:text-cyan-400 transition"
                title="Resetar Câmera"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="h-4 w-[1px] bg-slate-800 mx-1"></div>
              <button
                onClick={() => setViewportTheme((prev) => (prev === "studio_light" ? "dark_canvas" : "studio_light"))}
                className={`p-1.5 rounded-lg transition ${
                  viewportTheme === "studio_light"
                    ? "text-amber-400 bg-amber-950/40 border border-amber-700/50"
                    : "text-slate-300 hover:bg-[#182330] hover:text-amber-400"
                }`}
                title={viewportTheme === "studio_light" ? "Alternar para Dark Canvas Híbrido" : "Alternar para Estúdio Claro (Bambu/Fusion)"}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {viewportTheme === "studio_light" ? "light_mode" : "dark_mode"}
                </span>
              </button>
            </div>

            {/* Action Buttons: Voltar para Miniatura & Snapshot / 3D Cover */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMeshLoaded(false);
                  setLoading(false);
                }}
                className="bg-[#0b1017]/90 hover:bg-[#182330] text-slate-300 hover:text-white font-medium px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg border border-white/10 transition active:scale-95"
                title="Voltar para a visualização da miniatura 2D"
              >
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Miniatura</span>
              </button>

              <button
                onClick={captureSnapshot}
                disabled={savingSnapshot}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 border border-indigo-400/40 transition active:scale-95 disabled:opacity-50"
              >
                {snapshotSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Capa Salva!</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>{savingSnapshot ? "Salvando..." : "Capa 3D"}</span>
                  </>
                )}
              </button>

              {headerAction}
            </div>
          </div>

          {/* Bottom Viewport Floating Control Bar (Filament Type & Color Swatches) */}
          <div className="absolute bottom-4 left-4 z-20 pointer-events-auto max-w-[calc(100%-2rem)]">
            <div className="bg-[#0b1017]/95 backdrop-blur-md border border-[#1d2b3a] rounded-2xl p-1.5 px-3 shadow-2xl flex items-center gap-3 flex-wrap">
              {/* Material Switcher Group */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-1 pr-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
                  <span className="font-medium text-[11px]">Material:</span>
                </div>
                <button
                  onClick={() => setMaterialType("pla")}
                  className={`px-2.5 py-1 text-xs rounded-lg transition ${
                    materialType === "pla"
                      ? "bg-indigo-600 font-semibold text-white shadow-sm shadow-indigo-600/40"
                      : "font-medium text-slate-400 hover:text-slate-200 hover:bg-[#141d28]"
                  }`}
                >
                  PLA
                </button>
                <button
                  onClick={() => setMaterialType("abs")}
                  className={`px-2.5 py-1 text-xs rounded-lg transition ${
                    materialType === "abs"
                      ? "bg-indigo-600 font-semibold text-white shadow-sm shadow-indigo-600/40"
                      : "font-medium text-slate-400 hover:text-slate-200 hover:bg-[#141d28]"
                  }`}
                >
                  ABS
                </button>
                <button
                  onClick={() => setMaterialType("translucent")}
                  className={`px-2.5 py-1 text-xs rounded-lg transition ${
                    materialType === "translucent"
                      ? "bg-indigo-600 font-semibold text-white shadow-sm shadow-indigo-600/40"
                      : "font-medium text-slate-400 hover:text-slate-200 hover:bg-[#141d28]"
                  }`}
                >
                  PETG
                </button>
                <button
                  onClick={() => setMaterialType("matte")}
                  className={`px-2.5 py-1 text-xs rounded-lg transition ${
                    materialType === "matte"
                      ? "bg-indigo-600 font-semibold text-white shadow-sm shadow-indigo-600/40"
                      : "font-medium text-slate-400 hover:text-slate-200 hover:bg-[#141d28]"
                  }`}
                >
                  Fosco
                </button>
              </div>

              {/* Divider */}
              <div className="h-5 w-[1px] bg-slate-800 hidden sm:block"></div>

              {/* Color Swatches Palette */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {FILAMENT_COLORS.map((c) => {
                  const active = materialColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      onClick={() => setMaterialColor(c.hex)}
                      title={c.name}
                      style={{ backgroundColor: c.hex }}
                      className={`transition-all ${
                        active
                          ? "relative w-5 h-5 rounded-full ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0b1017] flex items-center justify-center shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                          : "w-4 h-4 rounded-full border border-slate-700 hover:scale-110"
                      }`}
                    >
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </button>
                  );
                })}
              </div>
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
        </>
      )}
    </div>
  );
}
