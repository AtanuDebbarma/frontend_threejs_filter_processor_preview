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
import {Loader} from './components/shared/Loader';
import {applyHydrationFromPayload} from './helpers/hydrationBridge';
import {
  useEditorLogging,
  SET_LOG_CONFIG_MESSAGE,
} from './hooks/useEditorLogging';
import {AudioMenu} from './components/Menus/AudioMenu';
import BottomBar from './components/Menus/BottomBar';
import {EditorMenu} from './components/Menus/EditorMenus/EditorMenu';
import {FilterMenu} from './components/Menus/FilterMenu';
import {StickerMenu} from './components/Menus/StickerMenu';
import {TextMenu} from './components/Menus/TextMenus/TextMenu';
import {EditorMenuMain} from './components/Menus/EditorMenus/EditorMenuMain';
import {AdjustMenu} from './components/Menus/AdjustMenu';
import {exportActiveSlideForGallery} from './helpers/exportMedia';
import {pauseAllPreviewVideos} from './helpers/exportPreviewControl';
import {SaveExportStage} from './helpers/saveExportDiagnostics';
import {
  isStartSaveExportPayload,
  postSaveExportData,
  postSaveExportFailed,
} from './helpers/saveBridge';
import {
  handleStartOrResumePostExport,
  isStartPostExportPayload,
  postPostExportFailed,
  requestCancelPostExport,
} from './helpers/postBridge';
import type {ExportMode} from './helpers/exportTypes';

