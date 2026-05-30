import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {toCanvas} from 'html-to-image';
import {appStore} from '@/store/appStore';
import {getFontStylePreset} from '@/assets/fonts/fontStyles';
import {wrapStoryTextContentToStage} from '@/helpers/textLineWrap';
import {
  inactiveIgPillStyle,
  resolveTextPillLineBackground,
} from '@/helpers/textPillStyle';
import {normalizeContentForInactive} from '@/components/Menus/TextMenus/storyTextPillLines';
import {
  DEFAULT_TEXT_FONT_SIZE_PX,
  resolveTextAlign,
  type TextLayer,
} from '@/store/textSlice';

type Props = {
  index: number;
  mediaId: string;
};

type RenderedLayer = {
  id: string;
  texture: THREE.CanvasTexture;
  widthPx: number;
  heightPx: number;
  transform: TextLayer['transform'];
  zIndex: number;
};

/**
 * Small visual calibration so DOM-snapshot text in R3F matches TextMenu overlay
 * size/radius perception 1:1 across devices.
 */
const TEXT_SNAPSHOT_VISUAL_SCALE = 1.25;
const TEXT_SNAPSHOT_PIXEL_RATIO = 4;
const TEXT_SNAPSHOT_RADIUS_BOOST = 1.0;

const applyStyleObject = (
  element: HTMLElement,
  style: Record<string, unknown>,
): void => {
  Object.entries(style).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    try {
      (element.style as any)[key] = String(value);
    } catch {
      // Ignore invalid style assignments from cross-typed style objects.
    }
  });
};

type SourceLayer = {
  id: string;
  text: string;
  layer: TextLayer;
  textAlign: ReturnType<typeof resolveTextAlign>;
  typography: React.CSSProperties;
  lineBackground: string;
};

