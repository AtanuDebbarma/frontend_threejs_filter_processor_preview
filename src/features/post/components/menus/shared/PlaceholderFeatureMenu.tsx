import React, {type MouseEvent} from 'react';
import {appStore} from '@/store/appStore';
import {MenuBackButtonRow} from '@/shared/components/MenuBackButton';
import type {AppColors, Insets} from '@/shared/types/webBridgeTypes';

export type PlaceholderFeatureMenuProps = {
  appColors: AppColors;
  safeInsets: Insets;
  /** Optional label when wiring a real feature later (unused for now). */
  featureLabel?: string;
};

/**
 * Bottom sheet stub for features not implemented yet (audio, stickers, etc.).
 */
export const PlaceholderFeatureMenu = ({
  appColors,
  safeInsets,
}: PlaceholderFeatureMenuProps): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);

  const handleBack = (e: MouseEvent<HTMLButtonElement>) => {
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
      <MenuBackButtonRow onClick={handleBack} />

      <div className="flex h-full flex-col items-center justify-start pt-5">
        <p className="text-center text-lg" style={{color: appColors.textColor}}>
          Feature not available yet
        </p>
        <p className="text-center text-sm text-gray-400">Work in progress</p>
      </div>
    </footer>
  );
};
