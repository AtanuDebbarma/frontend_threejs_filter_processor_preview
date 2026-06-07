import {MENU_CHROME_FOOTER_CLASS} from '@/features/post/helpers/menuChrome/menuChromeClasses';
import type {Insets} from '@/shared/types/webBridgeTypes';
import {
  MenuBackButtonRow,
  menuBackButtonClassName,
} from '@/shared/components/MenuBackButton';
import React, {type MouseEvent, type ReactNode} from 'react';

type TextSubMenuFooterProps = {
  safeInsets: Insets;
  title: string;
  onBack: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
};

export const TextSubMenuFooter = ({
  safeInsets,
  title,
  onBack,
  children,
}: TextSubMenuFooterProps): React.JSX.Element => (
  <footer
    className={`${MENU_CHROME_FOOTER_CLASS} pointer-events-none fixed right-0 bottom-0 left-0 z-5000 flex flex-col bg-transparent`}
    style={{
      paddingBottom: `${safeInsets.bottom + 10}px`,
    }}>
    <div className="relative flex min-h-9 items-center px-4 pb-4">
      <MenuBackButtonRow
        onClick={onBack}
        wrapperClassName="pointer-events-auto relative z-10 flex shrink-0 items-center py-0 pr-2 pl-0"
        className={menuBackButtonClassName}
      />
      <h3 className="pointer-events-none absolute left-1/2 max-w-[70%] -translate-x-1/2 text-center text-sm font-medium text-nowrap text-white/75">
        {title}
      </h3>
    </div>
    {children}
  </footer>
);
