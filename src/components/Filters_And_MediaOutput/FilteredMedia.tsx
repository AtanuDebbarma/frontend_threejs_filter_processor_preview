// src/components/FilteredMedia.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {appStore} from '../../store/appStore';
import type {ColorBalance, Curve, FilterItem} from '../../types/filterTypes';
import {scheduleClearApplying} from '../../utils/filter_utils';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D tDiffuse;
  uniform float brightness;
  uniform float contrast;
  uniform float saturation;
  uniform float gammaVal;
  uniform vec3 colorBalance;
  uniform float hue; // radians
  uniform float unsharpAmount;
  uniform sampler2D curveTex;
  uniform float hasCurve;
  uniform float u_colorSpace;
  uniform float u_inputRange;
  uniform float shadows;
  uniform float highlights;
  uniform float temperature;
  uniform float blur;

  varying vec2 vUv;

  // ---------- limited range helpers (approx) ----------
  vec3 limitedToFull(vec3 c) {
    float ymin = 16.0/255.0;
    float ymax = 235.0/255.0;
    float scale = 1.0 / (ymax - ymin);
    return (c - vec3(ymin)) * vec3(scale);
  }

  // ---------- sRGB transfer (exact piecewise) ----------
  vec3 sRGBToLinear(vec3 c) {
    vec3 cutoff = step(vec3(0.04045), c);
    vec3 low = c / 12.92;
    vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
    return mix(low, high, cutoff);
  }
  vec3 linearToSRGB(vec3 c) {
    vec3 cutoff = step(vec3(0.0031308), c);
    vec3 low = c * 12.92;
    vec3 high = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
    return mix(low, high, cutoff);
  }

  // ---------- Rec.709 transfer (piecewise) ----------
  vec3 rec709ToLinear(vec3 c) {
    vec3 mask = step(vec3(0.081), c);
    vec3 low = c / 4.5;
    vec3 high = pow((c + 0.099) / 1.099, vec3(1.0/0.45));
    return mix(low, high, mask);
  }
  vec3 linearToRec709(vec3 c) {
    vec3 mask = step(vec3(0.018), c);
    vec3 low = c * 4.5;
    vec3 high = 1.099 * pow(c, vec3(0.45)) - 0.099;
    return mix(low, high, mask);
  }

  // ---------- color math helpers ----------
  vec3 applyContrast(vec3 col, float cont) {
    return ((col - 0.5) * cont) + 0.5;
  }

  vec3 applySaturation(vec3 color, float sat) {
    float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(l), color, sat);
  }

  vec3 hueRotate(vec3 color, float angle) {
    const mat3 rgb2yiq = mat3(
      0.299, 0.587, 0.114,
      0.596, -0.274, -0.322,
      0.211, -0.523, 0.312
    );
    const mat3 yiq2rgb = mat3(
      1.0, 0.956, 0.621,
      1.0, -0.272, -0.647,
      1.0, -1.105, 1.702
    );
    vec3 yiq = rgb2yiq * color;
    float cs = cos(angle);
    float sn = sin(angle);
    mat3 rot = mat3(
      1.0, 0.0, 0.0,
      0.0, cs, -sn,
      0.0, sn, cs
    );
    vec3 yiq2 = rot * yiq;
    return yiq2rgb * yiq2;
  }

  vec3 boxBlur(sampler2D samp, vec2 uv) {
    vec2 texel = 1.0 / vec2(textureSize(samp, 0));
    vec3 sum = vec3(0.0);
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        sum += texture2D(samp, uv + vec2(float(i), float(j)) * texel).rgb;
      }
    }
    return sum / 9.0;
  }

  // Temperature adjustment function (approximate)
  vec3 applyTemperature(vec3 color, float temp) {
    float t = temp / 100.0;
    color.r += t * 0.1;
    color.b -= t * 0.1;
    return clamp(color, 0.0, 1.0);
  }

  // Shadows and highlights adjustment (simple approximation)
  vec3 applyShadowsHighlights(vec3 color, float shadowsVal, float highlightsVal) {
    color = mix(color, vec3(0.0), shadowsVal < 0.0 ? -shadowsVal : 0.0);
    color = mix(color, vec3(1.0), highlightsVal > 0.0 ? highlightsVal : 0.0);
    return color;
  }

  void main() {
    vec4 sampled = texture2D(tDiffuse, vUv);
    vec3 c = sampled.rgb;

    if (u_inputRange > 0.5) {
      c = limitedToFull(c);
    }

    if (u_colorSpace < 0.5) {
      c = sRGBToLinear(c);
    } else if (u_colorSpace < 1.5) {
      c = rec709ToLinear(c);
    }

    c += vec3(brightness);
    c = applyContrast(c, contrast);
    c = applySaturation(c, saturation);
    c += colorBalance;

    if (abs(hue) > 0.0001) {
      c = hueRotate(c, hue);
    }

    if (hasCurve > 0.5) {
      c.r = texture2D(curveTex, vec2(clamp(c.r, 0.0, 1.0), 0.5)).r;
      c.g = texture2D(curveTex, vec2(clamp(c.g, 0.0, 1.0), 0.5)).g;
      c.b = texture2D(curveTex, vec2(clamp(c.b, 0.0, 1.0), 0.5)).b;
    }

    c = applyShadowsHighlights(c, shadows, highlights);

    c = applyTemperature(c, temperature);

    if (unsharpAmount > 0.0001) {
      vec3 orig = c;
      vec3 blurSrgb = boxBlur(tDiffuse, vUv);
      vec3 blurLinear;
      if (u_colorSpace < 0.5) blurLinear = sRGBToLinear(blurSrgb);
      else if (u_colorSpace < 1.5) blurLinear = rec709ToLinear(blurSrgb);
      else blurLinear = blurSrgb;
      c = mix(orig, orig + (orig - blurLinear) * unsharpAmount, 1.0);
    }

    if (blur > 0.01) {
      vec3 blurred = boxBlur(tDiffuse, vUv);
      c = mix(c, blurred, blur / 10.0);
    }

    if (gammaVal > 0.0) {
      c = pow(c, vec3(1.0 / gammaVal));
    }

    if (u_colorSpace < 0.5) {
      c = linearToSRGB(c);
    } else if (u_colorSpace < 1.5) {
      c = linearToRec709(c);
    }

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), sampled.a);
  }
