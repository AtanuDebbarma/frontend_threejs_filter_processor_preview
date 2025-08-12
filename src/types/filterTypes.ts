// types/filterTypes.ts
export type FilterCategory =
  | 'None'
  | 'Color Boost'
  | 'Nature'
  | 'Black & White'
  | 'Cinematic'
  | 'Landscape'
  | 'Lifestyle'
  | 'Moody'
  | 'Portrait';

export type CurvePoint = {x: number; y: number}; // 0..1

export type Curve = {
  channel?: 'all' | 'r' | 'g' | 'b';
  points: CurvePoint[]; // piecewise control points (0..1)
};

export type ColorBalance = {
  r?: number;
  g?: number;
  b?: number;
};

export type UnsharpParams = {
  amount?: number;
  radius?: number;
  threshold?: number;
};

export type FilterParams = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  gamma?: number;
  hue?: number;
  colorBalance?: ColorBalance;
  curves?: Curve[]; // <-- declare curves
  unsharp?: UnsharpParams;
  shadows?: number;
  highlights?: number;
  temperature?: number;
  blur?: number;

  ffmpeg?: string | null;
  order?: string[];
  // NEW optional flags for color handling:
  colorSpace?: 'srgb' | 'rec709' | 'linear';
  inputRange?: 'full' | 'limited';
};

export type FilterItem = {
  name: string;
  key: string | null;
  category: FilterCategory;
  params: FilterParams;
};
