import { formatoCadastroValido } from './cadastro.validator';

describe('Formatos dos cadastros', () => {
  it.each(['52998224725', '529.982.247-25'])(
    'aceita CPF valido %s',
    (valor) => {
      expect(formatoCadastroValido(valor, 'cpf')).toBe(true);
    },
  );
  it.each(['00000000000', '52998224724', 'abc52998224725'])(
    'rejeita CPF invalido %s',
    (valor) => {
      expect(formatoCadastroValido(valor, 'cpf')).toBe(false);
    },
  );
  it('verifica os digitos do CNPJ', () => {
    expect(formatoCadastroValido('54.550.752/0001-55', 'cnpj')).toBe(true);
    expect(formatoCadastroValido('54.550.752/0001-54', 'cnpj')).toBe(false);
  });
  it('aceita formatos com e sem mascara nos contatos', () => {
    expect(formatoCadastroValido('(69) 99612-4387', 'telefone')).toBe(true);
    expect(formatoCadastroValido('6934211234', 'telefone')).toBe(true);
    expect(formatoCadastroValido('telefone 69996124387', 'telefone')).toBe(
      false,
    );
    expect(formatoCadastroValido('123', 'telefone')).toBe(false);
  });
  it('valida CEP e UF', () => {
    expect(formatoCadastroValido('76920-000', 'cep')).toBe(true);
    expect(formatoCadastroValido('123', 'cep')).toBe(false);
    expect(formatoCadastroValido('ro', 'uf')).toBe(true);
    expect(formatoCadastroValido('ZZ', 'uf')).toBe(false);
  });
});
