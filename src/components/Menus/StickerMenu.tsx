import React from 'react';

const StickerMenu = (): React.JSX.Element => {
  return (
    <footer className="fixed right-0 bottom-0 left-0 h-[50%] rounded-t-lg border-t border-gray-800 bg-white backdrop-blur-lg">
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-center text-lg text-gray-700">
          Feature not available yet
        </p>
        <p className="text-center text-sm text-gray-500">Work in progress</p>
      </div>
    </footer>
  );
};

export default StickerMenu;
