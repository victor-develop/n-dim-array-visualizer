import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Point3D } from '../types';

interface Visualizer3DProps {
  points: Point3D[];
  onHover: (point: Point3D | null) => void;
}

const Visualizer3D: React.FC<Visualizer3DProps> = ({ points, onHover }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef(new THREE.Vector2());
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    mesh: THREE.InstancedMesh;
    raycaster: THREE.Raycaster;
  } | null>(null);

  const [lastId, setLastId] = useState<string | null>(null);

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

    const raycaster = new THREE.Raycaster();
    sceneRef.current = { scene, camera, renderer, mesh, raycaster };

    let currentHoverId: string | null = null;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      
      if (sceneRef.current) {
        const { raycaster, camera, scene, mesh, renderer } = sceneRef.current;
        raycaster.setFromCamera(mouseRef.current, camera);
        const intersects = raycaster.intersectObject(mesh);
        
        if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== undefined && points[instanceId]) {
            const point = points[instanceId];
            if (point.id !== currentHoverId) {
              currentHoverId = point.id;
              onHover(point);
            }
          }
        } else {
          if (currentHoverId !== null) {
            currentHoverId = null;
            onHover(null);
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
  }, [points]); // Re-init controls if points reference changes significantly, but handled by useEffect below mainly

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

  return <div ref={containerRef} className="w-full h-full cursor-crosshair" />;
};

export default Visualizer3D;