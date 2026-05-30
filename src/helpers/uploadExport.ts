/**
 * Upload encoded Post export blobs to the hydration-delivered endpoint (§0.12).
 * Mirrors RN `exportHelpers.uploadSingleMedia` (FormData field `file`, JSON `{ url }`).
 */

export type UploadEncodedMediaParams = {
  endpointUrl: string;
  blob: Blob;
  filename: string;
  mimeType: string;
  onProgress?: (percent: number) => void;
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
      reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
};
