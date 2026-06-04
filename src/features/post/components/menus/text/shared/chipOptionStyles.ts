export const chipButtonClassName =
  'pointer-events-auto mx-1.5 shrink-0 rounded-lg border px-4 py-2 shadow-sm transition-opacity duration-180 active:opacity-50';

export const chipButtonColors = (isSelected: boolean) => ({
  backgroundColor: isSelected ? '#ff4800' : 'rgba(217, 217, 217, 1)',
  borderColor: isSelected ? '#ff4800' : 'rgba(209 213 219,1)',
});

export const chipLabelColors = (isSelected: boolean) => ({
  color: isSelected ? '#ffffff' : 'rgba(0, 0, 0, 1)',
});
