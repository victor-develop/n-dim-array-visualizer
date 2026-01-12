
export type NDimArray = number | NDimArray[];

export interface Point3D {
  x: number;
  y: number;
  z: number;
  value: number;
  id: string;
  color: string;
  size: number;
  metadata: Record<string, any>;
}

export interface VisualizationConfig {
  n: number;
  dimensionsSizes: number[];
  randomSeed: number;
}
