/** RN hydration URIs — load via <video> / XHR, not fetch (file:// fails in WebView). */
export const isDirectMediaUri = (uri: string): boolean =>
  uri.startsWith('blob:') ||
  uri.startsWith('data:') ||
  uri.startsWith('file:') ||
  uri.startsWith('content:') ||
  uri.startsWith('ph:');

const readLocalUriViaXHR = (uri: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const blob = xhr.response;
      const ok = xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300);
      if (ok && blob instanceof Blob && blob.size > 0) {
        resolve(blob);
        return;
      }
      reject(
        new Error(
          `Failed to read local media (status ${xhr.status}, ${blob instanceof Blob ? blob.size : 0} bytes)`,
        ),
      );
    };
    xhr.onerror = () =>
      reject(new Error('Failed to read local media (XHR error)'));
    xhr.send();
  });

/**
 * Reads a media URI into a Blob for Mediabunny demux.
 * file:// / content:// use XHR; http(s) uses fetch.
 */
export const mediaUriToBlob = async (uri: string): Promise<Blob> => {
  if (isDirectMediaUri(uri)) {
    return readLocalUriViaXHR(uri);
  }
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error(`Failed to fetch media (${res.status})`);
  }
  return res.blob();
};