export const TextLayersCanvas = ({
  index,
  mediaId,
}: Props): React.JSX.Element => {
  const {viewport, size, gl} = useThree();
  const textSlide = appStore(state => state.textEditorByIndex[index]);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [renderedLayers, setRenderedLayers] = useState<RenderedLayer[]>([]);

  const sourceLayers = useMemo<SourceLayer[]>(() => {
    if (!textSlide || textSlide.id !== mediaId) return [];

    const maxStageWidthPx = Math.max(1, size.width);
    return textSlide.layers
      .map(layer => {
        const fontPreset = getFontStylePreset(layer.fontStyleLabel);
        const typography: React.CSSProperties = {
          fontFamily: fontPreset?.family
            ? `"${fontPreset.family}", var(--font-sans, Poppins, system-ui, sans-serif)`
            : 'var(--font-sans, Poppins, system-ui, sans-serif)',
          fontSize: DEFAULT_TEXT_FONT_SIZE_PX,
          fontWeight: fontPreset?.weight ?? '400',
          fontStyle: fontPreset?.style ?? 'normal',
          textDecorationLine: layer.underline ? 'underline' : 'none',
          WebkitTextStroke:
            layer.backgroundStyle === 'outlined'
              ? `1.2px ${layer.backgroundColor}`
              : undefined,
          WebkitTextFillColor:
            layer.backgroundStyle === 'outlined' ? 'transparent' : undefined,
          color:
            layer.backgroundStyle === 'outlined' ? 'transparent' : layer.color,
          direction: 'ltr',
          unicodeBidi: 'plaintext',
        };
        const wrapped = wrapStoryTextContentToStage(
          layer.content ?? '',
          maxStageWidthPx,
          text => {
            const measureCanvas = document.createElement('canvas');
            const ctx = measureCanvas.getContext('2d');
            if (!ctx) return 0;
            const fontFamily = fontPreset?.family
              ? `"${fontPreset.family}", Poppins, system-ui, sans-serif`
              : 'Poppins, system-ui, sans-serif';
            ctx.font = `${fontPreset?.style ?? 'normal'} ${fontPreset?.weight ?? '400'} ${DEFAULT_TEXT_FONT_SIZE_PX}px ${fontFamily}`;
            return ctx.measureText(text).width;
          },
        );
        const normalized = normalizeContentForInactive(wrapped);
        if (normalized.trim().length === 0) {
          return null;
        }
        return {
          id: layer.id,
          text: normalized,
          layer,
          textAlign: resolveTextAlign(layer),
          typography,
          lineBackground: resolveTextPillLineBackground(layer),
        };
      })
      .filter((layer): layer is SourceLayer => layer !== null)
      .sort((a, b) => (a.layer.zIndex ?? 0) - (b.layer.zIndex ?? 0));
  }, [mediaId, size.width, textSlide]);

  useEffect(() => {
    let cancelled = false;

    const buildTextures = async () => {
      if (sourceLayers.length === 0) {
        setRenderedLayers(prev => {
          prev.forEach(item => item.texture.dispose());
          return [];
        });
        return;
      }

      const nextRendered: RenderedLayer[] = [];
      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '-100000px';
      host.style.top = '0';
      host.style.opacity = '0';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '-1';
      document.body.appendChild(host);

      for (const source of sourceLayers) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('dir', 'ltr');
        applyStyleObject(wrapper, {
          direction: 'ltr',
          display: 'inline-block',
          position: 'relative',
          textAlign: source.textAlign,
          maxWidth: `${Math.max(1, size.width)}px`,
          minWidth: 0,
          padding: '2px',
          boxSizing: 'content-box',
        });

        const span = document.createElement('span');
        span.setAttribute('dir', 'ltr');
        span.setAttribute('lang', 'en');
        span.className =
          'story-text-pill-display pointer-events-none select-none';
        applyStyleObject(
          span,
          (() => {
            const style = inactiveIgPillStyle(
              source.layer,
              source.lineBackground,
              source.typography,
            ) as unknown as Record<string, unknown>;
            const radius = style.borderRadius;
            if (typeof radius === 'string' && radius.endsWith('px')) {
              const parsed = Number.parseFloat(radius);
              if (Number.isFinite(parsed) && parsed > 0) {
                style.borderRadius = `${parsed * TEXT_SNAPSHOT_RADIUS_BOOST}px`;
              }
            }
            return style;
          })(),
        );
        span.textContent = source.text;
        wrapper.appendChild(span);
        host.appendChild(wrapper);
        nodeRefs.current[source.id] = wrapper;

        try {
          const cssRect = wrapper.getBoundingClientRect();
          const layerCanvas = await toCanvas(wrapper, {
            backgroundColor: 'transparent',
            pixelRatio: Math.max(
              TEXT_SNAPSHOT_PIXEL_RATIO,
              window.devicePixelRatio || 1,
            ),
            cacheBust: true,
          });
          const texture = new THREE.CanvasTexture(layerCanvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = false;
          texture.anisotropy = 1;

          nextRendered.push({
            id: source.id,
            texture,
            // Use actual CSS size to keep 1:1 visual scale with TextMenu preview.
            widthPx: Math.max(1, cssRect.width + 4),
            heightPx: Math.max(1, cssRect.height + 4),
            transform: source.layer.transform,
            zIndex: source.layer.zIndex ?? 0,
          });
        } catch {
          // Skip this layer snapshot; keep pipeline resilient.
        }
      }
      host.remove();

      if (cancelled) {
        nextRendered.forEach(item => item.texture.dispose());
        return;
      }

      setRenderedLayers(prev => {
        prev.forEach(item => item.texture.dispose());
        return nextRendered;
      });
    };

    void buildTextures();
    return () => {
      cancelled = true;
    };
  }, [size.width, sourceLayers]);

  useEffect(() => {
    return () => {
      setRenderedLayers(prev => {
        prev.forEach(layer => layer.texture.dispose());
        return [];
      });
    };
  }, []);

  const cssCanvasWidth = Math.max(1, gl.domElement.clientWidth || size.width);
  const cssCanvasHeight = Math.max(
    1,
    gl.domElement.clientHeight || size.height,
  );
  const worldPerPixelX = viewport.width / cssCanvasWidth;
  const worldPerPixelY = viewport.height / cssCanvasHeight;

  return (
    <>
      {renderedLayers.map((layer, order) => {
        const scale = layer.transform.scale ?? 1;
        const worldW =
          layer.widthPx * worldPerPixelX * scale * TEXT_SNAPSHOT_VISUAL_SCALE;
        const worldH =
          layer.heightPx * worldPerPixelY * scale * TEXT_SNAPSHOT_VISUAL_SCALE;
        const x = (layer.transform.x ?? 0) * viewport.width;
        const y = (layer.transform.y ?? 0) * viewport.height;
        const rotation = -((layer.transform.rotation ?? 0) * Math.PI) / 180;

        return (
          <sprite
            key={layer.id}
            position={[x, y, 0.1 + order * 0.0001]}
            scale={[worldW, worldH, 1]}
            rotation={[0, 0, rotation]}>
            <spriteMaterial
              map={layer.texture}
              transparent
              premultipliedAlpha
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </sprite>
        );
      })}
    </>
  );
};
