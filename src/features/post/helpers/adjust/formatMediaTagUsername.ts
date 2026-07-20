/**
 * Clip long usernames for AdjustMenu / media-tag pills.
 * Length ≥ 15 → first 12 characters + `...`.
 */
export function formatMediaTagUsername(
  username: string | null | undefined,
): string {
  if (!username) {
    return '';
  }
  if (username.length >= 15) {
    return `${username.slice(0, 12)}...`;
  }
  return username;
}
