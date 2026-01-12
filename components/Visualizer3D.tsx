import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Point3D } from '../types';

interface Visualizer3DProps {
  points: Point3D[];
  onHover: (point: Point3D | null) => void;
  showLabels: boolean;
}

const Visualizer3D: React.FC<Visualizer3DProps> = ({ points, onHover, showLabels }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef(new THREE.Vector2());
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.InstancedMesh;
    raycaster: THREE.Raycaster;
    labelGroup: THREE.Group;
    hoverMarker: THREE.Mesh;
  } | null>(null);

  const createTextTexture = (text: string, color: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = 128;
    canvas.height = 64;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.roundRect(0, 0, 128, 64, 8);
    ctx.fill();
    ctx.font = 'bold 32px ui-monospace, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);
    return new THREE.CanvasTexture(canvas);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    camera.position.set(30, 30, 30);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);

    // Grid Helpers
    const grid = new THREE.GridHelper(100, 20, 0x1e293b, 0x0f172a);
    grid.position.y = -25;
    scene.add(grid);

    // Instanced Mesh for nodes
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshPhongMaterial({ shininess: 100 });
    const mesh = new THREE.InstancedMesh(geometry, material, 35000);
    scene.add(mesh);

    // Group for numeric labels
    const labelGroup = new THREE.Group();
    scene.add(labelGroup);

    // Hover Marker
    const hoverGeom = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.5 });
    const hoverMarker = new THREE.Mesh(hoverGeom, hoverMat);
    hoverMarker.visible = false;
    scene.add(hoverMarker);

    const raycaster = new THREE.Raycaster();
    sceneRef.current = { scene, camera, renderer, mesh, raycaster, labelGroup, hoverMarker };

    let currentHoverId: string | null = null;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      if (sceneRef.current) {
        const { raycaster, camera, mesh, renderer, hoverMarker } = sceneRef.current;
        raycaster.setFromCamera(mouseRef.current, camera);
        const intersects = raycaster.intersectObject(mesh);

        if (intersects.length > 0) {
          const id = intersects[0].instanceId;
          if (id !== undefined && points[id]) {
            const p = points[id];
            if (p.id !== currentHoverId) {
              currentHoverId = p.id;
              onHover(p);
              hoverMarker.visible = true;
              hoverMarker.position.set(p.x, p.y, p.z);
              hoverMarker.scale.setScalar(p.size * 2.8);
            }
          }
        } else {
          if (currentHoverId !== null) {
            currentHoverId = null;
            onHover(null);
            hoverMarker.visible = false;
          }
        }
        renderer.render(scene, camera);
      }
    };
    animate();

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('mousemove', onMove);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [points]);

  // Update Mesh Matrices
  useEffect(() => {
    if (!sceneRef.current) return;
    const { mesh } = sceneRef.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    points.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      const s = p.size * 2.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      color.set(p.color);
      mesh.setColorAt(i, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.count = points.length;
  }, [points]);

  // Update Numeric Labels
  useEffect(() => {
    if (!sceneRef.current) return;
    const { labelGroup, camera } = sceneRef.current;
    labelGroup.clear();

    if (!showLabels || points.length === 0) return;

    // Performance Optimization: Only show 100 labels closest to the camera
    const labeledPoints = [...points]
      .map(p => ({ p, dist: new THREE.Vector3(p.x, p.y, p.z).distanceTo(camera.position) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 100);

    labeledPoints.forEach(({p}) => {
      const tex = createTextTexture(p.value.toFixed(2), p.color);
      if (tex) {
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(p.x, p.y + 0.8, p.z);
        sprite.scale.set(1.5, 0.75, 1);
        labelGroup.add(sprite);
      }
    });
  }, [showLabels, points]);

  return <div ref={containerRef} className="w-full h-full cursor-crosshair" />;
};

export default Visualizer3D;