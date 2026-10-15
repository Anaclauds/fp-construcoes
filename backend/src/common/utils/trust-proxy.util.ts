export function parseTrustProxy(value?: string): false | number | string[] {
  if (!value || value === 'false' || value === '0') return false;
  if (value === 'true')
    throw new Error(
      'TRUST_PROXY=true nao e permitido. Informe saltos ou sub-redes confiaveis',
    );
  if (/^\d+$/.test(value)) return Number(value);
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
