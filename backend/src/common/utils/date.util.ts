import { BadRequestException } from '@nestjs/common';

export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException({
      codigo: 'UTILS_PARSEDATEONLY_BADREQUEST_01',
      message: 'Informe uma data valida no formato AAAA-MM-DD',
    });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException({
      codigo: 'UTILS_PARSEDATEONLY_BADREQUEST_02',
      message: 'Informe uma data valida no formato AAAA-MM-DD',
    });
  }
  return date;
}

export function hojeNoFusoDoNegocio(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.APP_TIMEZONE || 'America/Porto_Velho',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)!.value;
  return parseDateOnly(`${part('year')}-${part('month')}-${part('day')}`);
}

export function somarMesesLimitandoDia(value: Date, months: number): Date {
  const last = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months + 1, 0),
  );
  return new Date(
    Date.UTC(
      last.getUTCFullYear(),
      last.getUTCMonth(),
      Math.min(value.getUTCDate(), last.getUTCDate()),
    ),
  );
}
