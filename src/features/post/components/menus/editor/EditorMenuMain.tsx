import React, {useMemo} from 'react';
import {appStore} from '@/store/appStore';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faSliders,
  faImage,
  faFont,
  faFileExport,
} from '@fortawesome/free-solid-svg-icons';
import {MenuBackButtonRow} from '@/shared/components/MenuBackButton';
import {navigateBackFromEditorMainMenu} from '@/features/post/bridge/helpers/performEditorBack';
import {MENU_CHROME_FOOTER_CLASS} from '@/features/post/helpers/menuChrome/menuChromeClasses';
import {
  runMenuChromeNavigationImmediate,
  scheduleSetActiveButton,
} from '@/features/post/helpers/menuChrome/menuChromeNavigation';
import type {AppColors, Insets} from '@/shared/types/webBridgeTypes';
import {requestSaveToDevice} from '@/features/post/bridge/helpers/saveBridge';
type Props = {
  appColors: AppColors;
  safeInsets: Insets;
};

export const EditorMenuMain = ({
  appColors,
  safeInsets,
}: Props): React.JSX.Element => {
  const mediaFiles = appStore(state => state.mediaFiles);
  const activeIndex = appStore(state => state.activeIndex);
  const isSaveExporting = appStore(state => state.isSaveExporting);

  const currentID = useMemo(() => {
    return mediaFiles[activeIndex]?.id;
  }, [activeIndex, mediaFiles]);

  const handleButtonToggle = (
    button: 'adjust' | 'text' | 'audio' | 'editor' | 'mainMenu',
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    scheduleSetActiveButton(button);
  };
  const handleSave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!currentID || isSaveExporting) {
      return;
    }
    setTimeout(() => {
      try {
        requestSaveToDevice(currentID, activeIndex);
      } catch {
        // postSaveExportFailed already sent from saveBridge
      }
    }, 200);
  };

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    runMenuChromeNavigationImmediate(navigateBackFromEditorMainMenu, 'footer');
  };

  return (
    <footer
      className={`${MENU_CHROME_FOOTER_CLASS} z-5000 flex flex-col rounded-t-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]`}
      style={{
        backgroundColor: appColors.bottomMenuBackground,
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      <MenuBackButtonRow
        onClick={handleBack}
        wrapperClassName="flex items-center px-4 py-2"
      />

      {/* Original buttons */}
      <div className="flex flex-row items-center justify-center pt-2 pb-5 text-sm font-medium">
        <button
          onClick={e => handleButtonToggle('adjust', e)}
          className="mx-1.5 flex flex-1 flex-col items-center gap-1.5 rounded-lg px-4 py-3 shadow-sm transition-opacity duration-180 active:opacity-50"
          style={{
            color: appColors.textColor,
            backgroundColor: appColors.buttonColor,
          }}>
          <FontAwesomeIcon icon={faImage} size="lg" />
          <span className="text-xs">Adjust</span>
        </button>

        <button
          onClick={e => handleButtonToggle('editor', e)}
          className="mx-1.5 flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-opacity duration-180 active:opacity-50"
          style={{
            color: appColors.textColor,
            backgroundColor: appColors.buttonColor,
          }}>
          <FontAwesomeIcon icon={faSliders} size="lg" />
          <span className="text-xs">Edit</span>
        </button>
        <button
          onClick={e => handleButtonToggle('text', e)}
          className="mx-1.5 flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-opacity duration-180 active:opacity-50"
          style={{
            color: appColors.textColor,
            backgroundColor: appColors.buttonColor,
          }}>
          <FontAwesomeIcon icon={faFont} size="lg" />
          <span className="text-xs">Text</span>
        </button>
        <button
          onClick={e => handleSave(e)}
          disabled={isSaveExporting || !currentID}
          className="mx-1.5 flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-opacity duration-180 active:opacity-50 disabled:opacity-40"
          style={{
            color: appColors.textColor,
            backgroundColor: appColors.buttonColor,
          }}>
          <FontAwesomeIcon icon={faFileExport} size="lg" />
          <span className="text-xs">Save</span>
        </button>
      </div>
    </footer>
  );
};
