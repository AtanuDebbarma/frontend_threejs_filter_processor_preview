import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faFilter,
  faFaceSmile,
  faMusic,
  faPenToSquare,
} from '@fortawesome/free-solid-svg-icons';
import type {
  AppColors,
  ExportMode,
  Insets,
} from '@/shared/types/webBridgeTypes';
import {MENU_CHROME_FOOTER_CLASS} from '@/features/post/helpers/menuChrome/menuChromeClasses';
import {scheduleSetActiveButton} from '@/features/post/helpers/menuChrome/menuChromeNavigation';
import {isPostLayoutMode} from '@/features/post/types/exportTypes';

type Props = {
  exportMode: ExportMode;
  appColors: AppColors;
  safeInsets: Insets;
};

const BottomBar = ({
  exportMode,
  appColors,
  safeInsets,
}: Props): React.JSX.Element => {
  const handleButtonToggle = (
    button: 'filter' | 'sticker' | 'audio' | 'editorMainMenu',
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();
    scheduleSetActiveButton(button);
  };

  return (
    <footer
      className={`${MENU_CHROME_FOOTER_CLASS} flex flex-row items-center justify-center rounded-t-lg border-t border-gray-200 pt-5 text-sm font-medium shadow-[0_-2px_10px_rgba(0,0,0,0.2)]`}
      style={{
        backgroundColor: appColors.bottomMenuBackground,
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      <button
        onClick={e => handleButtonToggle('filter', e)}
        className="mx-1.5 flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-opacity duration-180 active:opacity-50"
        style={{
          color: appColors.textColor,
          backgroundColor: appColors.buttonColor,
        }}>
        <FontAwesomeIcon icon={faFilter} size="lg" />
        <span className="text-xs">Filters</span>
      </button>
      {!isPostLayoutMode(exportMode) && (
        <button
          onClick={e => handleButtonToggle('sticker', e)}
          className="mx-1.5 flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-opacity duration-180 active:opacity-50"
          style={{
            color: appColors.textColor,
            backgroundColor: appColors.buttonColor,
          }}>
          <FontAwesomeIcon icon={faFaceSmile} size="lg" />
          <span className="text-xs">Stickers</span>
        </button>
      )}
      <button
        onClick={e => handleButtonToggle('audio', e)}
        className="mx-1.5 flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-opacity duration-180 active:opacity-50"
        style={{
          color: appColors.textColor,
          backgroundColor: appColors.buttonColor,
        }}>
        <FontAwesomeIcon icon={faMusic} size="lg" />
        <span className="text-xs">Audio</span>
      </button>
      <button
        onClick={e => handleButtonToggle('editorMainMenu', e)}
        className="mx-1.5 flex flex-1 flex-col items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-3 shadow-sm transition-opacity duration-180 active:opacity-50"
        style={{
          color: appColors.textColor,
          backgroundColor: appColors.buttonColor,
        }}>
        <FontAwesomeIcon icon={faPenToSquare} size="lg" />
        <span className="text-xs">Edit</span>
      </button>
    </footer>
  );
};

export default BottomBar;
