import {faArrowLeft} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {appStore} from '@/store/appStore';
import type {AppColors, Insets} from '@/shared/types/webBridgeTypes';

type Props = {
  appColors: AppColors;
  safeInsets: Insets;
};

export const StickerMenu = ({
  appColors,
  safeInsets,
}: Props): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setTimeout(() => {
      setActiveButton('mainMenu');
    }, 200);
  };
  return (
    <footer
      className="fixed right-0 bottom-0 left-0 z-5000 h-[50%] rounded-t-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]"
      style={{
        backgroundColor: appColors.bottomMenuBackground,
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      <div className="flex items-center px-4 py-1">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-orange-600 transition-opacity duration-180 active:opacity-50">
          <FontAwesomeIcon icon={faArrowLeft} size="sm" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      <div className="flex h-full flex-col items-center justify-start pt-5">
        <p
          className="text-center text-lg"
          style={{
            color: appColors.textColor,
          }}>
          Feature not available yet
        </p>
        <p className="text-center text-sm text-gray-400">Work in progress</p>
      </div>
    </footer>
  );
};
