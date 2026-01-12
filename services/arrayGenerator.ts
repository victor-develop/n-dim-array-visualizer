import { NDimArray, Point3D } from '../types';

/**
 * Generates a multi-dimensional array with random values.
 */
export const generateNDimArray = (dims: number[]): NDimArray => {
  if (dims.length === 0) return Math.random();
  const [current, ...rest] = dims;
  return Array.from({ length: current }, () => generateNDimArray(rest));
};

/**
 * Maps high-dimensional arrays into 3D using recursive spatial offsets.
 * D1-D3 control the global lattice position.
 * D4-D6 control local offsets within the lattice cell, and so on.
 */
export const flattenTo3D = (
  arr: NDimArray, 
  currentPath: number[] = [], 
  dimSizes: number[]
): Point3D[] => {
  if (typeof arr === 'number') {
    let x = 0, y = 0, z = 0;
    
    // Recursive Spatial Mapping: Every group of 3 dimensions creates a nested local coordinate space
    for (let i = 0; i < currentPath.length; i++) {
      const axis = i % 3;
      const recursionLevel = Math.floor(i / 3);
      const scaleFactor = Math.pow(0.42, recursionLevel);
      
      // Normalized position from -0.5 to 0.5
      const normalized = (currentPath[i] / (dimSizes[i] - 1 || 1)) - 0.5;
      
      if (axis === 0) x += normalized * scaleFactor;
      if (axis === 1) y += normalized * scaleFactor;
      if (axis === 2) z += normalized * scaleFactor;
    }

    // Creative Color Mapping: Color derived from dimension path and local cell value
    const pathSum = currentPath.reduce((acc, v, idx) => acc + v * (idx + 1), 0);
    const hue = (pathSum * 35 + arr * 40) % 360;
    const saturation = 70 + arr * 30;
    const lightness = 40 + arr * 30;

    return [{
      id: currentPath.join('-'),
      x: x * 45, // Global coordinate scale
      y: y * 45,
      z: z * 45,
      value: arr,
      color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      size: 0.15 + (arr * 0.35),
      metadata: { path: currentPath }
    }];
  }

  return arr.flatMap((sub, i) => flattenTo3D(sub, [...currentPath, i], dimSizes));
};