export function currentIso() {
  return new Date().toISOString();
}

export function asInputDate(value: string | null) {
  return value?.slice(0, 10) ?? '';
}

export function nullableDate(value: string) {
  return value || null;
}
