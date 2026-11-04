import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ONTOLOGY_DATA_FULL } from '../data/ontologyData_full';
import { EDGES_FULL } from '../data/edges_full';
import { NODE_POSITIONS } from '../data/positionsData';
import {
  ATLAS_NODES,
  ATLAS_EDGES,
  DISCIPLINE_META,
  PATTERN_META,
  AtlasNode,
  DisciplineId,
  EdgeRelationType,
  PatternId
} from '../data/ontologyData';
import {
  Compass,
  Route,
  Sparkles,
  Layers,
  Code2,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Network,
  Search,
  BookOpen,
  Calendar,
  Tag
} from 'lucide-react';
import { MathView } from './MathView';

interface AtlasGraph3DProps {
  onOpenLab: (lab: 'dimensional' | 'tensor' | 'operator' | 'rotations' | 'cnl') => void;
}

// Full semantic relation metadata matching all 8 edge types
export const FULL_RELATION_META: Record<string, { label: string; color: string; desc: string }> = {
  partof: { label: 'Parte di / Sottostruttura', color: '#10b981', desc: 'Composizione strutturale o tassonomica' },
  inspires: { label: 'Ispira & Connette', color: '#38bdf8', desc: 'Connessione concettuale o intuizione cardine' },
  precedes: { label: 'Precede storicamente', color: '#94a3b8', desc: 'Successione cronologica o genealogica' },
  generalizes: { label: 'Generalizza', color: '#f59e0b', desc: 'Estensione a dimensioni o strutture superiori' },
  implies: { label: 'Implica formalmente', color: '#818cf8', desc: 'Deduzione logica o corollario necessario' },
  equivalent: { label: 'Isomorfo / Equivalente', color: '#2dd4bf', desc: 'Isomorfismo o identità categoriale' },
  analogy: { label: 'Ponte per analogia', color: '#c084fc', desc: 'Corrispondenza strutturale tra campi diversi' },
  contradicts: { label: 'Crisi / Contraddice', color: '#fb7185', desc: 'Paradosso, antinomia o rottura di paradigma' }
};

// Full discipline metadata matching 1351 nodes
export const FULL_DISCIPLINE_META: Record<string, { name: string; color: string; short: string }> = {
  math: { name: 'Matematica Pura & Strutturale', color: '#38bdf8', short: 'MATH' },
  physics: { name: 'Fisica Teorica & Meccanica', color: '#f59e0b', short: 'PHYS' },
  cs: { name: 'Informatica Teorica & AI', color: '#34d399', short: 'CS' },
  logic: { name: 'Logica, Modelli & Teoria Insiemi', color: '#f472b6', short: 'LOGIC' },
  inter: { name: 'Ponti Interdisciplinari', color: '#a78bfa', short: 'INTER' }
};

// Epoch categories for filtering
export const EPOCHS = [
  { id: 'all', label: 'Tutte le Epoche (-3500 → 2026)' },
  { id: 'antico', label: 'Preistoria & Antichità (fino al 500 d.C.)', filter: (y: number) => y <= 500 },
  { id: 'medioevo', label: 'Medioevo & Civiltà Islamica (501 → 1500)', filter: (y: number) => y > 500 && y <= 1500 },
  { id: 'rinascimento', label: 'Rivoluzione Scientifica (1501 → 1800)', filter: (y: number) => y > 1500 && y <= 1800 },
  { id: 'ottocento', label: 'XIX Secolo (1801 → 1900)', filter: (y: number) => y > 1800 && y <= 1900 },
  { id: 'novecento', label: 'Novecento (1901 → 1970)', filter: (y: number) => y > 1900 && y <= 1970 },
  { id: 'contemporaneo', label: 'Era Digitale & AI (1971 → 2026)', filter: (y: number) => y > 1970 }
];

