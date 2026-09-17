import { TipoCliente } from '@prisma/client';
import { EnderecosService } from '../enderecos/enderecos.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClientesService } from './clientes.service';

describe('ClientesService', () => {
  it('preenche o endereço pelo CEP antes de cadastrar uma pessoa física', async () => {
    const findFirst = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const create = jest
      .fn<(args: unknown) => Promise<{ id: number }>>()
      .mockResolvedValue({ id: 1 });
    const prisma = {
      cliente: {
        findFirst,
        create,
      },
    } as unknown as PrismaService;
    const buscarPorCep = jest
      .fn<(cep: string) => Promise<Record<string, string>>>()
      .mockResolvedValue({
        cep: '76900-058',
        logradouro: 'Avenida Marechal Rondon',
        bairro: 'Centro',
        cidade: 'Ji-Paraná',
        estado: 'RO',
      });
    const enderecosService = {
      buscarPorCep,
    } as unknown as EnderecosService;
    const service = new ClientesService(prisma, enderecosService);

    await service.create({
      nome: 'Cliente Demonstração',
      telefone: '(69) 98127-3645',
      tipo: TipoCliente.PF,
      cpfCnpj: '529.982.247-25',
      dataNascimento: '1995-08-20',
      sexo: 'Masculino',
      cep: '76900-058',
      numero: '100',
    });

    expect(buscarPorCep).toHaveBeenCalledWith('76900-058');
    const chamadas = create.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    const chamada = chamadas[0][0];
    expect(chamada.data).toMatchObject({
      cep: '76900058',
      rua: 'Avenida Marechal Rondon',
      bairro: 'Centro',
      cidade: 'Ji-Paraná',
      estado: 'RO',
      cadastroCompleto: true,
    });
  });
});
