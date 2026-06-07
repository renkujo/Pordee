export const fmtNumber = (value: number): string => {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};
