export const chipButtonClassName =
  'pointer-events-auto mx-1.5 shrink-0 rounded-lg border px-4 py-2 shadow-sm transition-opacity duration-180 active:opacity-50';

export const chipButtonColors = (isSelected: boolean) => ({
  backgroundColor: isSelected
    ? 'rgba(255, 72, 0, 0.9)'
    : 'rgba(217, 217, 217, 0.9)',
  borderColor: isSelected ? 'rgba(255, 72, 0, 0.9)' : 'rgba(209 213 219,0.9)',
});

export const chipLabelColors = (isSelected: boolean) => ({
  color: isSelected ? '#ffffff' : 'rgba(0, 0, 0, 0.8)',
});
