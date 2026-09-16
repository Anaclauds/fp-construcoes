import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EnderecoCepDto } from './dto/endereco-cep.dto';

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

type BrasilApiResponse = {
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
};

@Injectable()
export class EnderecosService {
  private readonly viaCepBaseUrl = 'https://viacep.com.br/ws';
  private readonly brasilApiBaseUrl = 'https://brasilapi.com.br/api/cep/v1';
  private readonly timeoutMs = 3_000;

  async buscarPorCep(cepInformado: string): Promise<EnderecoCepDto> {
    const cep = this.somenteDigitos(cepInformado);

    if (cep.length !== 8) {
      throw new BadRequestException('CEP deve conter exatamente 8 dígitos');
    }

    let erroViaCep: unknown;
    try {
      return await this.buscarNoViaCep(cep);
    } catch (error) {
      erroViaCep = error;
    }

    try {
      return await this.buscarNaBrasilApi(cep);
    } catch (erroBrasilApi) {
      if (
        erroViaCep instanceof NotFoundException ||
        erroBrasilApi instanceof NotFoundException
      ) {
        throw new NotFoundException('CEP não encontrado');
      }

      throw new ServiceUnavailableException(
        'Não foi possível consultar o CEP neste momento. Os serviços públicos estão indisponíveis',
      );
    }
  }

  private async buscarNoViaCep(cep: string): Promise<EnderecoCepDto> {
    const response = await this.fetchComTimeout(
      `${this.viaCepBaseUrl}/${cep}/json/`,
    );

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        throw new NotFoundException('CEP não encontrado');
      }

      throw new Error(`ViaCEP respondeu com status ${response.status}`);
    }

    const dados = (await response.json()) as ViaCepResponse;

    if (dados.erro === true || dados.erro === 'true' || !dados.cep) {
      throw new NotFoundException('CEP não encontrado');
    }

    return {
      cep: this.formatarCep(dados.cep),
      logradouro: dados.logradouro?.trim() ?? '',
      bairro: dados.bairro?.trim() ?? '',
      cidade: dados.localidade?.trim() ?? '',
      estado: dados.uf?.trim().toUpperCase() ?? '',
    };
  }

  private async buscarNaBrasilApi(cep: string): Promise<EnderecoCepDto> {
    const response = await this.fetchComTimeout(
      `${this.brasilApiBaseUrl}/${cep}`,
    );

    if (!response.ok) {
      if (response.status === 400 || response.status === 404) {
        throw new NotFoundException('CEP não encontrado');
      }

      throw new Error(`BrasilAPI respondeu com status ${response.status}`);
    }

    const dados = (await response.json()) as BrasilApiResponse;

    if (!dados.cep) {
      throw new NotFoundException('CEP não encontrado');
    }

    return {
      cep: this.formatarCep(dados.cep),
      logradouro: dados.street?.trim() ?? '',
      bairro: dados.neighborhood?.trim() ?? '',
      cidade: dados.city?.trim() ?? '',
      estado: dados.state?.trim().toUpperCase() ?? '',
    };
  }

  private async fetchComTimeout(url: string) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      return await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: abortController.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private somenteDigitos(valor: string) {
    return valor.replace(/\D/g, '');
  }

  private formatarCep(valor: string) {
    const cep = this.somenteDigitos(valor);
    return `${cep.slice(0, 5)}-${cep.slice(5)}`;
  }
}
