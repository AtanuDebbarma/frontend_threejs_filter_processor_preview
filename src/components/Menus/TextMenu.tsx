import React from 'react';

export const TextMenu = (): React.JSX.Element => {
  return (
    <footer className="fixed right-0 bottom-0 left-0 h-[23%] rounded-t-lg border-t border-gray-800 bg-white backdrop-blur-lg">
      {/* Text title */}
      <div className="py-4 text-center">
        <h3 className="text-lg font-medium text-black">Text</h3>
      </div>
    </footer>
  );
};
