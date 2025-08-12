import React from 'react';
import {appStore} from '../../store/appStore';

const BottomBar = (): React.JSX.Element => {
  const setActiveButton = appStore(state => state.setActiveButton);
  const mediaFiles = appStore(state => state.mediaFiles);
  const addText = appStore(state => state.addText);

  const handleButtonToggle = (
    button: 'filter' | 'sticker' | 'audio' | 'text',
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();

    if (button === 'text') {
      // Add new empty text item for first media index or index 0 if none
      const mediaIndex = mediaFiles.length > 0 ? 0 : -1;
      if (mediaIndex >= 0) {
        addText({
          mediaIndex: mediaIndex,
          content: '', // blank content initially
          x: '50%', // example position (in pixels or %)
          y: '40%',
          zIndex: 15, // base zIndex for new text
          fontSize: 24, // default font size
          fontWeight: 700,
          textColor: '#fff',
          backGroundColor: 'rgba(0,0,0,1)',
          rotation: 0,
          fontFamily: 'Poppins',
        });
      }
    }

    setActiveButton(button);
  };

  return (
    <footer className="flex flex-row items-center justify-center rounded-t-sm border-t border-gray-300 bg-white py-5 text-sm font-medium">
      <button
        onClick={e => handleButtonToggle('filter', e)}
        className="mx-1.5 flex-1/3 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-700 shadow-sm transition active:bg-gray-200 active:shadow-inner">
        Filters
      </button>
      <button
        onClick={e => handleButtonToggle('sticker', e)}
        className="mx-1.5 flex-1/3 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-700 shadow-sm transition active:bg-gray-200 active:shadow-inner">
        Stickers
      </button>
      <button
        onClick={e => handleButtonToggle('audio', e)}
        className="mx-1.5 flex-1/3 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-700 shadow-sm transition active:bg-gray-200 active:shadow-inner">
        Audio
      </button>
      <button
        onClick={e => handleButtonToggle('text', e)}
        className="mx-1.5 flex-1/3 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-700 shadow-sm transition active:bg-gray-200 active:shadow-inner">
        Text
      </button>
    </footer>
  );
};

export default BottomBar;
