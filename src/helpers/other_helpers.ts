// src/helpers/helpers.ts

import type {HydrationPayload} from '../App';
import type {MediaItem} from '../hooks/useVerifiedMediaFiles';
import {type MediaFile} from '../types/filterTypes';
import {rnLogger} from '../utils/rnLogger';
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
 * @param setPost - A function to set the post state
 */
export const applyHydrationData = async (
  data: HydrationPayload,
  source: string,
  setMediaFiles: (files: MediaFile[] | []) => void,
  setPost: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  const payload = trimBase64({files: data.file});
  rnLogger.log(`📥 Applying HYDRATE from ${source}:`, payload);

  setMediaFiles(data.file ?? []);
  setPost(data.post);
};
