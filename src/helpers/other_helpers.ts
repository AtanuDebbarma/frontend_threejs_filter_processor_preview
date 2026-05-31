// src/helpers/helpers.ts

import type {HydrationPayload} from '../App';
import type {ExportMode} from './exportTypes';
import type {MediaItem} from '../hooks/useVerifiedMediaFiles';
import {type MediaFile} from '../types/filterTypes';
import {rnLogger} from '../utils/rnLogger';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import React from 'react';

type TrimParams = {
  files?: MediaFile[];
  mediItems?: MediaItem[];
  singleFile?: string;
};

/**
 * Trim base64 encoded strings (e.g. image/video URIs) to a shorter length.
 * This is useful for displaying URIs in the UI without overwhelming the user.
 * @param {TrimParams} params - an object containing either `files`, `mediItems`, or `singleFile` property.
 * @returns {MediaFile[] | MediaItem[] | string | undefined} - the trimmed base64 encoded string(s) or undefined if no valid property is provided.
 */
export const trimBase64 = ({
  files,
  mediItems,
  singleFile,
}: TrimParams): MediaFile[] | MediaItem[] | string | undefined => {
  if (files && files.length) {
    const payload = files.map(m => {
      if (!m.uri) return m; // no uri, just return object
      const shortUri = m.uri.startsWith('data:')
        ? m.uri.slice(0, 25) + '... [trimmed]'
        : m.uri;
      return {
        ...m,
        uri: shortUri,
      };
    });
    return payload;
  }
  if (mediItems && mediItems.length) {
    const payload = mediItems.map(m => {
      if (!m.uri) return m; // no uri, just return object
      const shortUri = m.uri.startsWith('data:')
        ? m.uri.slice(0, 25) + '... [trimmed]'
        : m.uri;
      return {
        ...m,
        uri: shortUri,
      };
    });
    return payload;
  }
  if (singleFile) {
    const shortUri = singleFile.startsWith('data:')
      ? singleFile.slice(0, 25) + '... [trimmed]'
      : singleFile;
    return shortUri;
  }
};

/**
 * Applies hydration data from a given source (e.g. server, local storage)
 * @param data - The hydration data payload
 * @param source - The source of the hydration data (e.g. server, local storage)
 * @param setMediaFiles - A function to set the media files state
 * @param setExportMode - Layout + export mode from RN hydration
 */
export const applyHydrationData = async (
  data: HydrationPayload,
  source: string,
  setMediaFiles: (files: MediaFile[] | []) => void,
  setExportMode: React.Dispatch<React.SetStateAction<ExportMode>>,
) => {
  const payload = trimBase64({files: data.file});
  rnLogger.log(`📥 Applying HYDRATE from ${source}:`, payload);

  setMediaFiles(data.file ?? []);
  setExportMode(data.exportMode);
};

export function computeCoverFit(
  mediaW: number,
  mediaH: number,
  containerW: number,
  containerH: number,
) {
  const mediaAspect = mediaW / mediaH;
  const containerAspect = containerW / containerH;

  let renderW,
    renderH,
    offsetX = 0,
    offsetY = 0;

  if (mediaAspect > containerAspect) {
    // media is wider → crop horizontally
    renderH = containerH;
    renderW = renderH * mediaAspect;
    offsetX = (renderW - containerW) / 2;
  } else {
    // media is taller → crop vertically
    renderW = containerW;
    renderH = renderW / mediaAspect;
    offsetY = (renderH - containerH) / 2;
  }

  return {renderW, renderH, offsetX, offsetY};
}
