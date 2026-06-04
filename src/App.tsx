import React, {useEffect, useMemo} from 'react';
// import VideoSRC2 from './assets/ufc.mp4';
import {appStore} from './store/appStore';
import type {FilterItem} from '@/shared/types/filterTypes';
import {
  rnLogger,
  setupConsoleInterception,
  setupGlobalErrorHandling,
} from '@/shared/utils/rnLogger';
import {Loader} from '@/shared/components/Loader';
import type {ApplyHydrationOptions} from '@/shared/helpers/hydrationBridge';
import {useEditorLogging} from '@/shared/hooks/useEditorLogging';
import {useMediaReadyHydration} from '@/shared/hooks/useMediaReadyHydration';
// import {useDevMockHydration} from '@/shared/hooks/useDevMockHydration';
import {useRnCapabilitiesProbe} from '@/shared/hooks/useRnCapabilitiesProbe';
import type {ExportMode} from '@/shared/types/exportMode';
import type {AppColors, Insets} from '@/shared/types/webBridgeTypes';
import {PostEditor} from '@/features/post/PostEditor';
import {usePostRnDocumentHandler} from '@/features/post/bridge/hooks/usePostRnDocumentHandler';

export type {
  AppColors,
  HydrationPayload,
  Insets,
  PatchPayload,
} from '@/shared/types/webBridgeTypes';
export type {ExportMode} from '@/shared/types/exportMode';

const DEFAULT_APP_COLORS: AppColors = {
  backgroundColorMain: 'rgba(227, 228, 231, 1)',
  bottomMenuBackground: 'rgba(253, 253, 255, 1)',
  textColor: 'rgba(0, 0, 0, 1)',
  buttonColor: 'rgba(217, 217, 217, 1)',
};

// const DEV_MOCK_HYDRATION: HydrationPayload = {
//   file: [
//     {
//       id: 'dev-mock-video',
//       filename: 'ufc.mp4',
//       uri: VideoSRC2,
//       mediaType: 'video',
//       width: 1920,
//       height: 1080,
//       duration: 30,
//     },
//   ],
//   exportMode: 'post',
//   dpr: typeof window !== 'undefined' ? window.devicePixelRatio || 2 : 2,
//   appColors: DEFAULT_APP_COLORS,
//   insets: {top: 0, bottom: 10, left: 0, right: 0},
//   production: false,
// };

const App = (): React.JSX.Element => {
  const activeFilter: FilterItem = appStore(state => state.activeFilter);
  const mediaFiles = appStore(state => state.mediaFiles);
  const setMediaFiles = appStore(state => state.setMediaFiles);
  const setPostUploadEndpointUrl = appStore(
    state => state.setPostUploadEndpointUrl,
  );
  const storeDpr = appStore(state => state.dpr);
  const setDpr = appStore(state => state.setDpr);
  const [exportMode, setExportMode] = React.useState<ExportMode>('post');
  const [isInitializing, setInitializing] = React.useState(true);
  const [appColors, setAppColors] =
    React.useState<AppColors>(DEFAULT_APP_COLORS);
  const [safeInsets, setSafeInsets] = React.useState<Insets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const {applyLogConfigFromHydration, handleRnMessage: handleLogConfigMessage} =
    useEditorLogging();

  useEffect(() => {
    rnLogger.info('🚀 Media Filter App initializing...');
    const restoreConsole = setupConsoleInterception();
    setupGlobalErrorHandling();
    return () => {
      rnLogger.info('📱 Media Filter App cleaning up...');
      restoreConsole();
    };
  }, []);

  useRnCapabilitiesProbe();

  const hydrationHandlers = useMemo<ApplyHydrationOptions>(
    () => ({
      setMediaFiles,
      setExportMode,
      setAppColors,
      setSafeInsets,
      setDpr,
      setPostUploadEndpointUrl,
    }),
    [setMediaFiles, setDpr, setPostUploadEndpointUrl],
  );

  useMediaReadyHydration({
    hydrationHandlers,
    applyLogConfigFromHydration,
  });

  // useDevMockHydration({
  //   hydrationHandlers,
  //   mockPayload: DEV_MOCK_HYDRATION,
  // });

  usePostRnDocumentHandler({
    exportMode,
    setAppColors,
    handleLogConfigMessage,
  });

  useEffect(() => {
    rnLogger.log('🎨 Active filter changed:', activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    if (!mediaFiles.length || !storeDpr) {
      setInitializing(true);
    } else {
      setInitializing(false);
    }
  }, [mediaFiles, storeDpr]);

  const renderLoader = () => (
    <div
      className="flex h-screen w-screen items-center justify-center"
      style={{backgroundColor: appColors.backgroundColorMain}}>
      <Loader size={40} color="#FF4800" borderWidth={3.5} />
    </div>
  );

  if (isInitializing) {
    return renderLoader();
  }

  const renderContent = () => {
    switch (exportMode) {
      case 'post':
        return (
          <PostEditor
            exportMode={exportMode}
            appColors={appColors}
            safeInsets={safeInsets}
          />
        );
      default:
        return renderLoader();
    }
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
};

export default App;
