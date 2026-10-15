import { registerDecorator, ValidationOptions } from 'class-validator';
import { cpf, cnpj } from 'cpf-cnpj-validator';

type Formato = 'cpf' | 'cnpj' | 'documento' | 'telefone' | 'cep' | 'uf';

export function formatoCadastroValido(
  valor: unknown,
  formato: Formato,
): boolean {
  if (typeof valor !== 'string') return false;
  if (formato === 'cpf') return cpf.isValid(valor, true);
  if (formato === 'cnpj')
    return /^[\d./-]+$/.test(valor) && cnpj.isValid(valor, true);
  if (formato === 'documento')
    return (
      cpf.isValid(valor, true) ||
      (/^[\d./-]+$/.test(valor) && cnpj.isValid(valor, true))
    );
  if (formato === 'cep') return /^\d{5}-?\d{3}$/.test(valor);
  if (formato === 'uf')
    return Object.hasOwn(cpf.FISCAL_REGION_BY_UF, valor.toUpperCase());
  if (!/^[\d() +.-]+$/.test(valor)) return false;
  const digitos = valor.replace(/\D/g, '');
  return /^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(digitos);
}

export function IsCadastro(formato: Formato, options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isCadastro',
      target: object.constructor,
      propertyName,
      options: { message: `${propertyName}: ${formato} invalido`, ...options },
      validator: {
        validate: (valor: unknown) => formatoCadastroValido(valor, formato),
      },
    });
}
