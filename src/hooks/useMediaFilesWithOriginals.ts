// src/hooks/useMediaFilesWithOriginals.ts
import {useEffect, useState} from 'react';
import type {MediaFile} from '../types/filterTypes';

export type AspectType = 'square' | 'landscape' | 'vertical';

export interface MediaItem extends MediaFile {
  aspectRatio: number;
  aspectType: AspectType;
}

function computeAspectType(w: number, h: number): AspectType {
  const r = w / h;
  if (Math.abs(r - 1) < 0.05) return 'square';
  return r > 1.1 ? 'landscape' : 'vertical';
}

/**
 * Normalizes incoming MediaFile[] (from RN) into MediaItem[].
 * If width/height missing, tries to probe metadata in-browser.
 */
export function useMediaFilesWithOriginals(files: MediaFile[]): MediaItem[] {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);

  useEffect(() => {
    let mounted = true;
    if (!files || files.length === 0) {
      if (mounted) setMediaList([]);
      return () => {
        mounted = false;
      };
    }

    const loaders = files.map(file => {
      return new Promise<MediaItem>(resolve => {
        const {url, isVideo, width, height} = file;

        // If width/height already provided from RN → no need to probe
        if (width && height) {
          resolve({
            ...file,
            width,
            height,
            aspectRatio: width / height,
            aspectType: computeAspectType(width, height),
          });
          return;
        }

        if (isVideo) {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.src = url;
          v.muted = true;
          v.playsInline = true;

          const cleanup = () => {
            v.src = '';
            try {
              v.remove();
            } catch {
              // ignore
            }
          };

          v.onloadedmetadata = () => {
            const w = v.videoWidth || 1;
            const h = v.videoHeight || 1;
            resolve({
              ...file,
              width: w,
              height: h,
              aspectRatio: w / h,
              aspectType: computeAspectType(w, h),
            });
            cleanup();
          };
          v.onerror = () => {
            resolve({
              ...file,
              width: 1,
              height: 1,
              aspectRatio: 1,
              aspectType: 'square',
            });
            cleanup();
          };
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = url;

          img.onload = () => {
            const w = img.naturalWidth || 1;
            const h = img.naturalHeight || 1;
            resolve({
              ...file,
              width: w,
              height: h,
              aspectRatio: w / h,
              aspectType: computeAspectType(w, h),
            });
          };
          img.onerror = () => {
            resolve({
              ...file,
              width: 1,
              height: 1,
              aspectRatio: 1,
              aspectType: 'square',
            });
          };
        }
      });
    });

    Promise.all(loaders).then(list => {
      if (mounted) setMediaList(list);
    });

    return () => {
      mounted = false;
    };
  }, [files]);

  return mediaList;
}
