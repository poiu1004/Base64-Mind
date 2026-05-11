import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force-3d';
import { useSnapMindStore } from '../state/useSnapMindStore';
import { toNodeViewModels, toEdgeViewModels, resolveBrainNode } from './brainMapTypes';
import { BrainMapInspector } from './BrainMapInspector';

// ---------------------------------------------------------------------------
// Canvas-based text sprite for node labels
// ---------------------------------------------------------------------------

const colorMap: Record<string, number> = {
  Interest: 0x38bdf8,
  Aesthetic: 0xc084fc,
  Idea: 0x34d399,
  Project: 0xfb923c,
  Evidence: 0x94a3b8,
  Need: 0xf472b6,
  Moment: 0xfbbf24,
  Place: 0x60a5fa,
  Product: 0xf97316,
  Task: 0xa78bfa,
};

function makeTextSprite(text: string, hexColor: number): THREE.Sprite {
  const maxLen = 16;
  const displayText = text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 44;
  const ctx = canvas.getContext('2d')!;

  // Dark pill background
  ctx.clearRect(0, 0, 256, 44);
  ctx.fillStyle = 'rgba(6,13,26,0.72)';
  ctx.beginPath();
  ctx.roundRect(4, 4, 248, 36, 8);
  ctx.fill();

  // Color accent line
  const r = (hexColor >> 16) & 0xff;
  const g = (hexColor >> 8) & 0xff;
  const b = hexColor & 0xff;
  ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;

  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayText, 128, 22);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(5.5, 1.0, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorldviewBrainMap() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, isBrainMapOpen, closeBrainMap, selectNode, selectEdge } = useSnapMindStore();

  useEffect(() => {
    if (!isBrainMapOpen || !mountRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#060d1a');

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Shell wireframe
    const shellGeo = new THREE.IcosahedronGeometry(15, 2);
    const shellMat = new THREE.MeshBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.06, wireframe: true });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    scene.add(shell);

    // Prepare ViewModels
    const nodeVMs = toNodeViewModels(nodes);
    const edgeVMs = toEdgeViewModels(edges);

    // D3 Force Simulation
    const sim = forceSimulation(nodeVMs as any, 3)
      .force('link', forceLink(edgeVMs).id((d: any) => d.id).strength(0.3).distance(8))
      .force('charge', forceManyBody().strength(-80))
      .force('center', forceCenter(0, 0, 0))
      .alphaDecay(0.05);

    sim.tick(150); // Pre-warm to stable layout

    const neuronMeshes: THREE.Mesh[] = [];
    const labelSprites: THREE.Sprite[] = [];
    const edgeLines: THREE.Line[] = [];
    const edgeCylinders: THREE.Mesh[] = [];

    // ── Create Nodes + Labels ─────────────────────────────────────────────
    nodeVMs.forEach(n => {
      const size = 0.3 + n.strength * 0.7;
      const nodeColor = colorMap[n.nodeType] || 0xffffff;

      const geo = new THREE.SphereGeometry(size, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.2 + n.confidence * 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { nodeId: n.id };
      mesh.position.set(n.x, n.y, n.z);
      scene.add(mesh);
      neuronMeshes.push(mesh);

      // Label sprite above each node
      const sprite = makeTextSprite(n.label, nodeColor);
      sprite.position.set(n.x, n.y + size + 0.9, n.z);
      scene.add(sprite);
      labelSprites.push(sprite);
    });

    // ── Create Edges ───────────────────────────────────────────────────────
    edgeVMs.forEach(e => {
      const source = resolveBrainNode(e.source, nodeVMs);
      const target = resolveBrainNode(e.target, nodeVMs);
      if (!source || !target) return;

      // Visual line
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(source.x, source.y, source.z),
        new THREE.Vector3(target.x, target.y, target.z),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x4b5563,
        transparent: true,
        opacity: 0.2 + e.strength * 0.6,
      });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      edgeLines.push(line);

      // Invisible cylinder for raycasting
      const cylGeo = new THREE.CylinderGeometry(0.35, 0.35, 1, 8);
      const cylMat = new THREE.MeshBasicMaterial({ visible: false });
      const cyl = new THREE.Mesh(cylGeo, cylMat);
      cyl.userData = { edgeId: e.id, source, target };
      scene.add(cyl);
      edgeCylinders.push(cyl);
    });

    // ── Raycasting ──────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const nodeHits = raycaster.intersectObjects(neuronMeshes);
      if (nodeHits.length > 0) {
        selectNode(nodeHits[0].object.userData.nodeId as string);
        return;
      }

      const edgeHits = raycaster.intersectObjects(edgeCylinders);
      if (edgeHits.length > 0) {
        selectEdge(edgeHits[0].object.userData.edgeId as string);
        return;
      }

      selectNode(null);
      selectEdge(null);
    };

    window.addEventListener('pointerdown', onPointerDown);

    // ── Render Loop ─────────────────────────────────────────────────────────
    let animationFrameId: number;
    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      controls.update();

      // Update positions while simulation is still active
      if (sim.alpha() > sim.alphaMin()) {
        neuronMeshes.forEach((mesh, i) => {
          const n = nodeVMs[i];
          mesh.position.set(n.x, n.y, n.z);
          const size = 0.3 + n.strength * 0.7;
          labelSprites[i].position.set(n.x, n.y + size + 0.9, n.z);
        });

        edgeLines.forEach((line, i) => {
          const e = edgeVMs[i];
          const source = resolveBrainNode(e.source, nodeVMs);
          const target = resolveBrainNode(e.target, nodeVMs);
          if (source && target) {
            line.geometry.setFromPoints([
              new THREE.Vector3(source.x, source.y, source.z),
              new THREE.Vector3(target.x, target.y, target.z),
            ]);
          }
        });

        edgeCylinders.forEach(cyl => {
          const { source, target } = cyl.userData;
          const s = new THREE.Vector3(source.x, source.y, source.z);
          const t = new THREE.Vector3(target.x, target.y, target.z);
          const distance = s.distanceTo(t);
          cyl.position.copy(s.clone().lerp(t, 0.5));
          cyl.scale.set(1, distance, 1);
          cyl.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            t.clone().sub(s).normalize()
          );
        });
      }

      shell.rotation.y += 0.001;
      shell.rotation.x += 0.0005;

      renderer.render(scene, camera);
    };

    render();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      sim.stop();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isBrainMapOpen]);

  if (!isBrainMapOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Three.js canvas mount point */}
      <div ref={mountRef} className="absolute inset-0" />

      {/* Controls */}
      <button
        onClick={closeBrainMap}
        className="absolute top-6 right-6 text-white/50 hover:text-white z-[60] px-4 py-2 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
      >
        닫기
      </button>
      <div className="absolute top-6 left-6 text-white/40 font-mono text-xs pointer-events-none z-[60]">
        Brain Map · 노드 클릭으로 선택
      </div>

      {/* Inspector lives inside the fixed overlay — always visible */}
      <div className="absolute inset-0 pointer-events-none z-[60]">
        <div className="pointer-events-auto">
          <BrainMapInspector />
        </div>
      </div>
    </div>
  );
}
