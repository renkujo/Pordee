export const getSharePercent = (amount: number, total: number) => {
  if (amount <= 0 || total <= 0) return 0;
  return Math.min(100, Math.round((amount / total) * 100));
};
