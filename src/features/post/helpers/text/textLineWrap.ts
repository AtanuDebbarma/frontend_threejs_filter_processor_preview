/** Horizontal padding on story text (`5px 10px` → 10px × 2). */
export const PILL_LINE_PADDING_X_PX = 20;

export type TextMeasureStyle = {
  fontFamily?: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
};

export const createCanvasTextMeasurer = (
  style: TextMeasureStyle,
): ((text: string) => number) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return () => 0;
  }
  const fontFamily = style.fontFamily
    ? `"${style.fontFamily}", Poppins, system-ui, sans-serif`
    : 'Poppins, system-ui, sans-serif';
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${fontFamily}`;
  return (text: string) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  };
};

const pushHardBrokenWord = (
  word: string,
  maxWidth: number,
  measure: (s: string) => number,
  out: string[],
): void => {
  let chunk = '';
  for (const ch of word) {
    const next = chunk + ch;
    if (measure(next) <= maxWidth) {
      chunk = next;
      continue;
    }
    if (chunk) {
      out.push(chunk);
    }
    chunk = ch;
  }
  if (chunk) {
    out.push(chunk);
  }
};

/** Wrap one logical line into segments that fit `maxTextWidth` (text only). */
export const wrapLineToWidth = (
  line: string,
  maxTextWidth: number,
  measure: (text: string) => number,
): string[] => {
  if (maxTextWidth <= 0) {
    return [line];
  }
  if (!line) {
    return [''];
  }
  if (measure(line) <= maxTextWidth) {
    return [line];
  }

  const out: string[] = [];
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }

  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxTextWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      out.push(current);
      current = '';
    }
    if (measure(word) <= maxTextWidth) {
      current = word;
      continue;
    }
    pushHardBrokenWord(word, maxTextWidth, measure, out);
  }

  if (current) {
    out.push(current);
  }
  return out.length > 0 ? out : [''];
};

export const wrapLinesToWidth = (
  lines: string[],
  maxTextWidth: number,
  measure: (text: string) => number,
): string[] =>
  lines.flatMap(line => wrapLineToWidth(line, maxTextWidth, measure));

/** Hard-wrap at stage edge; preserves user `\n` rows. */
export const wrapStoryTextContentToStage = (
  content: string,
  maxStageWidthPx: number,
  measure: (text: string) => number,
): string => {
  if (maxStageWidthPx <= 0) {
    return content;
  }
  const maxTextWidth = Math.max(0, maxStageWidthPx - PILL_LINE_PADDING_X_PX);
  const lines = content.length === 0 ? [''] : content.split('\n');
  return wrapLinesToWidth(lines, maxTextWidth, measure).join('\n');
};

/**
 * Map textarea caret after canvas wrap (may insert `\n` for spaces / line splits).
 * If caret was at end of `before`, keep it at end of `after`.
 */
export const mapCaretAfterStoryTextWrap = (
  before: string,
  after: string,
  caret: number,
): number => {
  if (before === after) {
    return caret;
  }

  const clamped = Math.max(0, Math.min(caret, before.length));
  if (clamped >= before.length) {
    return after.length;
  }
  if (clamped <= 0) {
    return 0;
  }

  let oi = 0;
  let ni = 0;

  while (oi < clamped && ni < after.length) {
    const bc = before[oi];
    const ac = after[ni];

    if (bc === ac) {
      oi++;
      ni++;
      continue;
    }

    if (ac === '\n' && (bc === ' ' || bc === '\t')) {
      oi++;
      ni++;
      continue;
    }

    if (ac === '\n') {
      ni++;
      continue;
    }

    if (bc === ' ' && ac !== '\n') {
      oi++;
      continue;
    }

    oi++;
  }

  return Math.min(ni, after.length);
};
