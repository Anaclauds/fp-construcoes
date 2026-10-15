import { Transform } from 'class-transformer';

export function AparaTexto(): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}

export function VazioComoNulo(): PropertyDecorator {
  return Transform(
    ({
      value,
      obj,
      key,
    }: {
      value: unknown;
      obj: Record<string, unknown>;
      key: string;
    }) => (obj[key] === '' ? null : value),
  );
}
