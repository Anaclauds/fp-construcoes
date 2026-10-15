import {
  BadRequestException,
  Injectable,
  ValidationPipe,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';

const regras: Record<string, string> = {
  isNotEmpty: 'Informe este campo.',
  isString: 'Informe um texto.',
  isInt: 'Informe um numero inteiro.',
  isNumber: 'Informe um numero valido com as casas decimais permitidas.',
  isBoolean: 'Informe verdadeiro ou falso.',
  isEnum: 'Selecione uma opcao permitida.',
  isIn: 'Selecione uma opcao permitida.',
  isEmail: 'Informe um email valido.',
  matches: 'O formato informado nao e valido.',
  min: 'O valor esta abaixo do minimo permitido.',
  max: 'O valor ultrapassa o maximo permitido.',
  minLength: 'O texto e menor que o tamanho minimo permitido.',
  maxLength: 'O texto ultrapassa o tamanho maximo permitido.',
  isLength: 'O tamanho informado nao e permitido.',
  isArray: 'Informe uma lista.',
  arrayMinSize: 'A lista possui menos itens que o minimo permitido.',
  arrayMaxSize: 'A lista ultrapassa o maximo de itens permitido.',
  arrayUnique: 'A lista nao pode conter itens repetidos.',
  nestedValidation: 'Informe um objeto valido.',
  whitelistValidation: 'Este campo nao e aceito nesta operacao.',
};

export function erroValidacao(errors: ValidationError[]) {
  const erros: Array<{ campo: string; mensagem: string }> = [];
  const camposExtras: string[] = [];
  function visitar(items: ValidationError[], prefixo = '') {
    for (const item of items) {
      const campo = prefixo ? `${prefixo}.${item.property}` : item.property;
      for (const [regra, mensagem] of Object.entries(item.constraints ?? {})) {
        const texto =
          regras[regra] ??
          (/\b(must|should)\b/.test(mensagem)
            ? 'O valor informado nao e valido.'
            : mensagem);
        erros.push({ campo, mensagem: texto });
        if (regra === 'whitelistValidation') camposExtras.push(campo);
      }
      visitar(item.children ?? [], campo);
    }
  }
  visitar(errors);
  return new BadRequestException({
    codigo: camposExtras.length ? 'CAMPO_NAO_ACEITO' : 'VALIDACAO',
    // Preserva o marcador usado pelo front antigo para detectar campos extras.
    message: camposExtras.length
      ? camposExtras.map((campo) => `property ${campo} should not exist`)
      : 'Verifique os campos destacados.',
    erros,
  });
}

@Injectable()
export class DadosValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: erroValidacao,
    });
  }
}
