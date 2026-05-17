import type {AdjustRecord} from '../store/adjustSlice';
import type {EditorRecord} from '../store/editorSlice';
import type {FilterItem, FilterParams, MediaFile} from '../types/filterTypes';

/**
 * Normalize the active filter, current editor values, and current store adjust
 * for export.
 *
 * @param {FilterIte} activeFilter - The currently active filter.
 * @param {EditorRecord} currentEditorValues - The current values of the editor.
 * @param {AdjustRecord} currentStoreAdjust - The current values of the store adjust.
 *
 * @return {{filter: string | null, files:object}} - An object containing the normalized filter and files.
 */
export function normalizeForExport({
  activeFilter,
  currentEditorValues,
  currentStoreAdjust,
  videoMutedState,
  mediaFiles,
}: {
  activeFilter: FilterItem;
  currentEditorValues: EditorRecord;
  currentStoreAdjust: AdjustRecord;
  videoMutedState: Record<number, {id: string; muted: boolean}>;
  mediaFiles: MediaFile[];
}) {
  // get ffmpeg-friendly data per index
  const normalized = Object.entries(currentEditorValues)
    .map(([index, editor]) => {
      const media = mediaFiles[Number(index)];

      if (!media) {
        console.warn(`⚠️ No matching media file for editor index ${index}`);
        return null;
      }
      const merged: FilterParams = {
        ...activeFilter.params,
        ...editor.value,
        unsharp: {
          amount:
            editor.value.sharpness ?? activeFilter.params.unsharp?.amount ?? 0,
          radius: activeFilter.params.unsharp?.radius ?? 0,
          threshold: activeFilter.params.unsharp?.threshold ?? 0,
        },
      };

      delete (merged as any).sharpness;
      delete (merged as any).ffmpeg;
      delete (merged as any).order;
      delete (merged as any).colorSpace;
      delete (merged as any).inputRange;
      // const ffmpegCmd = buildFfmpegString(merged, activeFilter.params.order);

      const mutedEntry = videoMutedState[Number(index)];
      const isMuted =
        mutedEntry && mutedEntry.id === editor.id ? mutedEntry.muted : false;

      // ✅ Full enriched export object
      return {
        id: editor.id,
        index: Number(index),
        filename: media.filename,
        mediaType: media.mediaType,
        width: media.width,
        height: media.height,
        duration: media.duration ?? 0,
        uri: '', // RN will hydrate this
        // ffmpeg: ffmpegCmd,
        params: merged,
        adjust: currentStoreAdjust[Number(index)],
        muted: isMuted,
      };
    })
    .filter(Boolean); // remove any nulls from missing matches

  return {filter: activeFilter.key, files: normalized};
}

// const round = (num: number | undefined, digits = 4) => {
//   if (num === undefined || num === null) return undefined;
//   return Number.isFinite(num) ? parseFloat(num.toFixed(digits)) : num;
// };
// /**
//  * Builds a string of FFmpeg commands based on the provided filter parameters.
//  *
//  * The order of the commands is important, as some commands may override the results of previous commands.
//  * If an order is provided, the commands will be constructed in that order.
//  * If no order is provided, the commands will be constructed in the following order: curves, colorBalance, eq, unsharp, blur.
//  *
//  * @param {FilterParams} params - The filter parameters to build into a string of FFmpeg commands.
//  * @param {string[]} [order] - The order in which to construct the commands. If not provided, the commands will be constructed in the default order.
//  *
//  * @returns {string} - A string of FFmpeg commands.
//  */
// export function buildFfmpegString(
//   params: FilterParams,
//   order?: string[],
// ): string {
//   const cmds: string[] = [];

//   const brightness = round(params.brightness) ?? 0;
//   const contrast = round(params.contrast) ?? 1;
//   const saturation = round(params.saturation) ?? 1;
//   const gamma = round(params.gamma) ?? 1;
//   const hue = round(params.hue) ?? 0;
//   const blur = round(params.blur) ?? 0;
//   const sharpness = round(params.unsharp?.amount) ?? 0;
//   const color = params.colorBalance
//     ? {
//         r: round(params.colorBalance.r),
//         g: round(params.colorBalance.g),
//         b: round(params.colorBalance.b),
//       }
//     : {r: 0, g: 0, b: 0};

//   // Individual building blocks
//   const map: Record<string, string | null> = {
//     eq: `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}:gamma=${gamma}`,
//     hue: hue !== 0 ? `hue=h=${hue * 180}` : null,
//     colorBalance:
//       color.r || color.g || color.b
//         ? `colorbalance=rs=${color.r ?? 0}:gs=${color.g ?? 0}:bs=${color.b ?? 0}`
//         : null,
//     curves:
//       params.curves && params.curves.length
//         ? params.curves
//             .map(curve => {
//               const points = curve.points.map(p => `${p.x}/${p.y}`).join(' ');
//               return `${curve.channel ?? 'all'}='${points}'`;
//             })
//             .map(c => `curves=${c}`)
//             .join(',')
//         : null,
//     unsharp:
//       sharpness > 0 ? `unsharp=3:3:${sharpness.toFixed(2)}:3:3:0.0` : null,
//     blur: blur > 0 ? `gblur=sigma=${blur.toFixed(2)}` : null,
//   };

//   // Respect order if provided
//   if (order && Array.isArray(order) && order.length > 0) {
//     for (const key of order) {
//       const cmd = map[key];
//       if (cmd) cmds.push(cmd);
//     }
//   } else {
//     // fallback order
//     for (const key of ['curves', 'colorBalance', 'eq', 'unsharp', 'blur']) {
//       const cmd = map[key];
//       if (cmd) cmds.push(cmd);
//     }
//   }

//   return cmds.join(',');
// }
