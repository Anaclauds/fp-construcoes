import { parseCorsOrigins } from './cors-origins.util';

describe('parseCorsOrigins', () => {
  it('allows local development by default, not arbitrary origins', () => {
    expect(parseCorsOrigins(undefined)).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]);
    expect(parseCorsOrigins('  ')).toEqual(parseCorsOrigins(undefined));
  });

  it('normalizes and deduplicates configured origins', () => {
    expect(
      parseCorsOrigins(
        ' https://fp-construcoes.vercel.app/,https://fp-construcoes.vercel.app,http://localhost:5173',
      ),
    ).toEqual(['https://fp-construcoes.vercel.app', 'http://localhost:5173']);
  });

  it.each([
    '*',
    'https://example.com/path',
    'https://example.com?x=1',
    'https://example.com#x',
    'https://user:password@example.com',
    'ftp://example.com',
    'https://example.com,',
  ])('rejects invalid origin %s', (value) => {
    expect(() => parseCorsOrigins(value)).toThrow();
  });
});
