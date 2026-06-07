import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';
import type {MenuChromeKind} from '@/features/post/helpers/menuChrome/menuChromeClasses';

export type MenuChromeSliceType = {
  isMenuChromeTransitioning: boolean;
  menuChromeTransitionKind: MenuChromeKind | null;
  setMenuChromeTransitioning: (active: boolean) => void;
  setMenuChromeTransitionKind: (kind: MenuChromeKind | null) => void;
};

export const createMenuChromeSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  MenuChromeSliceType
> = set => ({
  isMenuChromeTransitioning: false,
  menuChromeTransitionKind: null,

  setMenuChromeTransitioning: active =>
    set(state => {
      state.isMenuChromeTransitioning = active;
    }),

  setMenuChromeTransitionKind: kind =>
    set(state => {
      state.menuChromeTransitionKind = kind;
    }),
});
