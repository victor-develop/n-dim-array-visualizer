import React, { useEffect, useRef } from 'react';
import * as THREE from 'this-is-not-working-use-import-instead';
import * as THREE_LIB from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Point3D } from '../types';

const THREE = THREE_LIB;

interface Visualizer3DProps {
  points: Point3D[];
  onHover: (point: Point3D | null) => void;
  showLabels: boolean;
  showAxes: boolean;
}

const Visualizer3D: React.FC<Visualizer3DProps> = ({ points, onHover, showLabels, showAxes }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef(new THREE.Vector2());
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.InstancedMesh;
    raycaster: THREE.Raycaster;
    labelGroup: THREE.Group;
    axesGroup: THREE.Group;
    hoverMarker: THREE.Mesh;
    hoverLabel: THREE.Sprite;
  } | null>(null);

  const createTextTexture = (text: string, color: string, bgColor: string = 'rgba(2, 6, 23, 0.9)') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const lines = text.split('\n');
    const fontSize = 28;
    ctx.font = `bold ${fontSize}px ui-monospace, monospace`;
    
    let maxWidth = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxWidth) maxWidth = w;
    });

    canvas.width = maxWidth + 40;
    canvas.height = lines.length * (fontSize + 10) + 30;

    ctx.fillStyle = bgColor;
    ctx.roundRect(0, 0, canvas.width, canvas.height, 12);
    ctx.fill();
    
    ctx.font = `bold ${fontSize}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    
    lines.forEach((line, i) => {
      ctx.fillText(line, canvas.width / 2, 25 + i * (fontSize + 10) + fontSize / 2);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    camera.position.set(40, 40, 40);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(20, 40, 20);
    scene.add(light);

    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshPhongMaterial({ shininess: 100 });
    const mesh = new THREE.InstancedMesh(geometry, material, 35000);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    const labelGroup = new THREE.Group();
    scene.add(labelGroup);

    const axesGroup = new THREE.Group();
    scene.add(axesGroup);

    const hoverGeom = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.8 });
    const hoverMarker = new THREE.Mesh(hoverGeom, hoverMat);
    hoverMarker.visible = false;
    scene.add(hoverMarker);

    const hoverLabelMat = new THREE.SpriteMaterial({ transparent: true, depthTest: false });
    const hoverLabel = new THREE.Sprite(hoverLabelMat);
    hoverLabel.visible = false;
    scene.add(hoverLabel);

    const raycaster = new THREE.Raycaster();
    sceneRef.current = { scene, camera, renderer, mesh, raycaster, labelGroup, axesGroup, hoverMarker, hoverLabel };

    let currentHoverId: string | null = null;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      if (sceneRef.current) {
        const { raycaster, camera, mesh, renderer, hoverMarker, hoverLabel } = sceneRef.current;
        raycaster.setFromCamera(mouseRef.current, camera);
        
        // Ensure raycaster uses the latest bounds
        const intersects = raycaster.intersectObject(mesh);

        if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== undefined && points[instanceId]) {
            const p = points[instanceId];
            if (p.id !== currentHoverId) {
              currentHoverId = p.id;
              onHover(p);
              hoverMarker.visible = true;
              hoverMarker.position.set(p.x, p.y, p.z);
              hoverMarker.scale.setScalar(p.size * 2.8);

              const indexPath = p.metadata.path.join(',');
              const tex = createTextTexture(`VAL: ${p.value.toFixed(4)}\nIDX: [${indexPath}]`, '#ffffff');
              if (tex) {
                hoverLabel.material.map = tex;
                hoverLabel.material.needsUpdate = true;
                hoverLabel.visible = true;
                hoverLabel.position.set(p.x, p.y + 1.5, p.z);
                hoverLabel.scale.set(3, 1.5, 1);
              }
            }
          }
        } else {
          if (currentHoverId !== null) {
            currentHoverId = null;
            onHover(null);
            hoverMarker.visible = false;
            hoverLabel.visible = false;
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

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('resize', onResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [points]);

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
    
    mesh.count = points.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    
    // CRITICAL: Raycasting for InstancedMesh requires valid bounding spheres.
    // By default, THREE.InstancedMesh only bounds the geometry at origin.
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [points]);

  useEffect(() => {
    if (!sceneRef.current) return;
    const { labelGroup, camera } = sceneRef.current;
    labelGroup.clear();

    if (!showLabels || points.length === 0) return;

    const maxLabels = points.length < 500 ? points.length : 120;
    const labeledPoints = [...points]
      .map(p => ({ p, dist: new THREE.Vector3(p.x, p.y, p.z).distanceTo(camera.position) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, maxLabels);

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

  useEffect(() => {
    if (!sceneRef.current) return;
    const { axesGroup } = sceneRef.current;
    axesGroup.clear();

    if (!showAxes || points.length === 0) return;

    const uniqueX = Array.from(new Set(points.map(p => p.x))).sort((a: number, b: number) => a - b);
    const uniqueY = Array.from(new Set(points.map(p => p.y))).sort((a: number, b: number) => a - b);
    const uniqueZ = Array.from(new Set(points.map(p => p.z))).sort((a: number, b: number) => a - b);

    const minX = (uniqueX[0] as number) ?? 0, maxX = (uniqueX[uniqueX.length - 1] as number) ?? 0;
    const minY = (uniqueY[0] as number) ?? 0, maxY = (uniqueY[uniqueY.length - 1] as number) ?? 0;
    const minZ = (uniqueZ[0] as number) ?? 0, maxZ = (uniqueZ[uniqueZ.length - 1] as number) ?? 0;

    const midX = (uniqueX[Math.floor(uniqueX.length / 2)] as number) ?? 0;
    const midY = (uniqueY[Math.floor(uniqueY.length / 2)] as number) ?? 0;
    const midZ = (uniqueZ[Math.floor(uniqueZ.length / 2)] as number) ?? 0;

    const totalLinesEstimate = (uniqueY.length * uniqueZ.length) + (uniqueX.length * uniqueZ.length) + (uniqueX.length * uniqueY.length);
    const isPerformanceMode = totalLinesEstimate > 8000;

    const xPoints: THREE.Vector3[] = [];
    const yPoints: THREE.Vector3[] = [];
    const zPoints: THREE.Vector3[] = [];

    uniqueY.forEach((uy, yIdx) => {
      uniqueZ.forEach((uz, zIdx) => {
        if (isPerformanceMode && (yIdx % 2 !== 0 || zIdx % 2 !== 0)) return;
        xPoints.push(new THREE.Vector3(minX, uy, uz), new THREE.Vector3(maxX, uy, uz));
      });
    });

    uniqueX.forEach((ux, xIdx) => {
      uniqueZ.forEach((uz, zIdx) => {
        if (isPerformanceMode && (xIdx % 2 !== 0 || zIdx % 2 !== 0)) return;
        yPoints.push(new THREE.Vector3(ux, minY, uz), new THREE.Vector3(ux, maxY, uz));
      });
    });

    uniqueX.forEach((ux, xIdx) => {
      uniqueY.forEach((uy, yIdx) => {
        if (isPerformanceMode && (xIdx % 2 !== 0 || yIdx % 2 !== 0)) return;
        zPoints.push(new THREE.Vector3(ux, uy, minZ), new THREE.Vector3(ux, uy, maxZ));
      });
    });

    const addScaffold = (pts: THREE.Vector3[], color: number) => {
      if (pts.length === 0) return;
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: isPerformanceMode ? 0.08 : 0.15 });
      axesGroup.add(new THREE.LineSegments(geom, mat));
    };

    addScaffold(xPoints, 0xff4444);
    addScaffold(yPoints, 0x44ff44);
    addScaffold(zPoints, 0x4444ff);

    const firstPoint = points[0];
    const n = firstPoint ? (firstPoint.metadata.path as number[]).length : 3;
    const getDimList = (offset: number) => {
      const list = [];
      for (let i = offset; i < n; i += 3) {
        list.push(`d${i+1}`);
      }
      return list.join(', ');
    };

    const axesLabels = [
      { pos: [maxX + 2, midY, midZ], text: getDimList(0), color: '#ff4444' },
      { pos: [midX, maxY + 2, midZ], text: getDimList(1), color: '#44ff44' },
      { pos: [midX, midY, maxZ + 2], text: getDimList(2), color: '#4444ff' }
    ];

    axesLabels.forEach(al => {
      const tex = createTextTexture(al.text, al.color, 'rgba(2, 6, 23, 0.85)');
      if (tex) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
        sprite.position.set(al.pos[0] as number, al.pos[1] as number, al.pos[2] as number);
        const scaleX = (al.text.length * 0.4) + 1.2;
        sprite.scale.set(scaleX, 1, 1);
        axesGroup.add(sprite);
      }
    });

  }, [showAxes, points]);

  return <div ref={containerRef} className="w-full h-full cursor-crosshair" />;
};

export default Visualizer3D;