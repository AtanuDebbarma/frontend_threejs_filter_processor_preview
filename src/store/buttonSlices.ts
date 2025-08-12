import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';

export type ButtonStateType =
  | 'filter'
  | 'sticker'
  | 'text'
  | 'editor'
  | 'audio'
  | null;
export type ButtonSliceType = {
  activeButton: ButtonStateType;
  setActiveButton: (button: ButtonStateType) => void;
  closeAllButtons: () => void;
};

export const createButtonSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  ButtonSliceType
> = set => ({
  activeButton: null,

  setActiveButton: button =>
    set(state => {
      state.activeButton = button;
    }),

  closeAllButtons: () =>
    set(state => {
      state.activeButton = null;
    }),
});
