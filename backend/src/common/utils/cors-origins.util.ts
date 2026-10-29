export function parseCorsOrigins(value: string | undefined): string[] {
  const origins = value?.trim()
    ? value.split(',').map((origin) => origin.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  return [
    ...new Set(
      origins.map((origin) => {
        const url = new URL(origin);
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.search ||
          url.hash ||
          url.pathname !== '/'
        ) {
          throw new Error('CORS_ORIGINS must contain only HTTP(S) origins');
        }
        return url.origin;
      }),
    ),
  ];
}
