/** Small tolerance so release on the trash icon counts (not the whole bottom band). */
export const TEXT_TRASH_HIT_PADDING_PX = 6;

export const isPointerOnTrashButton = (
  clientX: number,
  clientY: number,
  button: HTMLElement | null,
  paddingPx = TEXT_TRASH_HIT_PADDING_PX,
): boolean => {
  if (!button) return false;
  const rect = button.getBoundingClientRect();
  return (
    clientX >= rect.left - paddingPx &&
    clientX <= rect.right + paddingPx &&
    clientY >= rect.top - paddingPx &&
    clientY <= rect.bottom + paddingPx
  );
};
