import {useState, useEffect} from 'react';

// Define the type for window size
type WindowSize = {
  width: number;
  height: number;
  orientation: 'landscape' | 'portrait';
};

function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
    orientation:
      window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);

      // Debounce resize handling
      timeoutId = setTimeout(() => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
          orientation:
            window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        });
      }, 150); // 150ms delay to wait for the resize/orientation to settle
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial calculation
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return windowSize;
}

export default useWindowSize;
