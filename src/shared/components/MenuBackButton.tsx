import {faArrowLeft} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import type {MouseEvent, JSX} from 'react';

export const menuBackButtonClassName =
  'flex items-center gap-1 text-orange-600 transition-opacity duration-180 active:opacity-50';

export type MenuBackButtonProps = {
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  /** Extra classes merged onto the default back button styles. */
  className?: string;
};

export const MenuBackButton = ({
  onClick,
  className,
}: MenuBackButtonProps): JSX.Element => (
  <button
    type="button"
    onClick={onClick}
    className={className ?? menuBackButtonClassName}>
    <FontAwesomeIcon icon={faArrowLeft} size="sm" />
    <span className="text-sm font-medium">Back</span>
  </button>
);

export type MenuBackButtonRowProps = MenuBackButtonProps & {
  /** Wrapper around the button (padding differs per menu). */
  wrapperClassName?: string;
};

const defaultWrapperClassName = 'flex items-center px-4 py-1';

export const MenuBackButtonRow = ({
  onClick,
  className,
  wrapperClassName = defaultWrapperClassName,
}: MenuBackButtonRowProps): JSX.Element => (
  <div className={wrapperClassName}>
    <MenuBackButton onClick={onClick} className={className} />
  </div>
);
