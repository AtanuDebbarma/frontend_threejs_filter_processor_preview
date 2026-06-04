import {useEffect, useRef} from 'react';

type ScrollableOption = {id: string};

type UseHorizontalChipScrollParams = {
  options: readonly ScrollableOption[];
  selectedId: string;
};

export function useHorizontalChipScroll({
  options,
  selectedId,
}: UseHorizontalChipScrollParams) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const registerButtonRef = (id: string, el: HTMLButtonElement | null) => {
    buttonRefs.current[id] = el;
  };

  useEffect(() => {
    const selectedIndex = options.findIndex(o => o.id === selectedId);
    if (selectedIndex < 0) return;

    const selectedButton = buttonRefs.current[selectedId];
    if (!selectedButton) return;

    if (selectedIndex === 0 || selectedIndex === options.length - 1) {
      selectedButton.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'auto',
      });
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) return;

    const targetLeft =
      selectedButton.offsetLeft -
      (container.clientWidth - selectedButton.offsetWidth) / 2;
    const maxScrollLeft = Math.max(
      0,
      container.scrollWidth - container.clientWidth,
    );
    container.scrollTo({
      left: Math.min(Math.max(0, targetLeft), maxScrollLeft),
      behavior: 'auto',
    });
  }, [options, selectedId]);

  return {scrollContainerRef, registerButtonRef};
}
