export interface MonthRange {
  from: string;
  to: string;
}

export const getMonthRange = (date: Date = new Date()): MonthRange => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return { from: from.toISOString(), to: to.toISOString() };
};