`;

type Props = {
  url: string;
  isVideo: boolean;
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover';
  aspectType?: 'square' | 'landscape' | 'vertical';
  originalWidth?: number;
  originalHeight?: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  handleTap?: () => void;
};

const FilteredMedia = (props: Props): React.JSX.Element => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const videoContainerRef = useRef<HTMLElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const applyingStartRef = useRef<number | null>(null);
  const pendingClearRef = useRef<number | null>(null);
  const didSetApplyingRef = useRef<boolean>(false);

  const activeFilter = appStore(state => state.activeFilter);
  const setIsApplyingFilter = appStore(state => state.setIsApplyingFilter);
  const brightness = appStore(state => state.brightness);
  const contrast = appStore(state => state.contrast);
  const saturation = appStore(state => state.saturation);
  const gamma = appStore(state => state.gamma);
  const hue = appStore(state => state.hue);
  const colorBalance: ColorBalance = appStore(state => state.colorBalance);
  const sharpness = appStore(state => state.sharpness);
  const shadows = appStore(state => state.shadows);
  const highlights = appStore(state => state.highlights);
  const temperature = appStore(state => state.temperature);
  const blur = appStore(state => state.blur);

  // R3F hooks
  const {viewport, size, gl} = useThree();

  // set DPR
  useEffect(() => {
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    gl.setPixelRatio(dpr);
  }, [gl]);

  // media texture state: start with placeholder -> real texture when ready
  const [mediaTextureState, setMediaTextureState] =
    useState<THREE.Texture | null>(null);

  // --- create / update media texture based on props.url and props.isVideo --- //
  useEffect(() => {
    // cleanup previous
    return () => {
      if (mediaTextureState) {
        try {
          mediaTextureState.dispose && mediaTextureState.dispose();
        } catch (e) {
          // ignore
        }
        setMediaTextureState(null);
      }
      if (videoElRef.current) {
        try {
          videoElRef.current.pause();
          videoElRef.current.src = '';
          videoElRef.current.load && videoElRef.current.load();
        } catch (e) {
          // ignore
        }
        videoElRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.url, props.isVideo]);

  useEffect(() => {
    // image path: create texture immediately
    if (!props.isVideo) {
      // start "applying / loading" flag
      (async () => {
        try {
          await setIsApplyingFilter(true);
          didSetApplyingRef.current = true;
          applyingStartRef.current = Date.now();

          // cancel any previously scheduled clear (we're starting a new apply)
          if (pendingClearRef.current) {
            window.clearTimeout(pendingClearRef.current);
            pendingClearRef.current = null;
          }
        } catch (e) {
          // ignore
        }
      })();
      const loader = new THREE.TextureLoader();
      const tex = loader.load(
        props.url,
        // onLoad
        loadedTex => {
          try {
            loadedTex.generateMipmaps = true;
            loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
            loadedTex.magFilter = THREE.LinearFilter;
            loadedTex.needsUpdate = true;
            setMediaTextureState(prev => {
              try {
                prev?.dispose && prev.dispose();
              } catch (e) {
                // ignore
              }
              return loadedTex;
            });
          } finally {
            // clear applying flag
            scheduleClearApplying(
              false,
              didSetApplyingRef,
              pendingClearRef,
              setIsApplyingFilter,
              applyingStartRef,
            );
          }
        },
        // onProgress (optional)
        undefined,
        // onError
        err => {
          console.warn('Texture load error', err);
          scheduleClearApplying(
            true,
            didSetApplyingRef,
            pendingClearRef,
            setIsApplyingFilter,
            applyingStartRef,
          );
        },
      );

      // set initial (possibly used) texture synchronously as your code already did
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;

      setMediaTextureState(prev => {
        try {
          prev?.dispose && prev.dispose();
        } catch (e) {
          // ignore
        }
        return tex;
      });

      return;
    }

    // ---- video path ----
    // create video element, placeholder texture first to avoid "no image data" warning
    const videoEl = document.createElement('video');
    videoEl.src = props.url;
    videoEl.crossOrigin = 'anonymous';
    videoEl.loop = true;
    videoEl.muted = false;
    videoEl.playsInline = true;
    videoEl.autoplay = false;
    videoEl.controls = false;
    videoEl.preload = 'metadata';

    // tiny hidden style for container append
    videoEl.style.position = 'absolute';
    videoEl.style.left = '0';
    videoEl.style.top = '0';
    videoEl.style.width = '1px';
    videoEl.style.height = '1px';
    videoEl.style.opacity = '0';
    videoEl.style.pointerEvents = 'none';

    videoElRef.current = videoEl;

    // placeholder 1x1 RGBA texture prevents THREE/ANGLE GL_RGB rejection on some drivers
    const placeholder = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255]), // RGBA (R,G,B,A)
      1,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );
    placeholder.needsUpdate = true;
    placeholder.minFilter = THREE.NearestFilter;
    placeholder.magFilter = THREE.NearestFilter;
    placeholder.generateMipmaps = false;

    setMediaTextureState(prev => {
      try {
        prev?.dispose && prev.dispose();
      } catch (e) {
        // ignore
      }
      return placeholder;
    });

    // create container near canvas
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    container.style.pointerEvents = 'none';
    container.setAttribute('data-filteredmedia-video', 'true');
    container.appendChild(videoEl);

    const parent =
      (gl && gl.domElement && (gl.domElement.parentNode as HTMLElement)) ||
      document.body;
    try {
      parent.appendChild(container);
    } catch (e) {
      // fallback
      try {
        document.body.appendChild(container);
      } catch (e2) {
        // ignore
      }
    }
    videoContainerRef.current = container;

    // metadata handler: create VideoTexture once we have dimensions
    const onMetadata = async () => {
      try {
        await setIsApplyingFilter(true);
        didSetApplyingRef.current = true;
        applyingStartRef.current = Date.now();

        // cancel any previously scheduled clear (we're starting a new apply)
        if (pendingClearRef.current) {
          window.clearTimeout(pendingClearRef.current);
          pendingClearRef.current = null;
        }
      } catch (e) {
        // ignore
      }

      try {
        const vt = new THREE.VideoTexture(videoEl);
        vt.minFilter = THREE.LinearFilter;
        vt.magFilter = THREE.LinearFilter;
        vt.generateMipmaps = false;
        vt.needsUpdate = true;
        (vt as any).__videoElement = videoEl;

        setMediaTextureState(prev => {
          try {
            prev?.dispose && prev.dispose();
          } catch (e) {
            // ignore
          }
          return vt;
        });

        if (props.videoRef) props.videoRef.current = videoEl;
      } catch (e) {
        console.warn('Failed to create VideoTexture', e);
      } finally {
        if (didSetApplyingRef.current) {
          // prefer graceful min-delay clear
          scheduleClearApplying(
            false,
            didSetApplyingRef,
            pendingClearRef,
            setIsApplyingFilter,
            applyingStartRef,
          );
        }
      }
    };

    const onError = (ev: any) => {
      console.warn('video load error', ev);
      // prefer graceful min-delay clear
      scheduleClearApplying(
        true,
        didSetApplyingRef,
        pendingClearRef,
        setIsApplyingFilter,
        applyingStartRef,
      );
    };

    videoEl.addEventListener('loadedmetadata', onMetadata);
    videoEl.addEventListener('error', onError);

    // attach click handler if provided
    if (props.handleTap) videoEl.addEventListener('click', props.handleTap);

    // don't autoplay here; parent manages play via refs
    return () => {
      videoEl.removeEventListener('loadedmetadata', onMetadata);
      videoEl.removeEventListener('error', onError);
      if (props.handleTap)
        videoEl.removeEventListener('click', props.handleTap);
      if (props.videoRef && props.videoRef.current === videoEl)
        props.videoRef.current = null;

      try {
        if (videoContainerRef.current && videoContainerRef.current.parentNode) {
          videoContainerRef.current.parentNode.removeChild(
            videoContainerRef.current,
          );
        }
      } catch (e) {
        // ignore
      }
      videoContainerRef.current = null;

      try {
        videoEl.pause();
        videoEl.src = '';
        videoEl.load && videoEl.load();
      } catch (e) {
        // ignore
      }
      videoElRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.url, props.isVideo, gl]);

  // update VideoTexture each frame if present
  useFrame(() => {
    if (mediaTextureState instanceof THREE.VideoTexture) {
      (mediaTextureState as THREE.VideoTexture).needsUpdate = true;
    }
  });

  // ---------- curve texture creation ----------
  const createCurveTexture = useCallback((curves?: Curve[] | undefined) => {
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
  }, []);

  const [curveTexture, setCurveTexture] = useState<THREE.Texture | null>(null);
  const [curvePresent, setCurvePresent] = useState(false);

  useEffect(() => {
    return () => {
      if (curveTexture) {
        try {
          curveTexture?.dispose?.();
        } catch (e) {
          // ignore
        }
        setCurveTexture(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  useEffect(() => {
    if (!activeFilter || !activeFilter.params || !activeFilter.params.curves) {
      setCurvePresent(false);
      if (curveTexture) {
        try {
          curveTexture?.dispose?.();
        } catch (e) {
          // ignore
        }
        setCurveTexture(null);
      }
      return;
    }
    const tex = createCurveTexture(activeFilter.params.curves);
    setCurveTexture(tex);
    setCurvePresent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter?.params?.curves, createCurveTexture]);

  const resolveColorSpaceAndRange = useCallback(
    (filter: FilterItem | null) => {
      let cs: 'srgb' | 'rec709' | 'linear' = props.isVideo ? 'rec709' : 'srgb';
      let range: 'full' | 'limited' = 'full';

      if (filter && filter.params) {
        if (
          filter.params.colorSpace === 'rec709' ||
          filter.params.colorSpace === 'srgb' ||
          filter.params.colorSpace === 'linear'
        ) {
          cs = filter.params.colorSpace;
        }
        if (
          filter.params.inputRange === 'limited' ||
          filter.params.inputRange === 'full'
        ) {
          range = filter.params.inputRange;
        }
      }

      const csVal = cs === 'rec709' ? 1.0 : cs === 'linear' ? 2.0 : 0.0;
      const rangeVal = range === 'limited' ? 1.0 : 0.0;
      return {csVal, rangeVal};
    },
    [props.isVideo],
  );

  // material creation (memoized)
  const materialRef = useRef<THREE.Material | null>(null);
  const material = useMemo<THREE.Material>(() => {
    if (!activeFilter || !activeFilter.params) {
      const fallback = new THREE.MeshBasicMaterial({
        map: mediaTextureState ?? undefined,
      });
      fallback.side = THREE.DoubleSide;
      fallback.name = 'NO_FILTER_FALLBACK';
      materialRef.current = fallback;
      return fallback;
    }

    const p = activeFilter.params;
    const {csVal, rangeVal} = resolveColorSpaceAndRange(activeFilter);

    const merged = {
      brightness: brightness ?? p.brightness ?? 0.0,
      contrast: contrast ?? p.contrast ?? 1.0,
      saturation: saturation ?? p.saturation ?? 1.0,
      gamma: gamma ?? p.gamma ?? 1.0,
      hue: hue ?? p.hue ?? 0.0,
      colorBalance: colorBalance ?? p.colorBalance ?? {r: 0, g: 0, b: 0},
      unsharpAmount: sharpness ?? p.unsharp?.amount ?? 0.0,
      shadows: shadows ?? p.shadows ?? 0.0,
      highlights: highlights ?? p.highlights ?? 0.0,
      temperature: temperature ?? p.temperature ?? 0.0,
      blur: blur ?? p.blur ?? 0.0,
    };

    const uniforms: any = {
      tDiffuse: {value: mediaTextureState},
      brightness: {value: merged.brightness},
      contrast: {value: merged.contrast},
      saturation: {value: merged.saturation},
      gammaVal: {value: merged.gamma},
      colorBalance: {
        value: new THREE.Vector3(
          merged.colorBalance.r ?? 0,
          merged.colorBalance.g ?? 0,
          merged.colorBalance.b ?? 0,
        ),
      },
      hue: {value: (merged.hue * Math.PI) / 180.0},
      unsharpAmount: {value: merged.unsharpAmount},
      shadows: {value: merged.shadows},
      highlights: {value: merged.highlights},
      temperature: {value: merged.temperature},
      blur: {value: merged.blur},
      curveTex: {value: curveTexture},
      hasCurve: {value: curvePresent ? 1.0 : 0.0},
      u_colorSpace: {value: csVal},
      u_inputRange: {value: rangeVal},
    };

    const shaderMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    shaderMat.side = THREE.DoubleSide;
    shaderMat.name = 'ParamsShaderMaterial';
    materialRef.current = shaderMat;
    return shaderMat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mediaTextureState,
    activeFilter,
    curveTexture,
    curvePresent,
    resolveColorSpaceAndRange,
    brightness,
    contrast,
    saturation,
    gamma,
    hue,
    colorBalance?.r,
    colorBalance?.g,
    colorBalance?.b,
    sharpness,
    shadows,
    highlights,
    temperature,
    blur,
  ]);
  // keep material texture uniform updated when mediaTextureState changes
  useEffect(() => {
    const mat: any = materialRef.current;
    if (!mat) return;
    if (mat.uniforms && mat.uniforms.tDiffuse) {
      mat.uniforms.tDiffuse.value = mediaTextureState;
      mat.needsUpdate = true;
    } else if ((mat as THREE.MeshBasicMaterial).map !== undefined) {
      (mat as THREE.MeshBasicMaterial).map = mediaTextureState ?? null;
      mat.needsUpdate = true;
    }
  }, [mediaTextureState]);

  // update material uniforms if filter params change
  useEffect(() => {
    const mat: any = materialRef.current;
    if (!mat || !mat.uniforms) return;
    const p = activeFilter?.params;
    if (!p) return;
    const {csVal, rangeVal} = resolveColorSpaceAndRange(activeFilter);

    const merged = {
      brightness: brightness ?? p.brightness ?? 0.0,
      contrast: contrast ?? p.contrast ?? 1.0,
      saturation: saturation ?? p.saturation ?? 1.0,
      gamma: gamma ?? p.gamma ?? 1.0,
      hue: hue ?? p.hue ?? 0.0,
      colorBalance: colorBalance ?? p.colorBalance ?? {r: 0, g: 0, b: 0},
      unsharpAmount: sharpness ?? p.unsharp?.amount ?? 0.0,
      shadows: shadows ?? p.shadows ?? 0.0,
      highlights: highlights ?? p.highlights ?? 0.0,
      temperature: temperature ?? p.temperature ?? 0.0,
      blur: blur ?? p.blur ?? 0.0,
    };

    mat.uniforms.brightness.value = merged.brightness;
    mat.uniforms.contrast.value = merged.contrast;
    mat.uniforms.saturation.value = merged.saturation;
    mat.uniforms.gammaVal.value = merged.gamma;
    mat.uniforms.colorBalance.value = new THREE.Vector3(
      merged.colorBalance.r ?? 0,
      merged.colorBalance.g ?? 0,
      merged.colorBalance.b ?? 0,
    );
    mat.uniforms.hue.value = (merged.hue * Math.PI) / 180.0;
    mat.uniforms.unsharpAmount.value = merged.unsharpAmount;
    mat.uniforms.shadows.value = merged.shadows;
    mat.uniforms.highlights.value = merged.highlights;
    mat.uniforms.temperature.value = merged.temperature;
    mat.uniforms.blur.value = merged.blur;
    mat.uniforms.curveTex.value = curveTexture;
    mat.uniforms.hasCurve.value = curvePresent ? 1.0 : 0.0;
    mat.uniforms.u_colorSpace.value = csVal;
    mat.uniforms.u_inputRange.value = rangeVal;

    mat.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeFilter,
    curveTexture,
    curvePresent,
    props.isVideo,
    brightness,
    contrast,
    saturation,
    gamma,
    hue,
    colorBalance?.r,
    colorBalance?.g,
    colorBalance?.b,
    sharpness,
    shadows,
    highlights,
    temperature,
    blur,
  ]);

  // prev material disposal to avoid leaks when material changes
  const prevMatRef = useRef<THREE.Material | null>(null);
  useEffect(() => {
    const prev = prevMatRef.current;
    if (prev && prev !== material) {
      try {
        const uniforms: any = (prev as any)?.uniforms;
        if (uniforms) {
          const a = uniforms.tDiffuse?.value as THREE.Texture | undefined;
          const b = uniforms.curveTex?.value as THREE.Texture | undefined;
          if (a && a.dispose) a.dispose();
          if (b && b.dispose) b.dispose();
        }
        if ((prev as any).map && (prev as any).map.dispose)
          (prev as any).map.dispose();
      } catch (e) {
        // ignore
      }
      prev.dispose && prev.dispose();
    }
    prevMatRef.current = material;

    return () => {
      if (prevMatRef.current === material) {
        try {
          const uniforms: any = (material as any)?.uniforms;
          if (uniforms) {
            const a = uniforms.tDiffuse?.value as THREE.Texture | undefined;
            const b = uniforms.curveTex?.value as THREE.Texture | undefined;
            if (a && a.dispose) a.dispose();
            if (b && b.dispose) b.dispose();
          }
          if ((material as any).map && (material as any).map.dispose)
            (material as any).map.dispose();
        } catch (e) {
          // ignore
        }
        material.dispose && material.dispose();
        prevMatRef.current = null;
      }
    };
  }, [material]);

  // --- Final cleanup when component unmounts also ensure container removal --- //
  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      if (curveTexture) {
        try {
          curveTexture?.dispose?.();
        } catch (e) {
          // ignore
        }
      }

      if (mediaTextureState) {
        if (mediaTextureState instanceof THREE.VideoTexture) {
          const vid = (mediaTextureState as any).__videoElement as
            | HTMLVideoElement
            | undefined;
          if (vid) {
            try {
              vid.pause();
              vid.src = '';
              vid.load && vid.load();
            } catch (e) {
              // ignore
            }
          }
        }
        try {
          mediaTextureState.dispose && mediaTextureState.dispose();
        } catch (e) {
          // ignore
        }
      }
      try {
        const geo = mesh?.geometry;
        if (geo && (geo as any).dispose) (geo as any).dispose();
      } catch (e) {
        // ignore
      }

      // remove any leftover container
      try {
        if (videoContainerRef.current && videoContainerRef.current.parentNode) {
          videoContainerRef.current.parentNode.removeChild(
            videoContainerRef.current,
          );
        }
      } catch (e) {
        // ignore
      }

      // cancel pending timeout
      if (pendingClearRef.current) {
        window.clearTimeout(pendingClearRef.current);
        pendingClearRef.current = null;
      }

      // ensure we don't leave the flag set by this instance
      if (didSetApplyingRef.current) {
        // immediate clear on unmount to avoid leaving global state stuck
        scheduleClearApplying(
          true,
          didSetApplyingRef,
          pendingClearRef,
          setIsApplyingFilter,
          applyingStartRef,
        );
      }

      videoContainerRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolvedFit =
    props.fit ?? (props.aspectType === 'vertical' ? 'cover' : 'contain');

  // Calculate plane scale to fit like object-fit BUT use intrinsic media pixel size
  const containerPixelW = Math.max(1, size.width);
  const containerPixelH = Math.max(1, size.height);

  // intrinsic media pixel dimensions (preferred)
  const mediaPixelW =
    props.originalWidth && props.originalHeight
      ? props.originalWidth
      : videoElRef.current &&
          videoElRef.current.videoWidth &&
          videoElRef.current.videoWidth > 0
        ? videoElRef.current.videoWidth
        : mediaTextureState &&
            (mediaTextureState as any).image &&
            (mediaTextureState as any).image.width
          ? (mediaTextureState as any).image.width
          : containerPixelW;

  const mediaPixelH =
    props.originalWidth && props.originalHeight
      ? props.originalHeight
      : videoElRef.current &&
          videoElRef.current.videoHeight &&
          videoElRef.current.videoHeight > 0
        ? videoElRef.current.videoHeight
        : mediaTextureState &&
            (mediaTextureState as any).image &&
            (mediaTextureState as any).image.height
          ? (mediaTextureState as any).image.height
          : containerPixelH;

  const safeMediaPixelW = Math.max(1, mediaPixelW);
  const safeMediaPixelH = Math.max(1, mediaPixelH);

  const worldPerPixel = viewport.width / Math.max(1, size.width);

  const scaleFactor =
    resolvedFit === 'contain'
      ? Math.min(
          containerPixelW / safeMediaPixelW,
          containerPixelH / safeMediaPixelH,
        )
      : Math.max(
          containerPixelW / safeMediaPixelW,
          containerPixelH / safeMediaPixelH,
        );

  const desiredWorldW = safeMediaPixelW * scaleFactor * worldPerPixel;
  const desiredWorldH = safeMediaPixelH * scaleFactor * worldPerPixel;

  const scaleX = desiredWorldW;
  const scaleY = desiredWorldH;

  // click handler is already passed via props.handleTap; mesh onClick uses it
  return (
    <mesh ref={meshRef} scale={[scaleX, scaleY, 1]} onClick={props.handleTap}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export default FilteredMedia;
