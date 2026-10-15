import { BadRequestException } from '@nestjs/common';
import { Prisma, StatusCobranca } from '@prisma/client';
import { parseDateOnly } from '../common/utils/date.util';
import { escaparLike } from '../common/utils/like.util';
import { ListCobrancasQueryDto } from './dto/list-cobrancas-query.dto';

export interface ResumoSql {
  projetoId: number;
  numero: string;
  titulo: string;
  tipo: string;
  clienteId: number;
  clienteNome: string;
  quantidadeCobrancas: bigint;
  valorTotal: Prisma.Decimal;
  valorRecebido: Prisma.Decimal;
  status: StatusCobranca;
}

// Agrega recebimentos antes de unir cobrancas para nao multiplicar seus totais.
export function resumosSql(query: ListCobrancasQueryDto) {
  if (query.dataInicio && query.dataFim && query.dataInicio > query.dataFim)
    throw new BadRequestException({
      codigo: 'PERIODO_INVALIDO',
      message: 'A data inicial nao pode ser posterior a data final',
    });
  const filtros: Prisma.Sql[] = [Prisma.sql`1=1`];
  if (query.dataInicio)
    filtros.push(Prisma.sql`c.criada_em >= ${parseDateOnly(query.dataInicio)}`);
  if (query.dataFim) {
    const fim = parseDateOnly(query.dataFim);
    fim.setUTCDate(fim.getUTCDate() + 1);
    filtros.push(Prisma.sql`c.criada_em < ${fim}`);
  }
  if (query.clienteId)
    filtros.push(Prisma.sql`o.cliente_id = ${query.clienteId}`);
  if (query.tipo) filtros.push(Prisma.sql`o.tipo = ${query.tipo}`);
  if (query.busca)
    filtros.push(
      Prisma.sql`(o.titulo LIKE ${`%${escaparLike(query.busca)}%`} OR o.numero LIKE ${`%${escaparLike(query.busca.replace('#', ''))}%`} OR cl.nome LIKE ${`%${escaparLike(query.busca)}%`})`,
    );
  return Prisma.sql`WITH pagamentos AS (
    SELECT p.cobranca_id, SUM(r.valor) recebido FROM parcela p
    JOIN recebimento r ON r.parcela_id = p.id GROUP BY p.cobranca_id
  ), resumos AS (
    SELECT pr.id projetoId, o.numero, o.titulo, o.tipo, cl.id clienteId, cl.nome clienteNome,
      SUM(CASE WHEN c.status <> 'CANCELADO' THEN 1 ELSE 0 END) quantidadeCobrancas,
      SUM(CASE WHEN c.status <> 'CANCELADO' THEN c.valor_total ELSE 0 END) valorTotal,
      SUM(CASE WHEN c.status <> 'CANCELADO' THEN COALESCE(pg.recebido,0) ELSE 0 END) valorRecebido
    FROM projeto pr JOIN orcamento o ON o.id = pr.orcamento_id
    JOIN cliente cl ON cl.id = o.cliente_id JOIN cobranca c ON c.projeto_id = pr.id
    LEFT JOIN pagamentos pg ON pg.cobranca_id = c.id
    WHERE ${Prisma.join(filtros, ' AND ')}
    GROUP BY pr.id, o.numero, o.titulo, o.tipo, cl.id, cl.nome
  ), classificados AS (
    SELECT *, CASE WHEN valorTotal > 0 AND valorRecebido = valorTotal THEN 'PAGO'
      WHEN valorRecebido > 0 THEN 'PARCIAL' ELSE 'EM_ABERTO' END status FROM resumos
  )`;
}

export function mapearResumo(item: ResumoSql) {
  return {
    projetoId: item.projetoId,
    numero: item.numero,
    titulo: item.titulo,
    tipo: item.tipo,
    cliente: { id: item.clienteId, nome: item.clienteNome },
    quantidadeCobrancas: Number(item.quantidadeCobrancas),
    valorTotal: Number(item.valorTotal),
    valorRecebido: Number(item.valorRecebido),
    valorRestante: Number(
      new Prisma.Decimal(item.valorTotal).minus(item.valorRecebido),
    ),
    status: item.status,
  };
}
