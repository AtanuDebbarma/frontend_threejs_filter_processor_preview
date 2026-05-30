import type {StateCreator} from 'zustand';
import type {AppState} from './appStore';

export type ButtonStateType =
  | 'mainMenu'
  | 'filter'
  | 'sticker'
  | 'text'
  | 'addText'
  | 'fontStyle'
  | 'underline'
  | 'textBackground'
  | 'textColor'
  | 'textAlign'
  | 'textBackgroundColor'
  | 'editor'
  | 'editorMainMenu'
  | 'adjust'
  | 'audio'
  | null;
export type ButtonSliceType = {
  activeButton: ButtonStateType;
  setActiveButton: (button: ButtonStateType) => void;
};

export const createButtonSlice: StateCreator<
  AppState,
  [['zustand/immer', never]],
  [],
  ButtonSliceType
> = set => ({
  activeButton: 'mainMenu',

  setActiveButton: button =>
    set(state => {
      state.activeButton = button;
    }),
});
