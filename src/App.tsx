import React, {useEffect} from 'react';
import TopBar from './components/Others/TopBar';
import BottomBar from './components/Menus/BottomBar';
import MediaCanvas from './components/Filters_And_MediaOutput/MediaCanvas';
import {appStore} from './store/appStore';
import {FilterMenu} from './components/Menus/FilterMenu';
import StickerMenu from './components/Menus/StickerMenu';
import AudioMenu from './components/Menus/AudioMenu';
import {EditorMenu} from './components/Menus/EditorMenu';
import {FILTERS} from './assets/filters/filterData';
import {TextMenu} from './components/Menus/TextMenu';

const App = ({post = true}: {post?: boolean}): React.JSX.Element => {
  const mediaFiles = appStore(state => state.mediaFiles);
  const setMediaFiles = appStore(state => state.setMediaFiles);
  const activeButton = appStore(state => state.activeButton);
  const setActiveFilter = appStore(state => state.setActiveFilter);
  const buttonsOpen = activeButton !== null;
  const filtertoShowInitial = FILTERS.filter(f => f.key === 'none');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    let files = Array.from(e.target.files);
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
      'image/gif',
      'image/bitmap',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/mkv',
      'video/avi',
      'video/mov',
      'video/mpeg',
      'video/quicktime',
    ];

    // ✅ Filter valid files
    let valid = files.filter(
      f => allowed.includes(f.type) && f.size <= 2000 * 1024 * 1024,
    );

    // ✅ Enforce single file if post === false
    if (!post && valid.length > 1) {
      alert('Only one file allowed in this mode.');
      valid = valid.slice(0, 1);
    }

    if (post && valid.length > 15) {
      alert('Max 15 files allowed.');
      return;
    }
    // temporary will be removed later
    if (post) {
      valid = valid.reverse();
    }
    setMediaFiles(valid);
  };

  // set the first filter to show
  useEffect(() => {
    if (!mediaFiles.length) {
      setActiveFilter(filtertoShowInitial[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaFiles, filtertoShowInitial]);

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-black text-white">
      {/* This section will be removed when migrating to react native web view integration*/}
      {!mediaFiles.length ? (
        <div className="p-4 text-center">
          <label className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white">
            Upload Media
            <input
              type="file"
              accept="image/*,video/*"
              multiple={post}
              hidden
              onChange={handleUpload}
            />
          </label>
        </div>
      ) : (
        <div className="mx-auto flex h-full max-w-md flex-1 flex-col bg-gray-900">
          <TopBar />
          <MediaCanvas post={post} />
          {!buttonsOpen && <BottomBar />}
          {buttonsOpen && activeButton === 'filter' && <FilterMenu />}
          {buttonsOpen && activeButton === 'sticker' && <StickerMenu />}
          {buttonsOpen && activeButton === 'audio' && <AudioMenu />}
          {buttonsOpen && activeButton === 'editor' && <EditorMenu />}
          {buttonsOpen && activeButton === 'text' && <TextMenu />}
        </div>
      )}
    </main>
  );
};

export default App;
