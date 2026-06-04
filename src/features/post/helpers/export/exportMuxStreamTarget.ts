import {AppendOnlyStreamTarget} from 'mediabunny';

export type MuxChunkHandler = (
  data: Uint8Array,
  done: boolean,
) => void | Promise<void>;

/** Buffers monotonic mux bytes and flushes fixed-size chunks to RN. */
export const createAppendOnlyMuxTarget = (
  onChunk: MuxChunkHandler,
  chunkSizeBytes: number,
): AppendOnlyStreamTarget => {
  let pending = new Uint8Array(0);

  const flush = async (bytes: Uint8Array, done: boolean) => {
    if (bytes.length > 0 || done) {
      await onChunk(bytes, done);
    }
  };

  const writable = new WritableStream<Uint8Array>({
    write: async chunk => {
      const merged = new Uint8Array(pending.length + chunk.length);
      merged.set(pending);
      merged.set(chunk, pending.length);
      pending = merged;

      while (pending.length >= chunkSizeBytes) {
        const part = pending.slice(0, chunkSizeBytes);
        pending = pending.slice(chunkSizeBytes);
        await flush(part, false);
      }
    },
    close: async () => {
      await flush(pending, true);
      pending = new Uint8Array(0);
    },
  });

  return new AppendOnlyStreamTarget(writable);
};
