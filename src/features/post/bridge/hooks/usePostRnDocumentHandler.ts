import {useEffect, type Dispatch, type SetStateAction} from 'react';
import {appStore} from '@/store/appStore';
import {SET_LOG_CONFIG_MESSAGE} from '@/shared/hooks/useEditorLogging';
import type {ExportMode} from '@/shared/types/exportMode';
import type {AppColors, PatchPayload} from '@/shared/types/webBridgeTypes';
import {rnLogger} from '@/shared/utils/rnLogger';
import {exportActiveSlideForGallery} from '@/features/post/helpers/export/exportMedia';
import {pauseAllPreviewVideos} from '@/features/post/helpers/export/exportPreviewControl';
import {SaveExportStage} from '@/features/post/bridge/helpers/saveExportDiagnostics';
import {
  isStartSaveExportPayload,
  postSaveExportData,
  postSaveExportFailed,
} from '@/features/post/bridge/helpers/saveBridge';
import {
  handleStartOrResumePostExport,
  isStartPostExportPayload,
  requestCancelPostExport,
} from '@/features/post/bridge/helpers/postBridge';
import {postPostExportFailed} from '@/features/post/bridge/helpers/postExportRnMessages';
import {performEditorBack} from '@/features/post/bridge/helpers/performEditorBack';

type UsePostRnDocumentHandlerParams = {
  exportMode: ExportMode;
  setAppColors: Dispatch<SetStateAction<AppColors>>;
  handleLogConfigMessage: (msg: {type?: string; payload?: unknown}) => void;
};

export function usePostRnDocumentHandler({
  exportMode,
  setAppColors,
  handleLogConfigMessage,
}: UsePostRnDocumentHandlerParams): void {
  const setIsSaveExporting = appStore(state => state.setIsSaveExporting);
  const setIsPostExporting = appStore(state => state.setIsPostExporting);
  const setIsModalOpen = appStore(state => state.setIsModalOpen);

  useEffect(() => {
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

          case 'EDITOR_BACK': {
            performEditorBack();
            break;
          }

          default:
            rnLogger.warn('⚠️ Unhandled message type:', msg.type);
            break;
        }
      } catch (err) {
        rnLogger.componentLog(
          'usePostRnDocumentHandler',
          'error',
          `[Save:${SaveExportStage.MESSAGE_HANDLER}] Bad message from RN: ${err}`,
          event.data,
          err,
        );
      }
    };

    document.addEventListener(
      'message',
      handleDocumentMessage as EventListener,
    );
    rnLogger.log('🎧 Message listener set up on document');

    return () => {
      document.removeEventListener(
        'message',
        handleDocumentMessage as EventListener,
      );
    };
  }, [
    exportMode,
    handleLogConfigMessage,
    setAppColors,
    setIsModalOpen,
    setIsPostExporting,
    setIsSaveExporting,
  ]);
}
