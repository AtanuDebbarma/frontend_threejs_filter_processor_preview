// src/hooks/useMediaFilesWithOriginals.ts
import {useEffect, useRef, useState} from 'react';

export type AspectType = 'square' | 'landscape' | 'vertical';

export interface MediaItem {
  url: string; // blob URL created from the File
  isVideo: boolean;
  width: number; // original intrinsic width
  height: number; // original intrinsic height
  aspectRatio: number; // width / height
  aspectType: AspectType;
  file?: File;
}

function computeAspectType(w: number, h: number): AspectType {
  const r = w / h;
  if (Math.abs(r - 1) < 0.05) return 'square';
  return r > 1.1 ? 'landscape' : 'vertical';
}

/**
 * Returns an array of MediaItem for the files. Waits for image/video metadata.
 */
export function useMediaFilesWithOriginals(files: File[]): MediaItem[] {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const createdUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let mounted = true;
    // cleanup previously created URLs
    createdUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    createdUrlsRef.current = [];

    if (!files || files.length === 0) {
      if (mounted) setMediaList([]);
      return () => {
        mounted = false;
      };
    }

    const loaders = files.map(file => {
      return new Promise<MediaItem>(resolve => {
        const url = URL.createObjectURL(file);
        createdUrlsRef.current.push(url);
        const isVideo = file.type.startsWith('video/');

        if (isVideo) {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.muted = true;
          v.playsInline = true;
          v.src = url;

          const cleanup = () => {
            v.src = '';
            v.removeAttribute('src');
            try {
              v.load && v.load();
            } catch (e) {
              //ignore
            }
            v.remove();
          };

          const onMeta = () => {
            const w = v.videoWidth || 1;
            const h = v.videoHeight || 1;
            const item: MediaItem = {
              url,
              isVideo: true,
              width: w,
              height: h,
              aspectRatio: w / h,
              aspectType: computeAspectType(w, h),
              file,
            };
            cleanup();
            resolve(item);
          };

          const onErr = () => {
            // fallback defaults
            resolve({
              url,
              isVideo: true,
              width: 1,
              height: 1,
              aspectRatio: 1,
              aspectType: 'square',
              file,
            });
            cleanup();
          };

          v.addEventListener('loadedmetadata', onMeta, {once: true});
          v.addEventListener('error', onErr, {once: true});
        } else {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = url;
          const cleanupImg = () => {
            img.onload = null;
            img.onerror = null;
            try {
              img.remove();
            } catch (e) {
              //ignore
            }
          };
          img.onload = () => {
            // naturalWidth/naturalHeight reflect intrinsic pixels (but see EXIF note below)
            const w = img.naturalWidth || 1;
            const h = img.naturalHeight || 1;
            const item: MediaItem = {
              url,
              isVideo: false,
              width: w,
              height: h,
              aspectRatio: w / h,
              aspectType: computeAspectType(w, h),
              file,
            };
            cleanupImg();
            resolve(item);
          };
          img.onerror = () => {
            cleanupImg();
            resolve({
              url,
              isVideo: false,
              width: 1,
              height: 1,
              aspectRatio: 1,
              aspectType: 'square',
              file,
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
      // revoke created URLs
      createdUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      createdUrlsRef.current = [];
    };
  }, [files]);

  return mediaList;
}
