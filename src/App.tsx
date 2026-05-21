import React, {useEffect} from 'react';

import {appStore} from './store/appStore';
// import {type FilterItem, type MediaFile} from './types/filterTypes';
import {type FilterItem} from './types/filterTypes';
import MediaComponent from './components/Filters_And_MediaOutput/MediaComponent';
// import VideoSRC from './assets/test.mp4';
// import VideoSRC2 from './assets/ufc.mp4';
// import SRC2 from './assets/test.jpg';
// import VideoSRC3 from './assets/test2.mp4';
import {
  rnLogger,
  setupConsoleInterception,
  setupGlobalErrorHandling,
} from './utils/rnLogger';
import {ClipLoader} from 'react-spinners';
import {applyHydrationFromPayload} from './helpers/hydrationBridge';
import {
  useEditorLogging,
  SET_LOG_CONFIG_MESSAGE,
} from './hooks/useEditorLogging';
import {AudioMenu} from './components/Menus/AudioMenu';
import BottomBar from './components/Menus/BottomBar';
import {EditorMenu} from './components/Menus/EditorMenu';
import {FilterMenu} from './components/Menus/FilterMenu';
import {StickerMenu} from './components/Menus/StickerMenu';
import {TextMenu} from './components/Menus/TextMenu';
import {EditorMenuMain} from './components/Menus/EditorMenuMain';
import {AdjustMenu} from './components/Menus/AdjustMenu';
import type {AdjustRecord} from './store/adjustSlice';
import type {EditorRecord} from './store/editorSlice';
import {normalizeForExport} from './helpers/exportHelpers';
import {exportActiveSlideForGallery} from './helpers/exportMedia';
import {
  isStartSaveExportPayload,
  postSaveExportData,
  postSaveExportFailed,
} from './helpers/saveBridge';
import {TARGET_DIMENSIONS} from './helpers/exportTypes';

export type {
  AppColors,
  HydrationPayload,
  Insets,
  PatchPayload,
} from './types/webBridgeTypes';
import type {
  AppColors,
  HydrationPayload,
  Insets,
  PatchPayload,
} from './types/webBridgeTypes';

