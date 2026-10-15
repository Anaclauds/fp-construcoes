import { Prisma } from '@prisma/client';
import {
  validarEntradaEstoque,
  validarQuantidadeUnidade,
} from './quantidade.util';

describe('Quantidades e limite do estoque', () => {
  it('recusa fracao de unidade contavel mas aceita metro fracionado', () => {
    expect(() => validarQuantidadeUnidade('UN', 0.5)).toThrow(
      'quantidade inteira',
    );
    expect(() => validarQuantidadeUnidade('Metro Linear', 0.333)).not.toThrow();
    expect(() => validarQuantidadeUnidade('Peça', 2)).not.toThrow();
  });
  it('limita soma do saldo e informa quanto ainda pode entrar', () => {
    expect(() =>
      validarEntradaEstoque(
        1,
        new Prisma.Decimal('999999999'),
        new Prisma.Decimal(1),
      ),
    ).toThrow('limite permitido');
    expect(() =>
      validarEntradaEstoque(
        1,
        new Prisma.Decimal('999999999'),
        new Prisma.Decimal('0.999'),
      ),
    ).not.toThrow();
  });
});
