import React, {useEffect} from 'react';
import MediaCanvas from './components/Filters_And_MediaOutput/MediaCanvas';
import {appStore} from './store/appStore';
import {FILTERS} from './assets/filters/filterData';
import type {MediaFile} from './types/filterTypes';

type AppProps = {
  post?: boolean;
  uris?: MediaFile[]; // 👈 optional prop if used standalone in browser
};

const App = ({post = true}: AppProps): React.JSX.Element => {
  const mediaFiles = appStore(state => state.mediaFiles);
  const setMediaFiles = appStore(state => state.setMediaFiles);
  const setActiveFilter = appStore(state => state.setActiveFilter);
  const filtertoShowInitial = FILTERS.filter(f => f.key === 'none');

  useEffect(() => {
    const listener = () => {
      const data = (window as any).__EXPO_MEDIA__;
      console.log('📥 Received from RN:', data);
      if (data && Array.isArray(data.uris)) {
        setMediaFiles(data.uris);
      }
    };

    window.addEventListener('mediaReady', listener);
    listener(); // run once immediately

    return () => {
      window.removeEventListener('mediaReady', listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Always set the first filter
  useEffect(() => {
    if (mediaFiles.length) {
      setActiveFilter(filtertoShowInitial[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaFiles, filtertoShowInitial]);

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-black text-white">
      <div className="mx-auto flex h-full max-w-full flex-1 flex-col bg-gray-900">
        <MediaCanvas post={post} />
      </div>
    </main>
  );
};

export default App;
