import React, {useEffect, useRef} from 'react';

import {appStore} from './store/appStore';
import {
  defaultFilter,
  type ColorBalance,
  type FilterItem,
  type MediaFile,
} from './types/filterTypes';
import {MediaComponent} from './components/Filters_And_MediaOutput/MediaComponent';
// import VideoSRC from './assets/test.mp4';
// import VideoSRC2 from './assets/ufc.mp4';
// import SRC2 from './assets/test.jpg';
import {
  rnLogger,
  setupConsoleInterception,
  setupGlobalErrorHandling,
} from './utils/rnLogger';
import {hashObject} from './helpers/hashObjects';

type HydrationPayload = {
  file: MediaFile[];
  post: boolean;
  activeFilter: FilterItem | null;
};
type PatchPayload = {
  activeFilter: FilterItem | null;
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  hue: number;
  colorBalance: ColorBalance;
  sharpness: number;
  shadows: number;
  highlights: number;
  temperature: number;
  blur: number;
};

const App = (): React.JSX.Element => {
  const activeFilter = appStore(state => state.activeFilter);
  // const mediaFiles = appStore(state => state.mediaFiles);
  const setMediaFiles = appStore(state => state.setMediaFiles);
  const setActiveFilter = appStore(state => state.setActiveFilter);
  const resetEditorState = appStore(state => state.resetEditorState);
  const [post, setPost] = React.useState(true);
  const lastHydrationHash = useRef<string | null>(null);

  // ✅ Setup logging and global error handling
  useEffect(() => {
    rnLogger.info('🚀 Media Filter App initializing...');

    const restoreConsole = setupConsoleInterception();
    setupGlobalErrorHandling();

    return () => {
      rnLogger.info('📱 Media Filter App cleaning up...');
      restoreConsole();
    };
  }, []);

  // ✅ Mock: simulate RN sending files in browser
  // useEffect(() => {
  //   const mockMedia: MediaFile[] = [
  //     {
  //       id: '1',
  //       uri: VideoSRC, // or import VideoSRC from './assets/test.mp4'
  //       filename: 'sample',
  //       mediaType: 'video',
  //       width: 1080,
  //       height: 1920,
  //     },
  //     {
  //       id: '2',
  //       uri: SRC2,
  //       filename: 'sample2',
  //       mediaType: 'photo',
  //       width: 1080,
  //       height: 1080,
  //     },
  //     {
  //       id: '3',
  //       uri: VideoSRC2,
  //       filename: 'sample2',
  //       mediaType: 'video',
  //       width: 1080,
  //       height: 1080,
  //     },
  //   ];

  //   (window as any).__EXPO_MEDIA__ = {
  //     file: mockMedia,
  //     post: true,
  //     activeFilter: defaultFilter,
  //   };

  //   // simulate RN dispatch
  //   window.dispatchEvent(new Event('mediaReady'));
  // }, []);

  useEffect(() => {
    const listener = () => {
      const data: HydrationPayload = (window as any).__EXPO_MEDIA__;
      if (!data) return;

      const hash = hashObject(data);
      lastHydrationHash.current = hash; // store injected payload hash

      rnLogger.log('📥 Injected HYDRATE from RN:', data);

      setMediaFiles(data.file ?? []);
      setPost(data.post);
      const filter = data.activeFilter ?? defaultFilter;
      setActiveFilter(filter);
    };

    window.addEventListener('mediaReady', listener);
    listener(); // run once immediately

    return () => {
      window.removeEventListener('mediaReady', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'HYDRATE') {
          const data: HydrationPayload = msg.payload;
          const newHash = hashObject(data);

          // 🚫 Skip if identical to last applied
          if (lastHydrationHash.current === newHash) {
            rnLogger.log('⏸ Ignoring redundant HYDRATE (same as injected)');
            return;
          }

          rnLogger.log('📥 Applying HYDRATE from RN:', data);
          lastHydrationHash.current = newHash;

          setMediaFiles(data.file ?? []);
          setPost(data.post);
          const filter = data.activeFilter ?? defaultFilter;
          setActiveFilter(filter);
        }

        if (msg.type === 'PATCH_STATE') {
          rnLogger.log('🎨 PATCH_STATE update:', msg.payload);
          const data: PatchPayload = msg.payload;
          const filter = data.activeFilter ?? defaultFilter;
          setActiveFilter(filter);
          const p = defaultFilter.params;
          resetEditorState({
            brightness: data.brightness ?? p.brightness ?? 0.0,
            contrast: data.contrast ?? p.contrast ?? 1.0,
            saturation: data.saturation ?? p.saturation ?? 1.0,
            gamma: data.gamma ?? p.gamma ?? 1.0,
            hue: data.hue ?? p.hue ?? 0.0,
            colorBalance: data.colorBalance ??
              p.colorBalance ?? {r: 0, g: 0, b: 0},
            sharpness: data.sharpness ?? p.unsharp?.amount ?? 0.0,
            shadows: data.shadows ?? p.shadows ?? 0.0,
            highlights: data.highlights ?? p.highlights ?? 0.0,
            temperature: data.temperature ?? p.temperature ?? 0.0,
            blur: data.blur ?? p.blur ?? 0.0,
          });
        }
      } catch (err) {
        rnLogger.error('⚠️ Bad message from RN:', event.data, err);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rnLogger.log('🎨 Active filter changed:', activeFilter);
  }, [activeFilter]);

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-black text-white">
      <div className="mx-auto flex h-full max-w-full flex-1 flex-col bg-gray-900">
        <MediaComponent post={post} />
      </div>
    </main>
  );
};

export default App;