const App = (): React.JSX.Element => {
  const activeFilter: FilterItem = appStore(state => state.activeFilter);
  const mediaFiles = appStore(state => state.mediaFiles);
  const setMediaFiles = appStore(state => state.setMediaFiles);
  const requestedExport = appStore(state => state.requestedExport);
  const setRequestedExport = appStore(state => state.setRequestedExport);
  const setIsSaveExporting = appStore(state => state.setIsSaveExporting);
  const setIsModalOpen = appStore(state => state.setIsModalOpen);
  const videoMutedState = appStore.getState().videoMutedState;
  const tagMode = appStore(state => state.tagMode);
  const storeDpr = appStore(state => state.dpr);
  const setDpr = appStore(state => state.setDpr);
  const currentEditorValues: EditorRecord = appStore(
    state => state.editorByIndex,
  );
  const currentStoreAdjust: AdjustRecord = appStore(
    state => state.adjustByIndex,
  );
  const [post, setPost] = React.useState(true);
  const [isInitializing, setInitializing] = React.useState(true);
  const [appColors, setAppColors] = React.useState<AppColors>({
    backgroundColorMain: 'rgba(227, 228, 231, 1)',
    bottomMenuBackground: 'rgba(253, 253, 255, 1)',
    textColor: 'rgba(0, 0, 0, 1)',
    buttonColor: 'rgba(217, 217, 217, 1)',
  });
  const [safeInsets, setSafeInsets] = React.useState<Insets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });

  const activeButton = appStore(state => state.activeButton);
  const buttonsOpen = activeButton !== null;
  const canvasSize = appStore(state => state.canvasSize);

  const {handleRnMessage: handleLogConfigMessage, applyLogConfigFromHydration} =
    useEditorLogging();

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

  // Capability probe (hidden WebView, no __EXPO_MEDIA__): RN CreatePostMainFooter listens for this only.
  useEffect(() => {
    if (!window.ReactNativeWebView) {
      return;
    }
    const webCodecs = typeof VideoEncoder !== 'undefined';
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: 'CAPABILITIES',
        payload: {webCodecs},
      }),
    );
  }, []);

  const hydrationHandlers = React.useMemo(
    () => ({
      setMediaFiles,
      setPost,
      setAppColors,
      setSafeInsets,
      setDpr,
    }),
    [setMediaFiles, setPost, setDpr],
  );

  // Primary hydration: RN injects __EXPO_MEDIA__ + mediaReady before WEB_READY (develop flow).
  useEffect(() => {
    const listener = async () => {
      const data = (window as any).__EXPO_MEDIA__ as
        | HydrationPayload
        | undefined;
      if (!data?.file?.length) {
        rnLogger.log('⚠️ No __EXPO_MEDIA__ found on window');
        return;
      }

      applyLogConfigFromHydration(data.production);
      rnLogger.log('📥 Processing injected hydration (mediaReady)');
      await applyHydrationFromPayload(data, 'Injection', {
        ...hydrationHandlers,
      });

      if (!window.ReactNativeWebView) {
        return;
      }

      const webCodecs = typeof VideoEncoder !== 'undefined';
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'CAPABILITIES',
          payload: {webCodecs},
        }),
      );
      window.ReactNativeWebView.postMessage(
        JSON.stringify({type: 'WEB_READY'}),
      );
    };

    window.addEventListener('mediaReady', listener);
    void listener();

    return () => {
      window.removeEventListener('mediaReady', listener);
    };
  }, [hydrationHandlers, applyLogConfigFromHydration]);

  useEffect(() => {
    // Handle messages from RN
    const handleDocumentMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (!msg?.type) {
          rnLogger.warn('⚠️ Unknown message format:', msg);
          return;
        }

        if (msg.type !== SET_LOG_CONFIG_MESSAGE) {
          rnLogger.log('📨 Received message via document:', msg.type);
        }

        handleLogConfigMessage(msg);

        switch (msg.type) {
          case SET_LOG_CONFIG_MESSAGE:
            break;

          case 'HYDRATE': {
            const data = msg.payload as HydrationPayload | undefined;
            if (!data?.file?.length) {
              rnLogger.warn('⚠️ HYDRATE: missing or empty payload');
              break;
            }
            rnLogger.log('📥 HYDRATE postMessage');
            applyLogConfigFromHydration(data.production);
            void applyHydrationFromPayload(data, 'HYDRATE postMessage', {
              ...hydrationHandlers,
            });
            break;
          }

          case 'UPDATE_ASSETS': {
            const data = msg.payload as HydrationPayload | undefined;
            if (!data?.file?.length) {
              rnLogger.warn('⚠️ UPDATE_ASSETS: missing or empty payload');
              break;
            }
            rnLogger.log('📥 UPDATE_ASSETS postMessage');
            applyLogConfigFromHydration(data.production);
            void applyHydrationFromPayload(data, 'UPDATE_ASSETS', {
              ...hydrationHandlers,
            });
            break;
          }

          case 'PATCH_STATE': {
            const data: PatchPayload = msg.payload;
            rnLogger.log('🎨 PATCH_STATE update:', data);
            if (data.requestedExport) setRequestedExport(true);
            if (data.appColors) setAppColors(data.appColors);
            break;
          }

          case 'MODAL_STATE_CHANGE': {
            const {modalOpen} = msg.payload || {};
            setIsModalOpen(!!modalOpen);
            rnLogger.log('🎨 Modal state changed:', modalOpen);
            break;
          }

          case 'EXPORT_DATA_RECEIVED': {
            rnLogger.log('✅ Export data received');
            setRequestedExport(false);
            break;
          }

          case 'SAVE_DATA_RECEIVED': {
            rnLogger.log('✅ Save data received from RN');
            setIsSaveExporting(false);
            break;
          }

          case 'START_SAVE_EXPORT': {
            if (!isStartSaveExportPayload(msg.payload)) {
              rnLogger.warn('⚠️ START_SAVE_EXPORT: invalid payload');
              break;
            }
            const {id, index} = msg.payload;
            setIsSaveExporting(true);
            void (async () => {
              try {
                const result = await exportActiveSlideForGallery(
                  id,
                  index,
                  'post',
                );
                postSaveExportData(result);
              } catch (err) {
                const message =
                  err instanceof Error ? err.message : 'Export failed';
                rnLogger.error('❌ Save export failed:', message);
                postSaveExportFailed({id, error: message});
                setIsSaveExporting(false);
              }
            })();
            break;
          }

          case 'SAVE_EXPORT_FAILED': {
            setIsSaveExporting(false);
            break;
          }

          default:
            rnLogger.warn('⚠️ Unhandled message type:', msg.type);
            break;
        }
      } catch (err) {
        rnLogger.error('❌ Bad message from RN via document:', event.data, err);
      }
    };

    document.addEventListener('message', handleDocumentMessage as any);
    rnLogger.log('🎧 Message listener set up on document');

    return () => {
      document.removeEventListener('message', handleDocumentMessage as any);
    };
  }, [
    hydrationHandlers,
    handleLogConfigMessage,
    applyLogConfigFromHydration,
    setIsModalOpen,
    setRequestedExport,
    setIsSaveExporting,
  ]);

  useEffect(() => {
    rnLogger.log('🎨 Active filter changed:', activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    try {
      if (requestedExport) {
        const payload = normalizeForExport({
          activeFilter,
          currentEditorValues,
          currentStoreAdjust,
          videoMutedState,
          mediaFiles,
        });

        rnLogger.log(
          '🎨 Sending current active values to RN (export):',
          JSON.stringify(payload, null, 2),
        );

        if (
          window.ReactNativeWebView &&
          canvasSize.width > 0 &&
          canvasSize.height > 0
        ) {
          const {width, height} = TARGET_DIMENSIONS.post;
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'CURRENT_ACTIVE_VALUES',
              payload: {
                post: post,
                save: null,
                canvasWidth: width,
                canvasHeight: height,
                ...payload,
              },
            }),
          );
        }
      }
    } catch (error) {
      rnLogger.error('Failed to send current active values to RN:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedExport, canvasSize]);

  useEffect(() => {
    try {
      if (activeButton === 'adjust' || tagMode) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'ADJUST_MENUS_OPEN',
              payload: {},
            }),
          );
        }
      } else {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: 'MENUS_CLOSE',
              payload: {},
            }),
          );
        }
      }
    } catch (error) {
      rnLogger.error('Failed to open adjust menus:', error);
    }
  }, [activeButton, tagMode]);

  useEffect(() => {
    if (!mediaFiles.length || !storeDpr) {
      setInitializing(true);
    } else {
      setInitializing(false);
    }
  }, [mediaFiles, storeDpr]);

  // Early return for loading state - kept as is
  if (isInitializing) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center"
        style={{backgroundColor: appColors.backgroundColorMain}}>
        <ClipLoader
          size={40}
          color="#FF4800"
          cssOverride={{borderWidth: '3.5px'}}
        />
      </div>
    );
  }

  return (
    <main
      className={`flex h-screen w-screen items-center justify-center`}
      style={{backgroundColor: appColors.backgroundColorMain}}>
      <div
        className={`relative mx-auto flex h-full max-w-full flex-1 flex-col`}>
        <MediaComponent post={post} />
        {!buttonsOpen && (
          <BottomBar
            post={post}
            appColors={appColors}
            safeInsets={safeInsets}
          />
        )}
        {buttonsOpen && activeButton === 'filter' && (
          <FilterMenu appColors={appColors} safeInsets={safeInsets} />
        )}
        {buttonsOpen && activeButton === 'sticker' && (
          <StickerMenu appColors={appColors} safeInsets={safeInsets} />
        )}
        {buttonsOpen && activeButton === 'audio' && (
          <AudioMenu appColors={appColors} safeInsets={safeInsets} />
        )}
        {buttonsOpen && activeButton === 'editor' && (
          <EditorMenu appColors={appColors} safeInsets={safeInsets} />
        )}
        {buttonsOpen && activeButton === 'text' && (
          <TextMenu appColors={appColors} safeInsets={safeInsets} />
        )}
        {buttonsOpen && activeButton === 'editorMainMenu' && (
          <EditorMenuMain appColors={appColors} safeInsets={safeInsets} />
        )}
        {((buttonsOpen && activeButton === 'adjust') || tagMode) && (
          <AdjustMenu post={post} safeInsets={safeInsets} />
        )}
      </div>
    </main>
  );
};

export default App;
