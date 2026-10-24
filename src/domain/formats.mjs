export function utcDateTime(value) {
  const parsed = new Date(value);
  return /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(+parsed) && parsed.toISOString().slice(0, 19) === value.slice(0, 19);
}
