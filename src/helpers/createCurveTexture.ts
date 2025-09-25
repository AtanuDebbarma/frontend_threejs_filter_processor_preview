import * as THREE from 'three';
import type {Curve} from '../types/filterTypes';

/**
 * Create a THREE.DataTexture from a set of curves, or return null if no curves are provided.
 * @param {Curve[] | undefined} curves - an array of Curve objects, each containing a channel (r, g, b, or all) and an array of points
 * @returns a THREE.DataTexture containing the pre-computed curve values, or null if no curves are provided
 */
export const createCurveTexture = (curves: Curve[] | undefined) => {
  const size = 256;
  // 4 bytes per texel (RGBA) to avoid GL_RGB/texStorage2D issues on ANGLE
  const data = new Uint8Array(size * 4);

  // --- helper: build interpolation points for r/g/b from input curves ---
  let rPoints: {x: number; y: number}[] | null = null;
  let gPoints: {x: number; y: number}[] | null = null;
  let bPoints: {x: number; y: number}[] | null = null;

  if (curves && curves.length) {
    curves.forEach(c => {
      const ch = c.channel || 'all';
      if (ch === 'r') rPoints = c.points;
      else if (ch === 'g') gPoints = c.points;
      else if (ch === 'b') bPoints = c.points;
      else if (ch === 'all') {
        if (!rPoints) rPoints = c.points;
        if (!gPoints) gPoints = c.points;
        if (!bPoints) bPoints = c.points;
      }
    });
  }

  // default identity if missing
  if (!rPoints)
    rPoints = [
      {x: 0, y: 0},
      {x: 1, y: 1},
    ];
  if (!gPoints) gPoints = rPoints;
  if (!bPoints) bPoints = rPoints;

  // --- natural cubic spline setup (Thomas algorithm for tridiagonal system) ---
  const buildSplineSecondDerivatives = (pts: {x: number; y: number}[]) => {
    const n = pts.length;
    const x = pts.map(p => p.x);
    const y = pts.map(p => p.y);

    // If only two points, second derivatives are zero (linear)
    if (n < 3) {
      return new Float64Array(n); // all zeros
    }

    const h = new Float64Array(n - 1);
    for (let i = 0; i < n - 1; i++) h[i] = x[i + 1] - x[i];

    // build tridiagonal system A * m = rhs, where m are second derivatives
    const alpha = new Float64Array(n - 1);
    for (let i = 1; i < n - 1; i++) {
      alpha[i] =
        (3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1]);
    }

    const l = new Float64Array(n);
    const mu = new Float64Array(n);
    const z = new Float64Array(n);

    l[0] = 1;
    mu[0] = z[0] = 0;
    for (let i = 1; i < n - 1; i++) {
      const hi_1 = h[i - 1];
      const hi = h[i];
      const denom = 2 * (x[i + 1] - x[i - 1]) - hi_1 * mu[i - 1];
      l[i] = denom;
      mu[i] = hi / denom;
      z[i] = (alpha[i] - hi_1 * z[i - 1]) / denom;
    }
    l[n - 1] = 1;
    z[n - 1] = 0;

    const m = new Float64Array(n);
    m[n - 1] = 0;
    for (let j = n - 2; j >= 0; j--) {
      m[j] = z[j] - mu[j] * m[j + 1];
    }
    return m; // second derivatives at knots
  };

  const evalSplineAt = (
    pts: {x: number; y: number}[],
    m: Float64Array,
    t: number,
  ) => {
    const n = pts.length;
    const x = pts.map(p => p.x);
    const y = pts.map(p => p.y);

    // clamp t to domain
    if (t <= x[0]) return y[0];
    if (t >= x[n - 1]) return y[n - 1];

    // find interval i s.t. x[i] <= t <= x[i+1]
    let i = 0;
    // small optimization: linear scan (n is tiny)
    for (let k = 0; k < n - 1; k++) {
      if (t >= x[k] && t <= x[k + 1]) {
        i = k;
        break;
      }
    }

    const h = x[i + 1] - x[i];
    if (h === 0) return y[i];

    const A = (x[i + 1] - t) / h;
    const B = (t - x[i]) / h;

    // natural cubic spline formula
    const S =
      A * y[i] +
      B * y[i + 1] +
      (((A * A * A - A) * m[i] + (B * B * B - B) * m[i + 1]) * (h * h)) / 6.0;

    return S;
  };

  // precompute second derivatives for each channel
  const mR = buildSplineSecondDerivatives(rPoints);
  const mG = buildSplineSecondDerivatives(gPoints);
  const mB = buildSplineSecondDerivatives(bPoints);

  // fill the texture (256 samples across 0..1)
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    const rv = evalSplineAt(rPoints, mR, t);
    const gv = evalSplineAt(gPoints, mG, t);
    const bv = evalSplineAt(bPoints, mB, t);

    data[i * 4 + 0] = Math.max(0, Math.min(255, Math.round(rv * 255)));
    data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(gv * 255)));
    data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(bv * 255)));
    data[i * 4 + 3] = 255;
  }

  const tex = new THREE.DataTexture(
    data,
    size,
    1,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  tex.needsUpdate = true;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
};
