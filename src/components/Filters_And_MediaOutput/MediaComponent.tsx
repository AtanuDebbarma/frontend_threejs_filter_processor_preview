import React, {useMemo} from 'react';
import {MediaCanvas} from './MediaCanvas';

type PROPS = {
  post: boolean;
};

export const MediaComponent = React.memo(({post}: PROPS): React.JSX.Element => {
  return (
    <section className="flex h-full w-full">
      {!post ? (
        <div className="flex h-full w-full items-center justify-center">
          <div className="relative aspect-[9/16] max-h-full w-full max-w-full">
            <div className="flex h-full w-full min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
              <MediaCanvas post={post} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div className="relative aspect-[4/5] w-full max-w-full overflow-hidden">
            <div
              style={{width: '100%', height: '100%'}}
              className="flex min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth">
              <MediaCanvas post={post} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

/*
 * @displayName MediaComponent
 */
MediaComponent.displayName = 'MediaComponent';
