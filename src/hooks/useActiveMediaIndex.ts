import {useEffect, useRef, useState, useCallback} from 'react';

/**
 * React hook to track the index of the currently active media item (e.g. video, image)
 * based on the intersection of the item with the viewport.
 *
 * @template T The type of the media item element (e.g. HTMLVideoElement, HTMLImageElement)
 * @returns An object with two properties: `activeIndex` (the index of the currently active media item)
 * and `setItemRef` (a function to set the ref of the media item element).
 */
export function useActiveMediaIndex<T extends HTMLElement>() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const itemRefs = useRef<Record<number, T | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Create observer once
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      {threshold: 0.6},
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Assign ref helper that also handles observation
  const setItemRef = useCallback(
    (index: number) => (el: T | null) => {
      const observer = observerRef.current;
      if (!observer) return;

      // Clean up previous element observation
      const previousEl = itemRefs.current[index];
      if (previousEl) {
        observer.unobserve(previousEl);
      }

      // Store new ref
      itemRefs.current[index] = el;

      // Observe new element if it exists
      if (el) {
        observer.observe(el);
      } else {
        // If element is null, remove from refs
        delete itemRefs.current[index];
      }
    },
    [],
  );

  return {activeIndex, setItemRef};
}
