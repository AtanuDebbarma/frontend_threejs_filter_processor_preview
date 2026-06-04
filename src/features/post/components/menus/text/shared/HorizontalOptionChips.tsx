import type {ReactNode, RefObject} from 'react';
import {
  chipButtonClassName,
  chipButtonColors,
  chipLabelColors,
} from './chipOptionStyles';

export type ChipOption<T extends string = string> = {
  id: T;
  label: string;
};

type HorizontalOptionChipsProps<T extends string> = {
  options: readonly ChipOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  renderLabel?: (option: ChipOption<T>, isSelected: boolean) => ReactNode;
  rowClassName?: string;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  registerButtonRef?: (id: T, el: HTMLButtonElement | null) => void;
};

export function HorizontalOptionChips<T extends string>({
  options,
  selectedId,
  onSelect,
  renderLabel,
  rowClassName = 'mx-2 flex',
  scrollContainerRef,
  registerButtonRef,
}: HorizontalOptionChipsProps<T>): React.JSX.Element {
  return (
    <div
      ref={scrollContainerRef}
      className={`scrollbar-hide pointer-events-none overflow-x-auto ${rowClassName}`}
      style={{WebkitOverflowScrolling: 'touch'}}>
      {options.map(option => {
        const isSelected = selectedId === option.id;
        return (
          <button
            key={option.id}
            ref={el => registerButtonRef?.(option.id, el)}
            type="button"
            onClick={() => onSelect(option.id)}
            className={chipButtonClassName}
            style={chipButtonColors(isSelected)}>
            {renderLabel ? (
              renderLabel(option, isSelected)
            ) : (
              <p
                className="text-md font-medium text-nowrap"
                style={chipLabelColors(isSelected)}>
                {option.label}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
