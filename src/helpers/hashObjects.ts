import CryptoJS from 'crypto-js';

/**
 * Create a stable SHA256 hash from an object.
 * Ensures consistent key order so two equivalent objects hash the same.
 */
export function hashObject(obj: any): string {
  // Sort keys to make serialization stable
  const stableStringify = (value: any): string => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return (
        '{' +
        Object.keys(value)
          .sort()
          .map(key => `"${key}":${stableStringify(value[key])}`)
          .join(',') +
        '}'
      );
    }
    if (Array.isArray(value)) {
      return '[' + value.map(v => stableStringify(v)).join(',') + ']';
    }
    return JSON.stringify(value);
  };

  const str = stableStringify(obj);
  return CryptoJS.SHA256(str).toString();
}