export type {
  AppColors,
  ExportMode,
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
import {FontStyleMenu} from './components/Menus/TextMenus/FontStyleMenu';
import {TextBackgroundMenu} from './components/Menus/TextMenus/TextBackgroundMenu';
import {TextContentOverlayArea} from './components/Menus/TextMenus/TextContentOverlayArea';
import type {ButtonStateType} from './store/buttonSlices';

/** Browser dev only (`bun run dev`). RN WebView uses inject + mediaReady instead. */
// const ENABLE_DEV_MOCK_HYDRATION = import.meta.env.DEV;

/** Keep text preview visible while any text sub-menu is open. */
const TEXT_FLOW_BUTTONS: ReadonlySet<ButtonStateType> = new Set([
  'text',
  'fontStyle',
  'underline',
  'textBackground',
  'textColor',
  'textBackgroundColor',
]);

const App = (): React.JSX.Element => {
  const activeFilter: FilterItem = appStore(state => state.activeFilter);
  const mediaFiles = appStore(state => state.mediaFiles);
  const setMediaFiles = appStore(state => state.setMediaFiles);
  const setIsSaveExporting = appStore(state => state.setIsSaveExporting);
  const setPostUploadEndpointUrl = appStore(
    state => state.setPostUploadEndpointUrl,
  );
  const setIsPostExporting = appStore(state => state.setIsPostExporting);
  const setIsModalOpen = appStore(state => state.setIsModalOpen);
  const tagMode = appStore(state => state.tagMode);
  const storeDpr = appStore(state => state.dpr);
  const setDpr = appStore(state => state.setDpr);
  const [exportMode, setExportMode] = React.useState<ExportMode>('post');
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
      setExportMode,
      setAppColors,
      setSafeInsets,
      setDpr,
      setPostUploadEndpointUrl,
    }),
    [setMediaFiles, setExportMode, setDpr, setPostUploadEndpointUrl],
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

  // Browser dev: mock RN inject so UI is not stuck on loader (no __EXPO_MEDIA__ in Vite).
  // useEffect(() => {
  //   if (!ENABLE_DEV_MOCK_HYDRATION || window.ReactNativeWebView) {
  //     return;
  //   }
  //   const injected = (window as Window & {__EXPO_MEDIA__?: HydrationPayload})
  //     .__EXPO_MEDIA__;
  //   if (injected?.file?.length) {
  //     return;
  //   }

  //   const mockPayload: HydrationPayload = {
  //     file: [
  //       {
  //         id: 'dev-mock-video',
  //         filename: 'ufc.mp4',
  //         uri: VideoSRC2,
  //         mediaType: 'video',
  //         width: 1920,
  //         height: 1080,
  //         duration: 30,
  //       },
  //     ],
  //     exportMode: 'post',
  //     dpr: window.devicePixelRatio || 2,
  //     appColors: {
  //       backgroundColorMain: 'rgba(227, 228, 231, 1)',
  //       bottomMenuBackground: 'rgba(253, 253, 255, 1)',
  //       textColor: 'rgba(0, 0, 0, 1)',
  //       buttonColor: 'rgba(217, 217, 217, 1)',
  //     },
  //     insets: {top: 0, bottom: 0, left: 0, right: 0},
  //     production: false,
  //   };

  //   rnLogger.log('🧪 Dev mock hydration (VideoSRC2)');
  //   void applyHydrationFromPayload(mockPayload, 'DevMock', hydrationHandlers);
  // }, [hydrationHandlers]);

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

          case 'PATCH_STATE': {
            const data: PatchPayload = msg.payload;
            rnLogger.log('🎨 PATCH_STATE update:', data);
            if (data.appColors) setAppColors(data.appColors);
            break;
          }

          case 'MODAL_STATE_CHANGE': {
            const {modalOpen} = msg.payload || {};
            setIsModalOpen(!!modalOpen);
            rnLogger.log('🎨 Modal state changed:', modalOpen);
            break;
          }

          case 'SAVE_EXPORT_COMPLETE': {
            rnLogger.log('✅ Save export complete from RN');
            setIsSaveExporting(false);
            break;
          }

          case 'START_POST_EXPORT':
          case 'RESUME_POST_EXPORT': {
            if (!isStartPostExportPayload(msg.payload)) {
              rnLogger.warn(`${msg.type}: invalid payload`, msg.payload);
              postPostExportFailed({
                error: `${msg.type}: invalid payload`,
              });
              setIsPostExporting(false);
              break;
            }
            handleStartOrResumePostExport(
              msg.payload,
              exportMode,
              msg.type as 'START_POST_EXPORT' | 'RESUME_POST_EXPORT',
            );
            break;
          }

          case 'CANCEL_POST_EXPORT': {
            rnLogger.log('📥 CANCEL_POST_EXPORT — pausing batch between files');
            requestCancelPostExport();
            break;
          }

          case 'START_SAVE_EXPORT': {
            if (!isStartSaveExportPayload(msg.payload)) {
              const fallbackId =
                typeof (msg.payload as {id?: string})?.id === 'string'
                  ? (msg.payload as {id: string}).id
                  : 'unknown';
              postSaveExportFailed({
                id: fallbackId,
                error: 'START_SAVE_EXPORT: invalid payload',
                stage: SaveExportStage.INVALID_START_PAYLOAD,
              });
              setIsSaveExporting(false);
              break;
            }
            const {id, index, writePath, chunkSizeBytes} = msg.payload;
            setIsSaveExporting(true);
            pauseAllPreviewVideos();
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(
                JSON.stringify({
                  type: 'EXPORT_SAVE_STARTED',
                  payload: {id},
                }),
              );
            }
            void (async () => {
              try {
                const result = await exportActiveSlideForGallery(
                  id,
                  index,
                  exportMode,
                  {writePath, chunkSizeBytes},
                );
                if (result.kind === 'base64') {
                  try {
                    postSaveExportData(result.payload);
                  } catch (postErr) {
                    postSaveExportFailed({
                      id,
                      error:
                        postErr instanceof Error
                          ? postErr.message
                          : 'SAVE_EXPORT_DATA post failed',
                      mediaType: result.payload.mediaType,
                      stage: SaveExportStage.BRIDGE_POST_DATA,
                    });
                    setIsSaveExporting(false);
                  }
                }
              } catch (err) {
                const mediaType =
                  appStore.getState().mediaFiles[index]?.mediaType;
                postSaveExportFailed({
                  id,
                  error: err instanceof Error ? err.message : 'Export failed',
                  mediaType:
                    mediaType === 'photo' || mediaType === 'video'
                      ? mediaType
                      : undefined,
                  stage: SaveExportStage.EXPORT_ORCHESTRATOR,
                });
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
        rnLogger.componentLog(
          'App',
          'error',
          `[Save:${SaveExportStage.MESSAGE_HANDLER}] Bad message from RN: ${err}`,
          event.data,
          err,
        );
      }
    };

    document.addEventListener('message', handleDocumentMessage as any);
    rnLogger.log('🎧 Message listener set up on document');

    return () => {
      document.removeEventListener('message', handleDocumentMessage as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrationHandlers, handleLogConfigMessage, applyLogConfigFromHydration]);

  useEffect(() => {
    rnLogger.log('🎨 Active filter changed:', activeFilter);
  }, [activeFilter]);

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
      rnLogger.componentLog(
        'App',
        'error',
        `Failed to open adjust menus: ${error}`,
        error,
      );
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
        <Loader size={40} color="#FF4800" borderWidth={3.5} />
      </div>
    );
  }

  return (
    <main
      className={`flex h-screen w-screen items-center justify-center`}
      style={{backgroundColor: appColors.backgroundColorMain}}>
      <div
        className={`relative mx-auto flex h-full max-w-full flex-1 flex-col overflow-hidden`}>
        <MediaComponent exportMode={exportMode} />
        {(activeButton === 'mainMenu' || activeButton === null) && (
          <BottomBar
            exportMode={exportMode}
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
        {buttonsOpen &&
          activeButton !== null &&
          (activeButton === 'text' ||
            activeButton === 'textColor' ||
            activeButton === 'textBackgroundColor') && (
            <TextMenu appColors={appColors} safeInsets={safeInsets} />
          )}
        {buttonsOpen &&
          activeButton !== null &&
          TEXT_FLOW_BUTTONS.has(activeButton) && (
            <TextContentOverlayArea
              exportMode={exportMode}
              safeInsets={safeInsets}
            />
          )}
        {buttonsOpen && activeButton === 'fontStyle' && (
          <FontStyleMenu appColors={appColors} safeInsets={safeInsets} />
        )}
        {buttonsOpen && activeButton === 'textBackground' && (
          <TextBackgroundMenu appColors={appColors} safeInsets={safeInsets} />
        )}
        {buttonsOpen && activeButton === 'editorMainMenu' && (
          <EditorMenuMain appColors={appColors} safeInsets={safeInsets} />
        )}
        {((buttonsOpen && activeButton === 'adjust') || tagMode) && (
          <AdjustMenu exportMode={exportMode} safeInsets={safeInsets} />
        )}
      </div>
    </main>
  );
};

export default App;
