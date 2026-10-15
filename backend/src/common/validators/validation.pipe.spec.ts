import { erroValidacao } from './validation.pipe';
import { ValidationError } from 'class-validator';

describe('Erros de validacao', () => {
  it('identifica campos aninhados sem expor valores enviados', () => {
    const error = erroValidacao([
      {
        property: 'materiais',
        children: [
          {
            property: '0',
            children: [
              {
                property: 'quantidade',
                constraints: { isNumber: 'quantidade must be a number' },
              },
            ],
          },
        ],
      },
    ] as ValidationError[]);
    expect(error.getResponse()).toMatchObject({
      codigo: 'VALIDACAO',
      erros: [
        {
          campo: 'materiais.0.quantidade',
          mensagem:
            'Informe um numero valido com as casas decimais permitidas.',
        },
      ],
    });
  });
  it('preserva deteccao de campos extras do front antigo', () => {
    expect(
      erroValidacao([
        {
          property: 'extra',
          constraints: {
            whitelistValidation: 'property extra should not exist',
          },
        },
      ]).getResponse(),
    ).toMatchObject({
      codigo: 'CAMPO_NAO_ACEITO',
      message: ['property extra should not exist'],
      erros: [
        { campo: 'extra', mensagem: 'Este campo nao e aceito nesta operacao.' },
      ],
    });
  });
  it('preserva validador em portugues e traduz regra desconhecida', () => {
    expect(
      erroValidacao([
        {
          property: 'cpf',
          constraints: { cpf: 'CPF invalido', outro: 'cpf must be valid' },
        },
      ]).getResponse(),
    ).toMatchObject({
      erros: [
        { campo: 'cpf', mensagem: 'CPF invalido' },
        { campo: 'cpf', mensagem: 'O valor informado nao e valido.' },
      ],
    });
  });
});
