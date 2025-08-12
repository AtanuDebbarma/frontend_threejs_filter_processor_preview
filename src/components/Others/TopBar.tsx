import React from 'react';

const TopBar = (): React.JSX.Element => {
  return (
    <nav className="flex items-center justify-between bg-white px-4 py-4 text-lg font-semibold text-black">
      <button className="text-black">Cancel</button>
      <button className="text-orange-500">Next</button>
    </nav>
  );
};

export default TopBar;
