import React, {type MouseEvent} from 'react';
import {MenuBackButtonRow} from '@/shared/components/MenuBackButton';
import {navigateBackFromFeatureMenu} from '@/features/post/bridge/helpers/performEditorBack';
import {MENU_CHROME_FOOTER_CLASS} from '@/features/post/helpers/menuChrome/menuChromeClasses';
import {scheduleMenuChromeBack} from '@/features/post/helpers/menuChrome/menuChromeNavigation';
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
  const handleBack = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    scheduleMenuChromeBack(navigateBackFromFeatureMenu);
  };

  return (
    <footer
      className={`${MENU_CHROME_FOOTER_CLASS} fixed right-0 bottom-0 left-0 z-5000 h-[50%] rounded-t-lg border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.2)]`}
      style={{
        backgroundColor: appColors.bottomMenuBackground,
        paddingBottom: `${safeInsets.bottom + 10}px`,
      }}>
      <MenuBackButtonRow onClick={handleBack} wrapperClassName="pt-2" />

      <div className="flex h-full flex-col items-center justify-start pt-5">
        <p className="text-center text-lg" style={{color: appColors.textColor}}>
          Feature not available yet
        </p>
        <p className="text-center text-sm text-gray-400">Work in progress</p>
      </div>
    </footer>
  );
};
