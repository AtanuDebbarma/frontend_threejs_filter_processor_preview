/**
 * @description
 * Generates a PNG thumbnail of a video.
 * @param {File} file - The video file.
 * @param {number} [seekTo=1] - Seek to this time in seconds before generating
 * thumbnail.
 * @returns {Promise<string>} A Promise that resolves to a thumbnail as a PNG
 * data URL.
 */
export const getVideoThumbnail = async (
  file: File,
  seekTo: number = 1,
): Promise<string> => {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas context error');

  const objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  // Wait for metadata to load so we know duration and dimensions
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Error loading video metadata'));
  });

  // Cap seekTo to duration
  const safeSeekTo = Math.min(seekTo, video.duration || seekTo);
  video.currentTime = safeSeekTo;

  // Wait for seek to complete
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error('Error seeking video'));
  });

  // Set canvas size and draw frame
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const thumbnail = canvas.toDataURL('image/png');

  URL.revokeObjectURL(objectUrl);
  return thumbnail;
};
