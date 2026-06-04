import React from 'react';
import {appStore} from '@/store/appStore';
import MediaComponent from '@/features/post/components/canvas/MediaComponent';
import BottomBar from '@/features/post/components/menus/BottomBar';
import {EditorMenu} from '@/features/post/components/menus/editor/EditorMenu';
import {FilterMenu} from '@/features/post/components/menus/filter/FilterMenu';
import {PlaceholderFeatureMenu} from '@/features/post/components/menus/shared/PlaceholderFeatureMenu';
import {TextMenuMain} from '@/features/post/components/menus/text/TextMenu';
import {EditorMenuMain} from '@/features/post/components/menus/editor/EditorMenuMain';
import {AdjustMenu} from '@/features/post/components/menus/adjust/AdjustMenu';
import {FontStyleMenu} from '@/features/post/components/menus/text/FontStyleMenu';
import {TextBackgroundMenu} from '@/features/post/components/menus/text/TextBackgroundMenu';
import {TextContentOverlayArea} from '@/features/post/components/menus/text/TextContentOverlayArea';
import {TEXT_FLOW_BUTTONS} from '@/features/post/constants/textFlowButtons';
import type {ExportMode} from '@/shared/types/exportMode';
import type {AppColors, Insets} from '@/shared/types/webBridgeTypes';
import {useAdjustMenusRnSync} from '@/features/post/hooks/useAdjustMenusRnSync';

type PostEditorProps = {
  exportMode: ExportMode;
  appColors: AppColors;
  safeInsets: Insets;
};

export function PostEditor({
  exportMode,
  appColors,
  safeInsets,
}: PostEditorProps): React.JSX.Element {
  const activeButton = appStore(state => state.activeButton);
  const tagMode = appStore(state => state.tagMode);
  const buttonsOpen = activeButton !== null;

  useAdjustMenusRnSync();

  return (
    <main
      className="flex h-screen w-screen items-center justify-center"
      style={{backgroundColor: appColors.backgroundColorMain}}>
      <div className="relative mx-auto flex h-full max-w-full flex-1 flex-col overflow-hidden">
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
        {buttonsOpen &&
          (activeButton === 'sticker' || activeButton === 'audio') && (
            <PlaceholderFeatureMenu
              appColors={appColors}
              safeInsets={safeInsets}
            />
          )}
        {buttonsOpen && activeButton === 'editor' && (
          <EditorMenu appColors={appColors} safeInsets={safeInsets} />
        )}
        {buttonsOpen &&
          activeButton !== null &&
          (activeButton === 'text' ||
            activeButton === 'textColor' ||
            activeButton === 'textBackgroundColor') && (
            <TextMenuMain safeInsets={safeInsets} />
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
          <FontStyleMenu safeInsets={safeInsets} />
        )}
        {buttonsOpen && activeButton === 'textBackground' && (
          <TextBackgroundMenu safeInsets={safeInsets} />
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
}
