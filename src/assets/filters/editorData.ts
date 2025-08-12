export type EditorSettings =
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'gamma'
  | 'hue'
  | 'colorBalance'
  | 'curves'
  | 'sharpness'
  | 'shadows'
  | 'highlights'
  | 'gamma'
  | 'temperature'
  | 'blur';

export type EditorFilter = {
  name: string;
  key: EditorSettings;
};

export const EditableFilters: EditorFilter[] = [
  {name: 'Brightness', key: 'brightness'},
  {name: 'Contrast', key: 'contrast'},
  {name: 'Saturation', key: 'saturation'},
  {name: 'Gamma', key: 'gamma'},
  {name: 'Hue', key: 'hue'},
  {name: 'Color Balance', key: 'colorBalance'},
  {name: 'Curves', key: 'curves'},
  {name: 'Sharpness', key: 'sharpness'},
  {name: 'Shadows', key: 'shadows'},
  {name: 'Highlights', key: 'highlights'},
  {name: 'Gamma', key: 'gamma'},
  {name: 'Temperature', key: 'temperature'},
  {name: 'Blur', key: 'blur'},
];
