import React from 'react';
import {appStore} from '../../store/appStore';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faFilter,
  faFaceSmile,
  faMusic,
  faPenToSquare,
} from '@fortawesome/free-solid-svg-icons';
import type {AppColors, Insets} from '../../App';

type Props = {
  post: boolean;
  appColors: AppColors;
  safeInsets: Insets;
};

const BottomBar = ({post, appColors, safeInsets}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);

  const handleButtonToggle = (
    button: 'filter' | 'sticker' | 'audio' | 'editorMainMenu',
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();

    setTimeout(() => {
      setActiveButton(button);
    }, 200);
  };

  return (
    <footer
      className="flex flex-row items-center justify-center rounded-t-lg border-t border-gray-200 pt-5 text-sm font-medium shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
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
      {!post && (
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
