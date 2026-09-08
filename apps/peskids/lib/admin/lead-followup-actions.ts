/** Return an ISO calendar date one month after the supplied local date. */
export function dateOneMonthFrom(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = Math.min(date.getDate(), new Date(year, month + 1, 0).getDate());
  const target = new Date(year, month, day);

  return [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(target.getDate()).padStart(2, '0'),
  ].join('-');
}
