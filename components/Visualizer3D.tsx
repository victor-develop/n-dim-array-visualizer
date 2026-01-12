
import React, { useEffect, useRef, useState } from 'react';
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
    hoverLabel: THREE.Sprite;
  } | null>(null);

  // Helper to create a text sprite
  const createTextSprite = (text: string, color: string = '#ffffff', scale: number = 1) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Sprite();

    const fontSize = 48;
    ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    const textMetrics = ctx.measureText(text);
    canvas.width = textMetrics.width + 20;
    canvas.height = fontSize + 20;

    // Redraw with correct dimensions
    ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.8)';
    ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set((canvas.width / 50) * scale, (canvas.height / 50) * scale, 1);
    return sprite;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    camera.position.set(25, 20, 25);

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const pointLight = new THREE.PointLight(0x6366f1, 2, 100);
    pointLight.position.set(10, 20, 10);
    scene.add(pointLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(15, 30, 15);
    scene.add(directionalLight);

    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshPhongMaterial({ shininess: 80 });
    const mesh = new THREE.InstancedMesh(geometry, material, 35000);
    scene.add(mesh);

    const labelGroup = new THREE.Group();
    scene.add(labelGroup);

    const hoverLabel = createTextSprite('0.000', '#6366f1', 1.2);
    hoverLabel.visible = false;
    scene.add(hoverLabel);

    const raycaster = new THREE.Raycaster();
    sceneRef.current = { scene, camera, renderer, mesh, raycaster, labelGroup, hoverLabel };

    let currentHoverId: string | null = null;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      
      if (sceneRef.current) {
        const { raycaster, camera, scene, mesh, renderer, hoverLabel } = sceneRef.current;
        raycaster.setFromCamera(mouseRef.current, camera);
        const intersects = raycaster.intersectObject(mesh);
        
        if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== undefined && points[instanceId]) {
            const point = points[instanceId];
            if (point.id !== currentHoverId) {
              currentHoverId = point.id;
              onHover(point);
              
              // Update Hover Sprite
              hoverLabel.visible = true;
              hoverLabel.position.set(point.x, point.y + 1, point.z);
              // Re-draw sprite texture for value
              const newSprite = createTextSprite(point.value.toFixed(4), point.color, 1.5);
              hoverLabel.material.map = newSprite.material.map;
              hoverLabel.material.needsUpdate = true;
              hoverLabel.scale.copy(newSprite.scale);
            }
          }
        } else {
          if (currentHoverId !== null) {
            currentHoverId = null;
            onHover(null);
            hoverLabel.visible = false;
          }
        }

        renderer.render(scene, camera);
      }
    };
    animate();

    const onMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [points]);

  // Points/Geometry Update
  useEffect(() => {
    if (!sceneRef.current) return;
    const { mesh } = sceneRef.current;

    mesh.count = points.length;
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
  }, [points]);

  // Labels (Show All) Update with Proximity Throttling
  useEffect(() => {
    if (!sceneRef.current) return;
    const { labelGroup, camera } = sceneRef.current;
    
    // Clear old labels
    labelGroup.clear();

    if (!showLabels) return;

    // Performance safety: Only render up to 150 closest labels to avoid crashing
    // For large datasets, rendering every label is impossible
    const sortedPoints = [...points]
      .map(p => ({ 
        p, 
        dist: new THREE.Vector3(p.x, p.y, p.z).distanceTo(camera.position) 
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 150);

    sortedPoints.forEach(({p}) => {
      const sprite = createTextSprite(p.value.toFixed(2), p.color, 0.6);
      sprite.position.set(p.x, p.y + 0.6, p.z);
      labelGroup.add(sprite);
    });

  }, [showLabels, points]);

  return <div ref={containerRef} className="w-full h-full cursor-crosshair" />;
};

export default Visualizer3D;
