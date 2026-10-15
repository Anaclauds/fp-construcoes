import { BadRequestException } from '@nestjs/common';
import {
  hojeNoFusoDoNegocio,
  parseDateOnly,
  somarMesesLimitandoDia,
} from './date.util';

describe('Datas do negocio', () => {
  it.each([
    '2026-02-30',
    '2026-02-29',
    '2026-04-31',
    '2026-10-14T00:00:00Z',
    '2026-2-01',
  ])('recusa %s', (value) => {
    expect(() => parseDateOnly(value)).toThrow(BadRequestException);
  });
  it('aceita dia bissexto', () => {
    expect(parseDateOnly('2028-02-29').toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });
  it('mantem o dia original nos parcelamentos', () => {
    const inicial = parseDateOnly('2027-01-31');
    expect(
      [0, 1, 2, 3].map((mes) =>
        somarMesesLimitandoDia(inicial, mes).toISOString().slice(0, 10),
      ),
    ).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
  });
  it('usa a data de Rondonia perto da meia-noite UTC', () => {
    expect(
      hojeNoFusoDoNegocio(new Date('2026-10-15T02:30:00Z'))
        .toISOString()
        .slice(0, 10),
    ).toBe('2026-10-14');
  });
});
