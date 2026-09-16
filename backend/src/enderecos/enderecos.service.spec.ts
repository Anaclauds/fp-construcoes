import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EnderecosService } from './enderecos.service';

describe('EnderecosService', () => {
  const fetchOriginal = global.fetch;
  let service: EnderecosService;

  beforeEach(() => {
    service = new EnderecosService();
  });

  afterEach(() => {
    global.fetch = fetchOriginal;
    jest.restoreAllMocks();
  });

  it('normaliza o CEP e retorna o endereço encontrado', async () => {
    const response = {
      ok: true,
      json: jest.fn<() => Promise<Record<string, string>>>().mockResolvedValue({
        cep: '76900-058',
        logradouro: 'Avenida Marechal Rondon',
        bairro: 'Centro',
        localidade: 'Ji-Paraná',
        uf: 'RO',
      }),
    } as unknown as Response;
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(response);
    global.fetch = fetchMock as typeof fetch;

    await expect(service.buscarPorCep('76900-058')).resolves.toEqual({
      cep: '76900-058',
      logradouro: 'Avenida Marechal Rondon',
      bairro: 'Centro',
      cidade: 'Ji-Paraná',
      estado: 'RO',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const chamadas = fetchMock.mock.calls as unknown as Array<
      [string | URL | Request, RequestInit | undefined]
    >;
    const [url, options] = chamadas[0];
    expect(url).toBe('https://viacep.com.br/ws/76900058/json/');
    expect(options?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejeita CEP que não possui oito dígitos', async () => {
    await expect(service.buscarPorCep('7690')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('informa quando o CEP não foi encontrado', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ erro: true }),
    }) as typeof fetch;

    await expect(service.buscarPorCep('99999999')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('converte falhas externas em indisponibilidade do serviço', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('falha externa'));

    await expect(service.buscarPorCep('76900000')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('usa a BrasilAPI quando o ViaCEP está indisponível', async () => {
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('ViaCEP indisponível'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          cep: '76900058',
          street: 'Avenida Marechal Rondon',
          neighborhood: 'Centro',
          city: 'Ji-Paraná',
          state: 'RO',
        }),
      });
    global.fetch = fetchMock as typeof fetch;

    await expect(service.buscarPorCep('76900-058')).resolves.toEqual({
      cep: '76900-058',
      logradouro: 'Avenida Marechal Rondon',
      bairro: 'Centro',
      cidade: 'Ji-Paraná',
      estado: 'RO',
    });
    const chamadas = fetchMock.mock.calls as unknown as Array<
      [string | URL | Request, RequestInit | undefined]
    >;
    const segundaChamada = chamadas[1];
    expect(segundaChamada[0]).toBe(
      'https://brasilapi.com.br/api/cep/v1/76900058',
    );
    expect(segundaChamada[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