export const AtlasGraph3D: React.FC<AtlasGraph3DProps> = ({ onOpenLab }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Selected node state - starts with "Lebombo" or a prominent node
  const [selectedNodeId, setSelectedNodeId] = useState<string>('n0');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);

  // Filters
  const [activeDiscipline, setActiveDiscipline] = useState<string>('all');
  const [activeEpoch, setActiveEpoch] = useState<string>('all');
  const [activeRelation, setActiveRelation] = useState<string>('all');
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);

  // Learning Path Calculator state
  const [pathMode, setPathMode] = useState<boolean>(false);
  const [pathStartId, setPathStartId] = useState<string>('n0');
  const [pathTargetId, setPathTargetId] = useState<string>('n100');

  // Screen projected labels overlay
  const [projectedLabels, setProjectedLabels] = useState<
    { id: string; label: string; x: number; y: number; visible: boolean; isSelected: boolean }[]
  >([]);

  const resetCameraRef = useRef<(() => void) | null>(null);
  const graphRefs = useRef<{
    instancedMesh: THREE.InstancedMesh;
    haloMesh: THREE.Mesh;
    linesMesh: THREE.LineSegments;
    fullColors: Float32Array;
    fullPositions: Float32Array;
  } | null>(null);

  // Fast lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, (typeof ONTOLOGY_DATA_FULL)[0]>();
    ONTOLOGY_DATA_FULL.forEach((n) => map.set(n.id, n));
    return map;
  }, []);

  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    ONTOLOGY_DATA_FULL.forEach((n, idx) => map.set(n.id, idx));
    return map;
  }, []);

  // Adjacency for BFS and neighbor exploration
  const adjacency = useMemo(() => {
    const map = new Map<string, { target: string; type: string; isOutgoing: boolean }[]>();
    EDGES_FULL.forEach((e) => {
      if (!map.has(e.from)) map.set(e.from, []);
      if (!map.has(e.to)) map.set(e.to, []);
      map.get(e.from)!.push({ target: e.to, type: e.type, isOutgoing: true });
      map.get(e.to)!.push({ target: e.from, type: e.type, isOutgoing: false });
    });
    return map;
  }, []);

  // Selected node details
  const selectedNode = useMemo(() => {
    return nodeMap.get(selectedNodeId) || ONTOLOGY_DATA_FULL[0];
  }, [selectedNodeId, nodeMap]);

  // Direct topological neighbors
  const neighborConnections = useMemo(() => {
    const list = adjacency.get(selectedNodeId) || [];
    return list
      .map((conn) => {
        const otherNode = nodeMap.get(conn.target);
        if (!otherNode) return null;
        return {
          targetId: conn.target,
          type: conn.type,
          isOutgoing: conn.isOutgoing,
          otherNode
        };
      })
      .filter(Boolean) as {
        targetId: string;
        type: string;
        isOutgoing: boolean;
        otherNode: (typeof ONTOLOGY_DATA_FULL)[0];
      }[];
  }, [selectedNodeId, adjacency, nodeMap]);

  // BFS Shortest Path finding across 1351 nodes and 1678 edges
  const learningPath = useMemo(() => {
    if (!pathMode || pathStartId === pathTargetId) {
      return { nodeIds: new Set<string>(), edgeKeys: new Set<string>(), orderedNodes: [] };
    }

    const queue: { id: string; path: string[] }[] = [{ id: pathStartId, path: [pathStartId] }];
    const visited = new Set<string>([pathStartId]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === pathTargetId) {
        const nodeIds = new Set(current.path);
        const edgeKeys = new Set<string>();
        for (let i = 0; i < current.path.length - 1; i++) {
          edgeKeys.add(`${current.path[i]}->${current.path[i + 1]}`);
          edgeKeys.add(`${current.path[i + 1]}->${current.path[i]}`);
        }
        const ordered = current.path
          .map((id) => nodeMap.get(id))
          .filter(Boolean) as (typeof ONTOLOGY_DATA_FULL)[0][];
        return { nodeIds, edgeKeys, orderedNodes: ordered };
      }

      const neighbors = adjacency.get(current.id) || [];
      for (const n of neighbors) {
        if (!visited.has(n.target)) {
          visited.add(n.target);
          queue.push({ id: n.target, path: [...current.path, n.target] });
        }
      }
    }

    return { nodeIds: new Set<string>(), edgeKeys: new Set<string>(), orderedNodes: [] };
  }, [pathMode, pathStartId, pathTargetId, adjacency, nodeMap]);

  // Filtered active nodes set
  const filteredActiveNodes = useMemo(() => {
    const active = new Set<string>();
    const epochObj = EPOCHS.find((ep) => ep.id === activeEpoch);

    ONTOLOGY_DATA_FULL.forEach((node) => {
      if (activeDiscipline !== 'all' && node.discipline !== activeDiscipline) return;
      if (epochObj && epochObj.filter && !epochObj.filter(node.year)) return;
      active.add(node.id);
    });

    return active;
  }, [activeDiscipline, activeEpoch]);

  // Search filtered results (top 8)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: (typeof ONTOLOGY_DATA_FULL)[0][] = [];
    for (const n of ONTOLOGY_DATA_FULL) {
      if (n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q)) {
        results.push(n);
        if (results.length >= 8) break;
      }
    }
    return results;
  }, [searchQuery]);

  // Setup Three.js scene with InstancedMesh and BufferGeometry LineSegments
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#07090e');
    scene.fog = new THREE.FogExp2('#07090e', 0.009);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 400);
    camera.position.set(0, 10, 52);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxDistance = 140;
    controls.minDistance = 8;

    resetCameraRef.current = () => {
      camera.position.set(0, 10, 52);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    // Reference Coordinate Lattice / Galactic Ring
    const ringGeo = new THREE.RingGeometry(38, 38.3, 80);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, -6, 0);
    scene.add(ringMesh);

    // 1. InstancedMesh for all 1351 Nodes
    const numNodes = ONTOLOGY_DATA_FULL.length;
    const sphereGeo = new THREE.SphereGeometry(0.72, 16, 12);
    const sphereMat = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.25
    });

    const instancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, numNodes);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const defaultColors = new Float32Array(numNodes * 3);

    ONTOLOGY_DATA_FULL.forEach((node, idx) => {
      const pos = NODE_POSITIONS[node.id] || [0, 0, 0];
      dummy.position.set(pos[0], pos[1], pos[2]);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);

      const colorHex = FULL_DISCIPLINE_META[node.discipline]?.color || '#38bdf8';
      const c = new THREE.Color(colorHex);
      instancedMesh.setColorAt(idx, c);
      defaultColors[idx * 3] = c.r;
      defaultColors[idx * 3 + 1] = c.g;
      defaultColors[idx * 3 + 2] = c.b;
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
    scene.add(instancedMesh);

    // 2. Halo & Selection Ring for currently focused node
    const haloGeo = new THREE.TorusGeometry(1.6, 0.06, 12, 36);
    haloGeo.rotateX(Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.85
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.visible = false;
    scene.add(haloMesh);

    // 3. BufferGeometry LineSegments for all 1678 Edges
    const numEdges = EDGES_FULL.length;
    const linePositions = new Float32Array(numEdges * 2 * 3);
    const lineColors = new Float32Array(numEdges * 2 * 3);

    EDGES_FULL.forEach((edge, i) => {
      const p1 = NODE_POSITIONS[edge.from] || [0, 0, 0];
      const p2 = NODE_POSITIONS[edge.to] || [0, 0, 0];

      linePositions[i * 6] = p1[0];
      linePositions[i * 6 + 1] = p1[1];
      linePositions[i * 6 + 2] = p1[2];

      linePositions[i * 6 + 3] = p2[0];
      linePositions[i * 6 + 4] = p2[1];
      linePositions[i * 6 + 5] = p2[2];

      const relColor = FULL_RELATION_META[edge.type]?.color || '#94a3b8';
      const col = new THREE.Color(relColor);

      lineColors[i * 6] = col.r;
      lineColors[i * 6 + 1] = col.g;
      lineColors[i * 6 + 2] = col.b;

      lineColors[i * 6 + 3] = col.r;
      lineColors[i * 6 + 4] = col.g;
      lineColors[i * 6 + 5] = col.b;
    });

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    linesGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const linesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    const linesMesh = new THREE.LineSegments(linesGeo, linesMat);
    scene.add(linesMesh);

    graphRefs.current = {
      instancedMesh,
      haloMesh,
      linesMesh,
      fullColors: defaultColors,
      fullPositions: linePositions
    };

    // Raycasting for instant pointer pick
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const hits = raycaster.intersectObject(instancedMesh);
      if (hits.length > 0 && hits[0].instanceId !== undefined) {
        const clickedNode = ONTOLOGY_DATA_FULL[hits[0].instanceId];
        if (clickedNode) {
          setSelectedNodeId(clickedNode.id);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let animId = 0;
    let frameCount = 0;
    const tempV = new THREE.Vector3();

    const animate = () => {
      controls.update();
      if (haloMesh.visible) {
        haloMesh.rotation.z += 0.015;
      }
      renderer.render(scene, camera);

      // Frustum-culled label projection every 2 frames
      frameCount++;
      if (frameCount % 2 === 0) {
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;

        // Collect critical nodes for labels: selected + direct neighbors + path nodes
        const labelNodes: { id: string; label: string; pos: [number, number, number]; isSelected: boolean }[] = [];
        const sel = nodeMap.get(selectedNodeId);
        if (sel) {
          labelNodes.push({
            id: sel.id,
            label: sel.label,
            pos: NODE_POSITIONS[sel.id] || [0, 0, 0],
            isSelected: true
          });
        }

        const neighbors = adjacency.get(selectedNodeId) || [];
        neighbors.slice(0, 10).forEach((n) => {
          const nod = nodeMap.get(n.target);
          if (nod && nod.id !== selectedNodeId) {
            labelNodes.push({
              id: nod.id,
              label: nod.label,
              pos: NODE_POSITIONS[nod.id] || [0, 0, 0],
              isSelected: false
            });
          }
        });

        if (pathMode && learningPath.orderedNodes.length > 0) {
          learningPath.orderedNodes.forEach((n) => {
            if (!labelNodes.some((l) => l.id === n.id)) {
              labelNodes.push({
                id: n.id,
                label: n.label,
                pos: NODE_POSITIONS[n.id] || [0, 0, 0],
                isSelected: n.id === selectedNodeId
              });
            }
          });
        }

        const nextLabels = labelNodes.map((item) => {
          tempV.set(item.pos[0], item.pos[1] + 1.25, item.pos[2]);
          const dist = camera.position.distanceTo(tempV);
          tempV.project(camera);
          const x = (tempV.x * 0.5 + 0.5) * w;
          const y = (-(tempV.y * 0.5) + 0.5) * h;
          const visible = dist < 70 && tempV.z < 1 && x >= 15 && x <= w - 15 && y >= 15 && y <= h - 15;
          return {
            id: item.id,
            label: item.label,
            x,
            y,
            visible,
            isSelected: item.isSelected
          };
        });

        setProjectedLabels(nextLabels);
      }

      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, [nodeMap, adjacency, pathMode, learningPath]);

  // Synchronize dynamic visual highlights on InstancedMesh and halo
  useEffect(() => {
    if (!graphRefs.current) return;
    const { instancedMesh, haloMesh } = graphRefs.current;

    const selectedPos = NODE_POSITIONS[selectedNodeId];
    if (selectedPos) {
      haloMesh.position.set(selectedPos[0], selectedPos[1], selectedPos[2]);
      haloMesh.visible = true;
    }

    const dummy = new THREE.Object3D();
    const highlightIds = new Set<string>();

    if (pathMode && learningPath.nodeIds.size > 0) {
      learningPath.nodeIds.forEach((id) => highlightIds.add(id));
    } else {
      highlightIds.add(selectedNodeId);
      const neighbors = adjacency.get(selectedNodeId) || [];
      neighbors.forEach((n) => highlightIds.add(n.target));
    }

    ONTOLOGY_DATA_FULL.forEach((node, idx) => {
      const pos = NODE_POSITIONS[node.id] || [0, 0, 0];
      dummy.position.set(pos[0], pos[1], pos[2]);

      const isSel = node.id === selectedNodeId;
      const isHigh = highlightIds.has(node.id);
      const isFiltActive = filteredActiveNodes.has(node.id);

      let scale = 0.65;
      let colHex = FULL_DISCIPLINE_META[node.discipline]?.color || '#38bdf8';

      if (isSel) {
        scale = 1.6;
        colHex = '#fbbf24'; // Gold
      } else if (isHigh) {
        scale = 1.25;
      } else if (!isFiltActive) {
        scale = 0.35;
      }

      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(idx, dummy.matrix);

      const color = new THREE.Color(colHex);
      if (!isFiltActive && !isHigh && !isSel) {
        color.multiplyScalar(0.25);
      }
      instancedMesh.setColorAt(idx, color);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) instancedMesh.instanceColor.needsUpdate = true;
  }, [selectedNodeId, pathMode, learningPath, filteredActiveNodes, adjacency]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left Column: 3D Visualization & Filter Dock (8 cols) */}
      <div className="xl:col-span-8 flex flex-col gap-4">
        {/* Top Control Bar with Search and Learning Path Toggle */}
        <div className="bg-[#0f131c] border border-slate-800/80 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono-tech uppercase tracking-wider text-slate-300">
                Grafo Ontologico Lossless (1.351 Nodi · 1.678 Archi)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPathMode(!pathMode)}
                className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  pathMode
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                Percorso Didattico (BFS)
              </button>
              <button
                onClick={() => {
                  setActiveDiscipline('all');
                  setActiveEpoch('all');
                  setActiveRelation('all');
                  setPathMode(false);
                  setSearchQuery('');
                  resetCameraRef.current?.();
                }}
                className="px-2.5 py-1.5 rounded text-xs bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-1 cursor-pointer"
                title="Ripristina filtri e telecamera"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* Quick Instant Search Across 1351 Nodes */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded px-3 py-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca tra 1.351 concetti, teoremi, figure (es. 'Euclide', 'Gauss', 'Lebesgue', 'Quaternioni')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-500 font-mono-tech"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {searchFocused && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#0b0e15] border border-slate-700 rounded-lg shadow-2xl z-30 overflow-hidden divide-y divide-slate-800/80">
                {searchResults.map((res) => (
                  <div
                    key={res.id}
                    onMouseDown={() => {
                      setSelectedNodeId(res.id);
                      setSearchQuery('');
                    }}
                    className="p-2.5 hover:bg-slate-800/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{res.label}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        ({res.year < 0 ? `${Math.abs(res.year)} a.C.` : res.year})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                      {res.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Learning Path Calculator Banner & Controls */}
          {pathMode && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded p-3 space-y-2.5">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-300 font-mono-tech">Partenza:</span>
                  <select
                    value={pathStartId}
                    onChange={(e) => setPathStartId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs max-w-[220px]"
                  >
                    {ONTOLOGY_DATA_FULL.slice(0, 150).map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.year < 0 ? `${Math.abs(n.year)} a.C.` : n.year})
                      </option>
                    ))}
                  </select>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <span className="text-emerald-300 font-mono-tech">Traguardo:</span>
                  <select
                    value={pathTargetId}
                    onChange={(e) => setPathTargetId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs max-w-[220px]"
                  >
                    {ONTOLOGY_DATA_FULL.slice(150, 300).map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.label} ({n.year < 0 ? `${Math.abs(n.year)} a.C.` : n.year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {learningPath.orderedNodes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                  <span className="text-slate-400 font-mono-tech">Cammino Ottimo ({learningPath.orderedNodes.length} Passi):</span>
                  {learningPath.orderedNodes.map((n, idx) => (
                    <React.Fragment key={n.id}>
                      <button
                        onClick={() => setSelectedNodeId(n.id)}
                        className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                          n.id === selectedNodeId
                            ? 'bg-amber-400 text-slate-950 font-bold'
                            : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30'
                        }`}
                      >
                        {idx + 1}. {n.label}
                      </button>
                      {idx < learningPath.orderedNodes.length - 1 && (
                        <span className="text-emerald-400">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3D Viewport with 2D Projected DOM Labels */}
        <div className="relative w-full h-[580px] bg-[#07090e] border border-slate-800/90 rounded-lg overflow-hidden">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Screen Projected Labels Overlay */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {projectedLabels.map((lbl) => {
              if (!lbl.visible) return null;
              return (
                <div
                  key={lbl.id}
                  style={{
                    transform: `translate3d(${Math.round(lbl.x)}px, ${Math.round(lbl.y)}px, 0) translate(-50%, -100%)`
                  }}
                  className={`absolute top-0 left-0 px-2 py-0.5 rounded text-[11px] font-mono-tech whitespace-nowrap transition-opacity pointer-events-auto cursor-pointer ${
                    lbl.isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold shadow-lg scale-105'
                      : 'bg-[#0d111a]/90 text-slate-200 border border-slate-700/80 hover:bg-slate-800'
                  }`}
                  onClick={() => setSelectedNodeId(lbl.id)}
                >
                  {lbl.label}
                </div>
              );
            })}
          </div>

          {/* Top-Left Legend Overlay */}
          <div className="absolute top-3 left-3 bg-[#0c0f17]/95 border border-slate-800/90 rounded p-2.5 text-[11px] font-mono-tech space-y-1 pointer-events-none">
            <div className="text-slate-400 uppercase tracking-wider mb-1 font-semibold">
              Discipline & Colori
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
              <span className="text-sky-300">Matematica (554 nodi)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="text-amber-300">Fisica (280 nodi)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span className="text-emerald-300">Informatica & AI (373 nodi)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400 inline-block" />
              <span className="text-pink-300">Logica (139 nodi)</span>
            </div>
          </div>

          {/* Bottom Multi-Filter Dock */}
          <div className="absolute bottom-3 left-3 right-3 bg-[#0d1119]/95 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono-tech text-slate-300">
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                <span>Filtri Multi-Livello (Disciplina · Epoca Storica · Tipo di Relazione)</span>
              </div>
              <button
                onClick={() => setDockCollapsed(!dockCollapsed)}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
              >
                {dockCollapsed ? (
                  <>
                    Espandi <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Riduci <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {!dockCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-2.5 border-t border-slate-800/80 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono-tech">
                    Macro-Disciplina
                  </label>
                  <select
                    value={activeDiscipline}
                    onChange={(e) => setActiveDiscipline(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="all">Tutte le Discipline ({ONTOLOGY_DATA_FULL.length})</option>
                    {Object.entries(FULL_DISCIPLINE_META).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono-tech">
                    Epoca Cronologica
                  </label>
                  <select
                    value={activeEpoch}
                    onChange={(e) => setActiveEpoch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    {EPOCHS.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        {ep.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-mono-tech">
                    Relazione Semantica (1.678 Archi)
                  </label>
                  <select
                    value={activeRelation}
                    onChange={(e) => setActiveRelation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1.5 text-slate-200"
                  >
                    <option value="all">Tutti i Tipi di Arco ({EDGES_FULL.length})</option>
                    {Object.entries(FULL_RELATION_META).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Contextual Deep-Dive Panel (4 cols) */}
      <div className="xl:col-span-4 bg-[#0f131c] border border-slate-800/90 rounded-lg p-5 space-y-5 max-h-[760px] overflow-y-auto">
        {/* Header with Title, Year & Metadata Badges */}
        <div className="border-b border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span
              className="px-2 py-0.5 rounded text-[10px] font-mono-tech font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: `${FULL_DISCIPLINE_META[selectedNode.discipline]?.color || '#38bdf8'}22`,
                color: FULL_DISCIPLINE_META[selectedNode.discipline]?.color || '#38bdf8',
                border: `1px solid ${FULL_DISCIPLINE_META[selectedNode.discipline]?.color || '#38bdf8'}44`
              }}
            >
              {FULL_DISCIPLINE_META[selectedNode.discipline]?.short || selectedNode.discipline}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-tech bg-slate-800/80 text-slate-300 border border-slate-700">
              {selectedNode.type}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-tech bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {selectedNode.year < 0 ? `${Math.abs(selectedNode.year)} a.C.` : `${selectedNode.year} d.C.`}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-tech bg-slate-900 text-slate-400 border border-slate-800">
              ID: {selectedNode.id}
            </span>
          </div>

          <h2 className="text-2xl font-serif-editorial font-semibold text-slate-100">
            {selectedNode.label}
          </h2>

          {selectedNode.category && selectedNode.category.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-2">
              {selectedNode.category.map((cat, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono-tech text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1"
                >
                  <Tag className="w-2.5 h-2.5 text-slate-500" />
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Rigorous Lossless Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-serif-editorial font-semibold text-slate-200 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-sky-400" />
            Descrizione Lossless & Significato Storico-Formale
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed bg-[#090b10] p-3 rounded border border-slate-800/80">
            {selectedNode.description}
          </p>
        </div>

        {/* Source File & Provenance Tag */}
        <div className="bg-[#0b0e15] border border-slate-800/80 rounded p-2.5 text-xs text-slate-400 flex items-center justify-between">
          <span className="text-[11px] font-mono-tech text-slate-500">Sorgente Ontologica:</span>
          <span className="text-[11px] font-mono-tech text-emerald-400 font-medium">
            {selectedNode.sourceFile}
          </span>
        </div>

        {/* Topological Neighborhood ("Vicini Topologici & Archi Relazionali") */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif-editorial font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              Archi Relazionali ({neighborConnections.length} Connessioni)
            </h3>
            <span className="text-[11px] font-mono-tech text-slate-400">Clicca per navigare</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {neighborConnections.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-2 bg-slate-900/40 rounded">
                Nessun arco diretto censito per questo nodo.
              </div>
            ) : (
              neighborConnections.map(({ targetId, type, isOutgoing, otherNode }) => {
                const rel = FULL_RELATION_META[type] || { label: type, color: '#94a3b8' };
                return (
                  <div
                    key={`${targetId}-${type}`}
                    onClick={() => setSelectedNodeId(otherNode.id)}
                    className="bg-[#0b0e15] hover:bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 rounded p-2.5 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono-tech">
                      <span style={{ color: rel.color }}>
                        {isOutgoing ? `→ ${rel.label}` : `← (${rel.label})`}
                      </span>
                      <span className="text-slate-400">
                        {otherNode.year < 0 ? `${Math.abs(otherNode.year)} a.C.` : `${otherNode.year} d.C.`}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200">{otherNode.label}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{otherNode.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Formal Lean 4 / Mathlib Snippet */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-mono-tech text-pink-400">
            <Code2 className="w-3.5 h-3.5" />
            <span>Assiomatizzazione Formale Lean 4</span>
          </div>
          <pre className="bg-[#07090d] border border-slate-800/90 rounded p-2.5 text-[11px] font-mono-tech text-emerald-300 overflow-x-auto">
            {`axiom axiom_${selectedNode.id.replace(/[^a-zA-Z0-9_]/g, '_')} :
  ${selectedNode.type} ("${selectedNode.label}") ∧ ValidIn (${selectedNode.year})`}
          </pre>
        </div>
      </div>
    </div>
  );
};
