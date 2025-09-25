import React, {useEffect} from 'react';

import {appStore} from './store/appStore';
import {
  defaultFilter,
  type ColorBalance,
  type FilterItem,
  type MediaFile,
} from './types/filterTypes';
import {MediaComponent} from './components/Filters_And_MediaOutput/MediaComponent';
import VideoSRC from './assets/test.mp4';
import VideoSRC2 from './assets/ufc.mp4';
import {
  rnLogger,
  setupConsoleInterception,
  setupGlobalErrorHandling,
} from './utils/rnLogger';

type IncomingPayload = {
  file: MediaFile[];
  post: boolean;
  containerSize: {width: number; height: number} | null;
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
  const mediaFiles = appStore(state => state.mediaFiles);
  const setMediaFiles = appStore(state => state.setMediaFiles);
  const setActiveFilter = appStore(state => state.setActiveFilter);
  const resetEditorState = appStore(state => state.resetEditorState);
  const [post, setPost] = React.useState(true);

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
  useEffect(() => {
    const mockMedia: MediaFile[] = [
      {
        id: '1',
        uri: VideoSRC, // or import VideoSRC from './assets/test.mp4'
        filename: 'sample',
        mediaType: 'video',
        width: 1080,
        height: 1920,
      },
      {
        id: '2',
        uri: VideoSRC2,
        filename: 'sample2',
        mediaType: 'video',
        width: 1080,
        height: 1920,
      },
    ];

    (window as any).__EXPO_MEDIA__ = {
      file: mockMedia,
      post: true,
      activeFilter: null,
      brightness: 0,
      contrast: 1,
      saturation: 1,
      gamma: 1,
      hue: 0,
      colorBalance: {r: 0, g: 0, b: 0},
      sharpness: 0,
      shadows: 0,
      highlights: 0,
      temperature: 0,
      blur: 0,
    };

    // simulate RN dispatch
    window.dispatchEvent(new Event('mediaReady'));
  }, []);

  useEffect(() => {
    const listener = () => {
      const data: IncomingPayload = (window as any).__EXPO_MEDIA__;
      console.log('📥 Received from RN:', data);
      if (data) {
        setMediaFiles(data.file || []);
        setPost(data.post);
        const filter = data.activeFilter || defaultFilter;
        setActiveFilter(filter);
        resetEditorState({
          brightness: data.brightness || 1,
          contrast: data.contrast || 1,
          saturation: data.saturation || 1,
          gamma: data.gamma || 1,
          hue: data.hue || 0,
          colorBalance: data.colorBalance || {r: 0, g: 0, b: 0},
          sharpness: data.sharpness || 0,
          shadows: data.shadows || 0,
          highlights: data.highlights || 0,
          temperature: data.temperature || 0,
          blur: data.blur || 0,
        });
      }
    };

    window.addEventListener('mediaReady', listener);
    listener(); // run once immediately

    return () => {
      window.removeEventListener('mediaReady', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Always set the first filter
  useEffect(() => {
    if (mediaFiles.length) {
      setActiveFilter(defaultFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaFiles]);

  useEffect(() => {
    console.log('🎨 Active filter changed:', activeFilter);
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
