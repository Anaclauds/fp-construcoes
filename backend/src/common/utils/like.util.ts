export function escaparLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
