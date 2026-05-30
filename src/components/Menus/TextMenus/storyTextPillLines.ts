/** Strip CR/LF artifacts from a single logical line. */
const sanitizeLineText = (raw: string): string =>
  raw.replace(/\r/g, '').replace(/\n/g, '');

const joinStoryTextLines = (lines: string[]): string => {
  let text = lines.join('\n');
  while (text.endsWith('\n\n')) {
    text = text.slice(0, -1);
  }
  return text;
};

/** Drop trailing / middle ghost empty lines when leaving edit mode. */
const normalizeStoryTextLines = (
  lines: string[],
  focusedLineIndex: number,
): string[] => {
  let result = lines.map(sanitizeLineText);

  if (focusedLineIndex < 0) {
    result = result.filter(line => line !== '');
    return result.length > 0 ? result : [''];
  }

  while (
    result.length > 1 &&
    result[result.length - 1] === '' &&
    focusedLineIndex !== result.length - 1
  ) {
    result.pop();
  }

  if (result.length > 1) {
    result = result.filter((line, i) => line !== '' || i === focusedLineIndex);
  }

  return result.length > 0 ? result : [''];
};

/** Normalize store content for inactive display (blur / sub-menu). */
export const normalizeContentForInactive = (content: string): string => {
  const parts =
    content.length === 0 ? [''] : content.split('\n').map(sanitizeLineText);
  return joinStoryTextLines(normalizeStoryTextLines(parts, -1));
};
