import type {MediaFile} from './filterTypes';

export type AppColors = {
  backgroundColorMain: string;
  bottomMenuBackground: string;
  textColor: string;
  buttonColor: string;
};

export type Insets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type HydrationPayload = {
  file: MediaFile[];
  post: boolean;
  dpr: number;
  appColors: AppColors;
  insets: Insets;
  /** When true, web logs are not forwarded to RN (SET_LOG_CONFIG can also set this). */
  production?: boolean;
  /** S3 upload URL from RN hydration (§0.12). */
  uploadEndpoint?: string;
};

export type EditorLogConfigPayload = {
  production: boolean;
};

export type PatchPayload = {
  appColors: AppColors;
  insets: Insets;
};
