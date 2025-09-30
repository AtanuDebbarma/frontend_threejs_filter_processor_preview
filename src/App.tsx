import React, {useEffect} from 'react';

import {appStore} from './store/appStore';
import {
  defaultFilter,
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
import {ClipLoader} from 'react-spinners';
import {applyHydrationData, trimBase64} from './helpers/helpers';
import {
  getDefaultEditorValues,
  type MediaEditorValues,
} from './store/editorSlice';

export type HydrationPayload = {
  file: MediaFile[];
  post: boolean;
  activeFilter: FilterItem;
};
export type PatchPayload = {
  activeFilter: FilterItem;
  editorValuesByMedia: Record<string, MediaEditorValues>;
};

const App = (): React.JSX.Element => {
  const activeFilter = appStore(state => state.activeFilter);
  const mediaFiles = appStore(state => state.mediaFiles);
  const setMediaFiles = appStore(state => state.setMediaFiles);
  const setActiveFilter = appStore(state => state.setActiveFilter);
  const setEditorValues = appStore(state => state.setEditorValues);
  const [post, setPost] = React.useState(true);
  const [isInitializing, setInitializing] = React.useState(true);

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
    const listener = async () => {
      const data: HydrationPayload = (window as any).__EXPO_MEDIA__;
      if (!data) {
        rnLogger.log('⚠️ No __EXPO_MEDIA__ found on window');
        return;
      }
      const payload = trimBase64({files: data.file});
      rnLogger.log('📥 Processing injected HYDRATE', payload);
      await applyHydrationData(
        data,
        'Injection',
        setMediaFiles,
        setPost,
        setActiveFilter,
      );

      // Notify RN that web is ready
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({type: 'WEB_READY'}),
        );
      }
    };

    window.addEventListener('mediaReady', listener);

    // Also try to run immediately in case the event already fired
    listener();

    return () => {
      window.removeEventListener('mediaReady', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Handle messages from RN
    const handleDocumentMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        rnLogger.log('📨 Received message via document:', msg.type);

        if (msg.type === 'PATCH_STATE') {
          rnLogger.log('🎨 PATCH_STATE update (document):', msg.payload);
          const data: PatchPayload = msg.payload;
          const filter = data.activeFilter ?? defaultFilter;
          setActiveFilter(filter);
          // Update the entire editorValuesByMedia map
          const editorMap = data.editorValuesByMedia;
          if (editorMap) {
            Object.entries(editorMap).forEach(([mediaId, values]) => {
              setEditorValues(mediaId, values ?? getDefaultEditorValues());
            });
          }
        }
      } catch (err) {
        rnLogger.error('⚠️ Bad message from RN via document:', event.data, err);
      }
    };

    document.addEventListener('message', handleDocumentMessage as any);

    rnLogger.log('🎧 Message listeners set up on document');

    return () => {
      document.removeEventListener('message', handleDocumentMessage as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rnLogger.log('🎨 Active filter changed:', activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (!mediaFiles.length || !activeFilter) {
      setInitializing(true);
    } else {
      setInitializing(false);
    }
  }, [mediaFiles, activeFilter]);

  // Early return for loading state - kept as is
  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-transparent">
        <ClipLoader
          size={40}
          color="#FF4800"
          cssOverride={{borderWidth: '3.5px'}}
        />
      </div>
    );
  }
  console.log(post);
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-black text-white">
      <div className="mx-auto flex h-full max-w-full flex-1 flex-col bg-gray-900">
        <MediaComponent post={post} />
      </div>
    </main>
  );
};

export default App;
