// src\features\post\components\canvas\FilteredMedia.tsx
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {appStore} from '@/store/appStore';
import type {ColorBalance, Curve, FilterItem} from '@/shared/types/filterTypes';
import {scheduleClearApplying} from '@/shared/utils/filter_utils';
import {vertexShader, fragmentShader} from '@/assets/shaders';
import {rnLogger} from '@/shared/utils/rnLogger';
import {trimBase64} from '@/features/post/helpers/canvas/other_helpers';
import {setExportVideo} from '@/features/post/helpers/canvas/exportVideoRegistry';
import {setExportFrameDriver} from '@/features/post/helpers/canvas/exportFrameDriver';
import {
  clearExportFrameFeed,
  signalExportPipelineReady,
} from '@/features/post/helpers/canvas/exportVideoFrameFeed';
import {defaultEditor} from '@/store/editorSlice';
import {defaultAdjustTransform} from '@/store/adjustSlice';

type Props = {
  id: string;
  uri: string;
  isVideo: boolean;
  fit?: 'contain' | 'cover';
  aspectType?: 'square' | 'landscape' | 'vertical';
  originalWidth?: number;
  originalHeight?: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  handleTap?: () => void;
  muted?: boolean;
  index: number;
};

const FilteredMediaInner = (props: Props): React.JSX.Element => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const videoContainerRef = useRef<HTMLElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const [videoIntrinsicSize, setVideoIntrinsicSize] = useState({
    width: 0,
    height: 0,
  });
  const slideIndex = props.index;
  const activeIndex = appStore(state => state.activeIndex);
  const isActiveSlide = slideIndex === activeIndex;

  const applyingStartRef = useRef<number | null>(null);
  const pendingClearRef = useRef<number | null>(null);
  const didSetApplyingRef = useRef<boolean>(false);
  const colorBalanceVecRef = useRef(new THREE.Vector3());
  //  queue for textures that should be disposed only after render commit
  const toDisposeRef = useRef<THREE.Texture[]>([]);
  const exportVftRef = useRef<THREE.VideoFrameTexture | null>(null);

  const activeFilter = appStore(state => state.activeFilter);
  const setIsApplyingFilter = appStore(state => state.setIsApplyingFilter);

  const currentSelectedEditor = appStore(
    state => state.editorByIndex[slideIndex]?.value ?? defaultEditor,
  );
  const fileIdAtIndex = appStore(state => state.mediaFiles[slideIndex]?.id);
  const currentSelectedID = fileIdAtIndex === props.id ? props.id : '';

  const brightness = currentSelectedEditor.brightness ?? 0.0;
  const contrast = currentSelectedEditor.contrast ?? 1.0;
  const saturation = currentSelectedEditor.saturation ?? 1.0;
  const gamma = currentSelectedEditor.gamma ?? 1.0;
  const hue = currentSelectedEditor.hue ?? 0.0;
  const colorBalance: ColorBalance = currentSelectedEditor.colorBalance ?? {
    r: 0.0,
    g: 0.0,
    b: 0.0,
  };
  const sharpness = currentSelectedEditor.sharpness ?? 0.0;
  const shadows = currentSelectedEditor.shadows ?? 0.0;
  const highlights = currentSelectedEditor.highlights ?? 0.0;
  const temperature = currentSelectedEditor.temperature ?? 0.0;
  const blur = currentSelectedEditor.blur ?? 0.0;
  const adjustEntry = appStore(state => state.adjustByIndex[slideIndex]);
  const isSaveExporting = appStore(state => state.isSaveExporting);
  const isPostExporting = appStore(state => state.isPostExporting);
  const isVideoPipelineExporting = isSaveExporting || isPostExporting;
  const adjustTransform =
    adjustEntry?.id === props.id ? adjustEntry.value : defaultAdjustTransform;

  const beginApplyingIfActive = async (): Promise<void> => {
    if (appStore.getState().activeIndex !== slideIndex) {
      return;
    }
    try {
      await setIsApplyingFilter(true);
      didSetApplyingRef.current = true;
      applyingStartRef.current = Date.now();
      if (pendingClearRef.current) {
        window.clearTimeout(pendingClearRef.current);
        pendingClearRef.current = null;
      }
    } catch (e) {
      rnLogger.componentLog(
        'FilteredMedia',
        'error',
        `Failed to set applying flag: ${e}`,
      );
    }
  };

  const isRNLocalUrl = (url: string) =>
    url.startsWith('file:') ||
    url.startsWith('content:') ||
    url.startsWith('ph:');

  // R3F hooks
  const {viewport, size, gl, scene, camera} = useThree();

  // set DPR
  useEffect(() => {
    if (!gl) return;
    const storeDpr = appStore.getState().dpr || window.devicePixelRatio || 1;
    gl.setPixelRatio(storeDpr);
    rnLogger.componentLog(
      'FilteredMedia',
      'log',
      `DPR check → Web: ${window.devicePixelRatio}, RN: ${appStore.getState().dpr}, GL: ${gl.getPixelRatio()}`,
    );
  }, [gl]);

  // Phase B: Save export uses VideoFrameTexture + synchronous gl.render (not preview <video> seek).
  useEffect(() => {
    if (!props.isVideo) {
      return;
    }
    if (!isVideoPipelineExporting) {
      setExportFrameDriver(props.index, null);
      if (exportVftRef.current) {
        exportVftRef.current.dispose();
        exportVftRef.current = null;
      }
      clearExportFrameFeed(props.index);
      return;
    }

    const vft = new THREE.VideoFrameTexture();
    vft.minFilter = THREE.LinearFilter;
    vft.magFilter = THREE.LinearFilter;
    vft.generateMipmaps = false;
    exportVftRef.current = vft;
    // Keep preview on VideoTexture (paused last frame); export paints via exportVftRef only.

    return () => {
      setExportFrameDriver(props.index, null);
      clearExportFrameFeed(props.index);
      if (exportVftRef.current) {
        exportVftRef.current.dispose();
        exportVftRef.current = null;
      }
    };
  }, [isVideoPipelineExporting, props.isVideo, props.index]);

  useEffect(() => {
    if (!gl) return;
    try {
      const glctx = gl.getContext ? gl.getContext() : gl;

      // ✅ covers both WebGL1 and WebGL2
      if (
        typeof glctx === 'object' &&
        (glctx instanceof WebGLRenderingContext ||
          glctx instanceof WebGL2RenderingContext)
      ) {
        glctx.pixelStorei(glctx.UNPACK_COLORSPACE_CONVERSION_WEBGL, glctx.NONE);
        glctx.pixelStorei(glctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      }

      rnLogger.componentLog(
        'FilteredMedia',
        'log',
        'Disabled automatic colorspace conversion and premultiplied alpha on WebGL context.',
      );
    } catch (err) {
      rnLogger.componentLog(
        'FilteredMedia',
        'warn',
        `Failed to set pixelStorei flags: ${err}`,
      );
    }
  }, [gl]);

  useEffect(() => {
    const trimmedUri = trimBase64({singleFile: props.uri});
    rnLogger.componentLog(
      'FilteredMedia',
      'log',
      `FILTERED MEDIA URI: ${trimmedUri}`,
    );
  }, [props.uri]);

  // media texture state: start with placeholder -> real texture when ready
  const [mediaTextureState, setMediaTextureState] =
    useState<THREE.Texture | null>(null);
  const [curveTexture, setCurveTexture] = useState<THREE.Texture | null>(null);
  const [curvePresent, setCurvePresent] = useState(false);

  // 🚨 NEW: flush old textures once React has committed new state
  useEffect(() => {
    if (toDisposeRef.current.length > 0) {
      for (const t of toDisposeRef.current) {
        try {
          t.dispose();
        } catch (e) {
          rnLogger.componentLog(
            'FilteredMedia',
            'warn',
            `Failed to dispose queued texture: ${e}`,
          );
        }
      }
      toDisposeRef.current = [];
    }
  }, [mediaTextureState, curveTexture]); // ✅ flush on either change

  // --- create / update media texture based on props.url and props.isVideo --- //
  useEffect(() => {
    // cleanup previous
    return () => {
      if (mediaTextureState) {
        try {
          mediaTextureState.dispose && mediaTextureState.dispose();
        } catch (e) {
          rnLogger.componentLog(
            'FilteredMedia',
            'warn',
            `Failed to dispose texture: ${e}`,
          );
        }
        setMediaTextureState(null);
      }
      if (videoElRef.current) {
        try {
          videoElRef.current.pause();
          videoElRef.current.src = '';
          videoElRef.current.load && videoElRef.current.load();
        } catch (e) {
          rnLogger.componentLog(
            'FilteredMedia',
            'warn',
            `Failed to clean up video element: ${e}`,
          );
        }
        videoElRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.uri, props.isVideo]);

  useEffect(() => {
    if (!props.uri) return;
    // image path: create texture immediately
    if (!props.isVideo) {
      // start "applying / loading" flag
      void beginApplyingIfActive();
      const loader = new THREE.TextureLoader();
      const tex = loader.load(
        props.uri,
        // onLoad
        loadedTex => {
          try {
            loadedTex.generateMipmaps = true;
            loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
            loadedTex.magFilter = THREE.LinearFilter;
            loadedTex.needsUpdate = true;
            setMediaTextureState(prev => {
              if (prev) toDisposeRef.current.push(prev); // 🚨 SAFE DISPOSAL
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
          rnLogger.componentLog(
            'FilteredMedia',
            'error',
            `Texture load error: ${err}`,
          );
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
        if (prev) toDisposeRef.current.push(prev); // 🚨 SAFE DISPOSAL
        return tex;
      });

      return;
    }

    // ---- video path ----
    // create video element, placeholder texture first to avoid "no image data" warning
    const videoEl = document.createElement('video');
    videoEl.src = props.uri;
    if (!isRNLocalUrl(props.uri) || !props.uri.startsWith('data:')) {
      videoEl.crossOrigin = 'anonymous';
    }
    videoEl.loop = true;
    videoEl.muted = props.muted ?? false;
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
    setExportVideo(props.index, videoEl);

    // placeholder 1x1 RGBA texture
    const placeholder = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 255]),
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
      if (prev) toDisposeRef.current.push(prev);
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
      try {
        document.body.appendChild(container);
      } catch (e2) {
        rnLogger.componentLog(
          'FilteredMedia',
          'warn',
          `Failed to append video container to body: ${e2}`,
        );
      }
      rnLogger.componentLog(
        'FilteredMedia',
        'warn',
        `Failed to append video container to parent: ${e}`,
      );
    }
    videoContainerRef.current = container;

    // NEW: Track if video is ready to play
    const videoReadyRef = {current: false};

    const onCanPlay = () => {
      videoReadyRef.current = true;
    };

    // metadata handler: create VideoTexture once we have dimensions
    const onMetadata = async () => {
      await beginApplyingIfActive();

      if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        setVideoIntrinsicSize({
          width: videoEl.videoWidth,
          height: videoEl.videoHeight,
        });
      }

      try {
        const vt = new THREE.VideoTexture(videoEl);
        vt.minFilter = THREE.LinearFilter;
        vt.magFilter = THREE.LinearFilter;
        vt.generateMipmaps = false;
        vt.needsUpdate = true;
        (vt as any).__videoElement = videoEl;
        (vt as any).__videoReady = videoReadyRef;

        setMediaTextureState(prev => {
          if (prev) toDisposeRef.current.push(prev);
          return vt;
        });

        if (props.videoRef) props.videoRef.current = videoEl;
      } catch (e) {
        rnLogger.componentLog(
          'FilteredMedia',
          'error',
          `VideoTexture setup failed: ${e}`,
        );
      } finally {
        if (didSetApplyingRef.current) {
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

    const onError = (ev: unknown) => {
      rnLogger.componentLog(
        'FilteredMedia',
        'warn',
        `Video element load error: ${ev}`,
      );
      scheduleClearApplying(
        true,
        didSetApplyingRef,
        pendingClearRef,
        setIsApplyingFilter,
        applyingStartRef,
      );
    };

    const setVideoPlaybackTime = appStore.getState().setVideoPlaybackTime;
    const syncPlaybackTime = () => {
      if (!Number.isFinite(videoEl.currentTime) || videoEl.currentTime < 0) {
        return;
      }
      setVideoPlaybackTime(props.index, props.id, videoEl.currentTime);
    };

    let lastTimeUpdateMs = 0;
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastTimeUpdateMs < 250) return;
      lastTimeUpdateMs = now;
      syncPlaybackTime();
    };

    videoEl.addEventListener('loadedmetadata', onMetadata);
    videoEl.addEventListener('canplay', onCanPlay);
    videoEl.addEventListener('error', onError);
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('pause', syncPlaybackTime);
    videoEl.addEventListener('seeked', syncPlaybackTime);

    if (props.handleTap) videoEl.addEventListener('click', props.handleTap);

    return () => {
      videoEl.removeEventListener('loadedmetadata', onMetadata);
      videoEl.removeEventListener('canplay', onCanPlay);
      videoEl.removeEventListener('error', onError);
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('pause', syncPlaybackTime);
      videoEl.removeEventListener('seeked', syncPlaybackTime);
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
        rnLogger.componentLog(
          'FilteredMedia',
          'error',
          `Failed to reset video element: ${e}`,
        );
      }
      videoContainerRef.current = null;

      try {
        videoEl.pause();
        videoEl.src = '';
        videoEl.load && videoEl.load();
      } catch (e) {
        rnLogger.componentLog('FilteredMedia', 'error', `${e}`);
      }
      videoElRef.current = null;
      setExportVideo(props.index, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.uri, props.isVideo, gl]);

  useFrame(() => {
    if (isVideoPipelineExporting && props.isVideo) {
      return;
    }
    if (!isActiveSlide) {
      return;
    }

    if (mediaTextureState instanceof THREE.VideoTexture) {
      const videoElem = (mediaTextureState as any).__videoElement as
        | HTMLVideoElement
        | undefined;
      const videoReady = (mediaTextureState as any).__videoReady as
        | {current: boolean}
        | undefined;

      if (!videoElem || !videoReady?.current) {
        return;
      }

      const playing = !videoElem.paused && !videoElem.ended;

      if (playing) {
        mediaTextureState.needsUpdate = true;
      }
    }
  });

  // ---------- curve texture creation ----------
  const createCurveTexture = useCallback((curves?: Curve[] | undefined) => {
    const size = 512;
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

  useEffect(() => {
    return () => {
      if (curveTexture) {
        toDisposeRef.current.push(curveTexture); // 🚨 queue instead of dispose inline
        setCurveTexture(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  useEffect(() => {
    if (!activeFilter || !activeFilter.params || !activeFilter.params.curves) {
      setCurvePresent(false);
      if (curveTexture) {
        toDisposeRef.current.push(curveTexture); // Queue for safe disposal
        setCurveTexture(null);
      }
      return;
    }
    const tex = createCurveTexture(activeFilter.params.curves);
    setCurveTexture(prev => {
      if (prev) toDisposeRef.current.push(prev); // Safe disposal
      return tex;
    });
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
      return fallback;
    }

    const p = activeFilter.params;
    const {csVal, rangeVal} = resolveColorSpaceAndRange(activeFilter);

    const merged = {
      brightness: p.brightness ?? 0.0,
      contrast: p.contrast ?? 1.0,
      saturation: p.saturation ?? 1.0,
      gamma: p.gamma ?? 1.0,
      hue: p.hue ?? 0.0,
      colorBalance: p.colorBalance ?? {r: 0, g: 0, b: 0},
      unsharpAmount: p.unsharp?.amount ?? 0.0,
      shadows: p.shadows ?? 0.0,
      highlights: p.highlights ?? 0.0,
      temperature: p.temperature ?? 0.0,
      blur: p.blur ?? 0.0,
    };

    const colorBalanceVec = new THREE.Vector3(
      merged.colorBalance.r ?? 0,
      merged.colorBalance.g ?? 0,
      merged.colorBalance.b ?? 0,
    );

    const uniforms: any = {
      tDiffuse: {value: mediaTextureState},
      brightness: {value: merged.brightness},
      contrast: {value: merged.contrast},
      saturation: {value: merged.saturation},
      gammaVal: {value: merged.gamma},
      colorBalance: {value: colorBalanceVec},
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
      u_texel: {
        value: new THREE.Vector2(
          1 / Math.max(1, size.width),
          1 / Math.max(1, size.height),
        ),
      },
    };

    const shaderMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    shaderMat.side = THREE.DoubleSide;
    shaderMat.name = 'ParamsShaderMaterial';
    return shaderMat;
    // size.width/height: u_texel updated in useEffect below (avoid material rebuild on resize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mediaTextureState,
    activeFilter,
    curveTexture,
    curvePresent,
    resolveColorSpaceAndRange,
  ]);

  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  // keep material texture uniform updated when mediaTextureState changes
  useEffect(() => {
    const mat: any = materialRef.current;
    if (!mat) return;
    const textureImage = mediaTextureState?.image as
      | {width?: number; height?: number}
      | undefined;
    const w =
      props.originalWidth ??
      videoElRef.current?.videoWidth ??
      textureImage?.width ??
      size.width;
    const h =
      props.originalHeight ??
      videoElRef.current?.videoHeight ??
      textureImage?.height ??
      size.height;

    if (mat.uniforms.u_texel) {
      mat.uniforms.u_texel.value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
      mat.needsUpdate = true;
    }
    if (mat.uniforms && mat.uniforms.tDiffuse) {
      mat.uniforms.tDiffuse.value = mediaTextureState;
      mat.needsUpdate = true;
    } else if ((mat as THREE.MeshBasicMaterial).map !== undefined) {
      (mat as THREE.MeshBasicMaterial).map = mediaTextureState ?? null;
      mat.needsUpdate = true;
    }
  }, [mediaTextureState, props.originalWidth, props.originalHeight, size]);

  // Save export: synchronous gl.render per decoded frame (no useFrame / rAF).
  useEffect(() => {
    if (!props.isVideo || !isVideoPipelineExporting || !exportVftRef.current) {
      setExportFrameDriver(props.index, null);
      return;
    }

    const vft = exportVftRef.current;

    setExportFrameDriver(props.index, {
      paintAndRender(frame: VideoFrame) {
        vft.setFrame(frame);
        vft.needsUpdate = true;

        const mat = materialRef.current as THREE.ShaderMaterial | null;
        if (mat?.uniforms?.tDiffuse) {
          mat.uniforms.tDiffuse.value = vft;
        }
        if (mat?.uniforms?.u_texel) {
          const frameW = Math.max(1, frame.displayWidth);
          const frameH = Math.max(1, frame.displayHeight);
          mat.uniforms.u_texel.value.set(1 / frameW, 1 / frameH);
        }

        gl.setRenderTarget(null);
        gl.render(scene, camera);

        // Upload happens during render — close only after GPU has copied the frame.
        try {
          frame.close();
        } catch {
          /* ignore */
        }
      },
    });
    signalExportPipelineReady(props.index);

    return () => {
      setExportFrameDriver(props.index, null);
    };
  }, [isVideoPipelineExporting, props.isVideo, props.index, gl, scene, camera]);

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
    colorBalanceVecRef.current.set(
      merged.colorBalance.r ?? 0,
      merged.colorBalance.g ?? 0,
      merged.colorBalance.b ?? 0,
    );
    mat.uniforms.colorBalance.value = colorBalanceVecRef.current;
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
        rnLogger.componentLog(
          'FilteredMedia',
          'warn',
          `Failed to dispose previous material uniforms: ${e}`,
        );
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
          rnLogger.componentLog(
            'FilteredMedia',
            'warn',
            `Failed to dispose material uniforms: ${e}`,
          );
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
        toDisposeRef.current.push(curveTexture);
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
            } catch {
              // ignore
            }
          }
        }
        toDisposeRef.current.push(mediaTextureState); // ✅ safe disposal
      }

      try {
        const geo = mesh?.geometry;
        if (geo && (geo as any).dispose) (geo as any).dispose();
      } catch (e) {
        rnLogger.componentLog(
          'FilteredMedia',
          'warn',
          `Failed to dispose geometry, ${e}`,
        );
      }

      // remove any leftover container
      try {
        if (videoContainerRef.current && videoContainerRef.current.parentNode) {
          videoContainerRef.current.parentNode.removeChild(
            videoContainerRef.current,
          );
        }
      } catch (e) {
        rnLogger.componentLog(
          'FilteredMedia',
          'warn',
          `Failed to remove video container: ${e}`,
        );
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
      : videoIntrinsicSize.width > 0
        ? videoIntrinsicSize.width
        : mediaTextureState &&
            (mediaTextureState as any).image &&
            (mediaTextureState as any).image.width
          ? (mediaTextureState as any).image.width
          : containerPixelW;

  const mediaPixelH =
    props.originalWidth && props.originalHeight
      ? props.originalHeight
      : videoIntrinsicSize.height > 0
        ? videoIntrinsicSize.height
        : mediaTextureState &&
            (mediaTextureState as any).image &&
            (mediaTextureState as any).image.height
          ? (mediaTextureState as any).image.height
          : containerPixelH;

  const safeMediaPixelW = Math.max(1, mediaPixelW);
  const safeMediaPixelH = Math.max(1, mediaPixelH);

  const worldPerPixel = viewport.width / Math.max(1, size.width);
  const worldW = (props.originalWidth ?? safeMediaPixelW) * worldPerPixel;
  const worldH = (props.originalHeight ?? safeMediaPixelH) * worldPerPixel;

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

  const worldWScaled = worldW * scaleFactor;
  const worldHScaled = worldH * scaleFactor;

  // Apply adjustTransform.x/y normalized offsets relative to that
  const posX = (adjustTransform?.x ?? 0) * worldWScaled;
  const posY = -(adjustTransform?.y ?? 0) * worldHScaled;

  if (!currentSelectedID) {
    return <></>;
  }

  // click handler is already passed via props.handleTap; mesh onClick uses it
  return (
    <mesh
      ref={meshRef}
      position={[posX, posY, 0]}
      scale={[
        worldWScaled * (adjustTransform?.scale ?? 1),
        worldHScaled * (adjustTransform?.scale ?? 1),
        1,
      ]}
      rotation={[0, 0, -(adjustTransform?.rotation ?? 0) * (Math.PI / 180)]}
      onClick={props.handleTap}>
      <planeGeometry args={[1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

export const FilteredMedia = React.memo(FilteredMediaInner);

/*
 * @displayName FilteredMedia
 */
FilteredMedia.displayName = 'FilteredMedia';
