// src/hooks/useVerifiedMediaFiles.ts
import {useEffect, useMemo, useRef, useState} from 'react';
import {rnLogger} from '@/shared/utils/rnLogger';
import {trimBase64} from '@/features/post/helpers/canvas/other_helpers';

export type AspectType = 'square' | 'landscape' | 'vertical';

export type MediaFile = {
  id: string;
  filename: string;
  uri: string; // can be RN blob: or remote
  mediaType: 'photo' | 'video';
  width: number;
  height: number;
  creationTime?: number;
  modificationTime?: number;
  duration?: number;
  albumId?: string;
};

export interface MediaItem extends MediaFile {
  aspectRatio: number;
  aspectType: AspectType;
}

export function computeAspectType(w: number, h: number): AspectType {
  const r = w / h;
  if (Math.abs(r - 1) < 0.05) return 'square';
  return r > 1.1 ? 'landscape' : 'vertical';
}

const isBlobUrl = (url: string) =>
  url.startsWith('blob:') || url.startsWith('data:');

const isRNLocalUrl = (url: string) =>
  url.startsWith('file:') ||
  url.startsWith('content:') ||
  url.startsWith('ph:');

/** Vite dev/build asset paths (e.g. `/src/assets/foo.mp4` from `import url`) */
const isBundledAssetUrl = (url: string) =>
  url.startsWith('/') && !url.startsWith('//');

export function useVerifiedMediaFiles(files: MediaFile[]): MediaItem[] {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const createdUrlsRef = useRef<string[]>([]);

  const filesKey = useMemo(
    () => files.map(f => `${f.id}|${f.uri}`).join(','),
    [files],
  );

  useEffect(() => {
    let mounted = true;
    // cleanup old blob urls
    createdUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    createdUrlsRef.current = [];

    if (!files || files.length === 0) {
      if (mounted) setMediaList([]);
      return () => {
        mounted = false;
      };
    }

    const loadFile = async (file: MediaFile): Promise<MediaItem> => {
      let uri = file.uri;

      // ✅ If RN-local → trust RN metadata, skip probing
      if (isRNLocalUrl(uri)) {
        return {
          ...file,
          uri,
          width: file.width || 1,
          height: file.height || 1,
          aspectRatio: (file.width || 1) / (file.height || 1),
          aspectType: computeAspectType(file.width || 1, file.height || 1),
        };
      }

      // 🌐 Remote http(s) → fetch and wrap in blob URL (hydration uses data: from RN)
      if (!isBlobUrl(uri) && !isBundledAssetUrl(uri) && !isRNLocalUrl(uri)) {
        try {
          const res = await fetch(uri);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
          }
          const blob = await res.blob();
          uri = URL.createObjectURL(blob);
          createdUrlsRef.current.push(uri);
        } catch (err) {
          const trimmedUri = trimBase64({singleFile: uri});
          rnLogger.componentLog(
            'useVerifiedMediaFiles',
            'warn',
            `Failed to fetch media URI: ${trimmedUri}`,
            err,
          );
        }
      }

      // For video (remote/blob)
      if (file.mediaType === 'video') {
        return new Promise(resolve => {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.muted = true;
          v.playsInline = true;
          if (!uri.startsWith('data:') && !isRNLocalUrl(uri)) {
            v.crossOrigin = 'anonymous';
          }
          v.src = uri;

          const cleanup = () => {
            v.src = '';
            try {
              v.load();
            } catch {
              /* ignore */
            }
            v.remove();
          };

          v.addEventListener(
            'loadedmetadata',
            () => {
              const w = v.videoWidth || file.width || 1;
              const h = v.videoHeight || file.height || 1;
              resolve({
                ...file,
                uri,
                width: w,
                height: h,
                aspectRatio: w / h,
                aspectType: computeAspectType(w, h),
              });
              cleanup();
            },
            {once: true},
          );

          v.addEventListener(
            'error',
            () => {
              const trimmedUri = trimBase64({singleFile: uri});
              rnLogger.componentLog(
                'useVerifiedMediaFiles',
                'warn',
                `Failed to load video metadata: ${trimmedUri}`,
              );
              resolve({
                ...file,
                uri,
                width: file.width || 1,
                height: file.height || 1,
                aspectRatio: 1,
                aspectType: 'square',
              });
              cleanup();
            },
            {once: true},
          );
        });
      }

      // For photo (remote/blob)
      return new Promise(resolve => {
        const img = new Image();
        if (!uri.startsWith('data:') && !isRNLocalUrl(uri)) {
          img.crossOrigin = 'anonymous';
        }

        img.src = uri;

        const cleanup = () => {
          img.onload = null;
          img.onerror = null;
          try {
            img.remove();
          } catch {
            /* ignore */
          }
        };

        img.onload = () => {
          const w = img.naturalWidth || file.width || 1;
          const h = img.naturalHeight || file.height || 1;
          resolve({
            ...file,
            uri,
            width: w,
            height: h,
            aspectRatio: w / h,
            aspectType: computeAspectType(w, h),
          });
          cleanup();
        };

        img.onerror = () => {
          const trimmedUri = trimBase64({singleFile: file.uri});
          rnLogger.componentLog(
            'useVerifiedMediaFiles',
            'warn',
            `Failed to load image metadata: ${trimmedUri}`,
          );
          resolve({
            ...file,
            uri,
            width: file.width || 1,
            height: file.height || 1,
            aspectRatio: 1,
            aspectType: 'square',
          });
          cleanup();
        };
      });
    };

    void Promise.all(files.map(loadFile)).then(list => {
      if (mounted) setMediaList(list);
    });

    return () => {
      mounted = false;
      createdUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      createdUrlsRef.current = [];
    };
  }, [filesKey, files]);

  return mediaList;
}
