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
    className="pointer-events-none fixed right-0 bottom-0 left-0 z-5000 flex flex-col bg-transparent"
    style={{
      paddingBottom: `${safeInsets.bottom + 10}px`,
    }}>
    <MenuBackButtonRow
      onClick={onBack}
      wrapperClassName="pointer-events-none flex items-center px-4 py-0"
      className={`pointer-events-auto ${menuBackButtonClassName}`}
    />
    <div className="pb-4 text-center text-white/65">
      <h3 className="text-sm font-medium">{title}</h3>
    </div>
    {children}
  </footer>
);
