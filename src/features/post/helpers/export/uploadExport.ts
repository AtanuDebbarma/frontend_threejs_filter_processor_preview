/**
 * Upload encoded Post export blobs to the hydration-delivered endpoint (§0.12).
 * Mirrors RN `exportHelpers.uploadSingleMedia` (FormData field `file`, JSON `{ url }`).
 */

import {appStore} from '@/store/appStore';
import {PostExportPausedError} from '@/features/post/helpers/postExport/postExportPause';

/** Media processor uploader returns `{ error: "TOO_LARGE" }` (HTTP 400). */
export class UploadFileTooLargeError extends Error {
  constructor() {
    super('UPLOAD_FILE_TOO_LARGE');
    this.name = 'UploadFileTooLargeError';
  }
}

export const isUploadFileTooLargeError = (err: unknown): boolean =>
  err instanceof UploadFileTooLargeError;

const parseUploaderErrorCode = (responseText: string): string | null => {
  try {
    const data = JSON.parse(responseText) as {error?: string};
    return typeof data.error === 'string' ? data.error : null;
  } catch {
    return null;
  }
};

const rejectUploadHttpError = (
  xhr: XMLHttpRequest,
  reject: (err: Error) => void,
): void => {
  const errorCode = parseUploaderErrorCode(xhr.responseText);
  if (errorCode === 'TOO_LARGE' || xhr.status === 413) {
    reject(new UploadFileTooLargeError());
    return;
  }
  if (errorCode) {
    reject(new Error(`Upload failed with status ${xhr.status}: ${errorCode}`));
    return;
  }
  reject(new Error(`Upload failed with status ${xhr.status}`));
};

export type UploadEncodedMediaParams = {
  endpointUrl: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  onProgress?: (percent: number) => void;
};

let activePostUploadXhr: XMLHttpRequest | null = null;

const isPostUploadPauseRequested = (): boolean =>
  appStore.getState().postExportCancelRequested || document.hidden;

/** Abort in-flight Post S3 XHR when RN pauses export (app background). */
export const abortActivePostUpload = (): void => {
  if (!activePostUploadXhr) {
    return;
  }
  try {
    activePostUploadXhr.abort();
  } catch {
    /* ignore */
  }
};

export const uploadEncodedMediaToEndpoint = async ({
  endpointUrl,
  blob,
  filename,
  mimeType,
  onProgress,
}: UploadEncodedMediaParams): Promise<string> => {
  if (!endpointUrl) {
    throw new Error('Upload endpoint URL is missing');
  }

  const formData = new FormData();
  const file =
    blob instanceof File && blob.name === filename
      ? blob
      : new File([blob], filename, {type: mimeType});
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    activePostUploadXhr = xhr;
    xhr.open('POST', endpointUrl);

    xhr.upload.onprogress = event => {
      if (!onProgress) {
        return;
      }
      const percent = event.lengthComputable
        ? (event.loaded / event.total) * 100
        : 0;
      onProgress(percent);
    };

    xhr.onload = () => {
      activePostUploadXhr = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {url?: string};
          if (typeof data?.url === 'string' && data.url.length > 0) {
            resolve(data.url);
            return;
          }
          reject(new Error('Upload response missing url'));
        } catch {
          reject(new Error('Invalid upload response JSON'));
        }
        return;
      }
      rejectUploadHttpError(xhr, reject);
    };

    xhr.onabort = () => {
      activePostUploadXhr = null;
      reject(new PostExportPausedError('Upload aborted for post export pause'));
    };

    xhr.onerror = () => {
      activePostUploadXhr = null;
      if (isPostUploadPauseRequested()) {
        reject(
          new PostExportPausedError('Upload interrupted for post export pause'),
        );
        return;
      }
      reject(new Error('Network error during upload'));
    };

    xhr.send(formData);
  });
};
