const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

async function testar({
  page,
  prisma,
  prefix,
  funcionarioId,
  materialId,
  competenciaIso,
  reiniciarBackend,
  errosEsperados,
}) {
  const provas = [];
  const pasta = path.resolve('coverage', 'persistencia-visual');
  await fs.mkdir(pasta, { recursive: true });
  const data = `10/${competenciaIso.slice(5)}/${competenciaIso.slice(0, 4)}`;
  const ir = async (rota) => {
    await page.goto(`http://127.0.0.1:5174${rota}`);
    await page.waitForLoadState('networkidle');
  };
  const dialogo = () => page.getByRole('dialog').last();
  const gravar = async (rota, metodo, clicar) => {
    const espera = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === `/api${rota}` &&
        r.request().method() === metodo,
    );
    await clicar();
    const resposta = await espera;
    assert.ok(
      resposta.ok(),
      `${metodo} ${rota}: ${resposta.status()} ${await resposta.text()}`,
    );
    return resposta.json();
  };
  const prova = async (nome, registros, texto) => {
    await page.reload();
    await page.waitForLoadState('networkidle');
    if (texto) await page.getByText(texto, { exact: false }).first().waitFor();
    const item = { nome, registros, telaRecarregada: true };
    provas.push(item);
    console.log(`PERSISTENCIA OK: ${nome}`);
    await page.screenshot({
      path: path.join(pasta, `${String(provas.length).padStart(2, '0')}.png`),
      fullPage: true,
    });
    await fs.writeFile(
      path.join(pasta, 'resultado.json'),
      JSON.stringify({ completo: false, provas }, null, 2),
    );
  };
  const escolher = async (campo, texto) => {
    await campo.fill(texto);
    await page.getByRole('option').filter({ hasText: texto }).first().click();
  };
  const cliente = await prisma.cliente.findFirstOrThrow({
    where: { nome: `Cliente ${prefix}` },
  });
  await ir('/clientes');
  await prova(
    'Cliente cadastrado pela tela e lido do MySQL',
    { clienteId: cliente.id, cpf: cliente.cpf },
    cliente.nome,
  );
  const linhaCliente = page.getByRole('row').filter({ hasText: cliente.nome });
  await linhaCliente.getByRole('button', { name: /^Editar/ }).click();
  await dialogo()
    .getByLabel(/^Apelido:/)
    .fill(`Editado ${prefix}`);
  await gravar(`/clientes/${cliente.id}`, 'PATCH', () =>
    dialogo()
      .getByRole('button', { name: /Salvar/ })
      .click(),
  );
  const clienteEditado = await prisma.cliente.findUniqueOrThrow({
    where: { id: cliente.id },
  });
  assert.equal(clienteEditado.apelido, `Editado ${prefix}`);
  await prova(
    'Edicao de cliente persistida',
    { clienteId: cliente.id, apelido: clienteEditado.apelido },
    cliente.nome,
  );

  await ir('/fornecedores/novo');
  const nomeFornecedor = `Fornecedor ${prefix}`;
  await page.getByLabel(/^Razão Social:/).fill(nomeFornecedor);
  await page.getByLabel(/^Nome Fantasia:/).fill(nomeFornecedor);
  await page.getByLabel(/^CNPJ:/).fill('11222333000181');
  await page.getByLabel(/^Contato:/).fill('69999998888');
  await page.getByLabel(/^Responsável:/).fill('Responsavel Teste');
  const cargo = page.getByLabel(/^Cargo do Responsável:/);
  if (await cargo.evaluate((e) => e.tagName === 'SELECT'))
    await cargo.selectOption({ index: 1 });
  else await cargo.fill('Gerente');
  await page.getByLabel(/^CEP:/).fill('76920000');
  await page.getByLabel(/^Estado:/).selectOption('RO');
  const cidade = page.getByLabel(/^Cidade:/);
  if (await cidade.evaluate((e) => e.tagName === 'SELECT'))
    await cidade.selectOption({ label: 'Ouro Preto do Oeste' });
  else await cidade.fill('Ouro Preto do Oeste');
  await page.getByLabel(/^Rua:/).fill('Rua de Teste');
  await page.getByLabel(/^Número:/).fill('100');
  await page.getByLabel(/^Bairro:/).fill('Centro');
  const fornecedorResposta = await gravar('/fornecedores', 'POST', () =>
    page.getByRole('button', { name: 'Salvar', exact: true }).click(),
  );
  const fornecedor = await prisma.fornecedor.findUniqueOrThrow({
    where: { id: fornecedorResposta.id },
  });
  assert.equal(fornecedor.razaoSocial, nomeFornecedor);
  await prova(
    'Fornecedor criado pela interface',
    { fornecedorId: fornecedor.id },
    nomeFornecedor,
  );

  await ir('/equipamentos/novo');
  const nomeEquipamento = `Equipamento ${prefix}`;
  await page.getByLabel(/^Nome do Equipamento:/).fill(nomeEquipamento);
  await page.getByLabel(/^Tipo de Equipamento:/).selectOption({ index: 1 });
  await page.getByLabel(/^Marca:/).fill('Marca de Teste');
  await page.getByLabel(/^Modelo:/).fill('Modelo de Teste');
  await page.getByLabel(/^Data de Aquisição:/).fill(data);
  await page.getByLabel(/^Valor de Aquisição/).fill('15000');
  await escolher(page.getByLabel(/^Fornecedor:/), nomeFornecedor);
  const equipamentoSalvo = await gravar('/equipamentos', 'POST', () =>
    page.getByRole('button', { name: 'Salvar', exact: true }).click(),
  );
  const equipamento = await prisma.equipamento.findUniqueOrThrow({
    where: { id: equipamentoSalvo.id },
  });
  assert.equal(equipamento.fornecedorId, fornecedor.id);
  assert.equal(Number(equipamento.valorAquisicao), 150);
  await prova(
    'Equipamento e vinculo ao fornecedor persistidos',
    { equipamentoId: equipamento.id, fornecedorId: fornecedor.id },
    nomeEquipamento,
  );

  await ir('/funcionarios/novo');
  const nomeFuncionario = `Funcionario ${prefix}`;
  const documentoFuncionario = require('cpf-cnpj-validator').cpf.generate();
  await page.getByLabel(/^Nome completo:/).fill(nomeFuncionario);
  await page.getByLabel(/^CPF:/).fill(documentoFuncionario);
  await page.getByLabel(/^Data de Nascimento:/).fill('01/01/1990');
  await page.getByLabel(/^Sexo:/).selectOption({ index: 1 });
  await page.getByLabel(/^Celular:/).fill('69999998888');
  await page.getByLabel(/^CEP:/).fill('76920000');
  await page.getByLabel(/^Estado:/).selectOption('RO');
  const cidadeFuncionario = page.getByLabel(/^Cidade:/);
  if (await cidadeFuncionario.evaluate((e) => e.tagName === 'SELECT'))
    await cidadeFuncionario.selectOption({ label: 'Ouro Preto do Oeste' });
  else await cidadeFuncionario.fill('Ouro Preto do Oeste');
  await page.getByLabel(/^Rua:/).fill('Rua Teste');
  await page.getByLabel(/^Número:/).fill('100');
  await page.getByLabel(/^Bairro:/).fill('Centro');
  for (const rotulo of [
    /^Função:/,
    /^Setor de atuação:/,
    /^Tipo de contrato:/,
    /^Grau de vínculo:/,
  ])
    await page.getByLabel(rotulo).selectOption({ index: 1 });
  await page.getByLabel(/^Salário:/).fill('200000');
  await page.getByLabel(/^Data de contratação:/).fill('01/01/2026');
  await page.getByLabel(/^Contato de emergência:/).fill('69999997777');
  await page.getByLabel(/^Nome do contato:/).fill('Contato Teste');
  const funcionarioSalvo = await gravar('/funcionarios', 'POST', () =>
    page.getByRole('button', { name: 'Salvar', exact: true }).click(),
  );
  const funcionarioNovo = await prisma.funcionario.findUniqueOrThrow({
    where: { id: funcionarioSalvo.id },
  });
  assert.equal(funcionarioNovo.cpf, documentoFuncionario);
  assert.equal(Number(funcionarioNovo.salario), 2000);
  await prova(
    'Funcionario cadastrado pela tela e persistido',
    { funcionarioId: funcionarioNovo.id, salario: 2000 },
    nomeFuncionario,
  );
  await ir('/usuarios/novo');
  await page
    .getByLabel(/^Funcionário/)
    .selectOption(String(funcionarioNovo.id));
  await page.getByLabel(/^Senha inicial:/).fill('TesteVisual123!');
  await page.getByLabel(/^Confirme a senha:/).fill('TesteVisual123!');
  const usuarioSalvo = await gravar('/usuarios', 'POST', () =>
    page.getByRole('button', { name: 'Salvar', exact: true }).click(),
  );
  const usuarioNovo = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuarioSalvo.id },
  });
  assert.equal(usuarioNovo.funcionarioId, funcionarioNovo.id);
  assert.equal(usuarioNovo.login, documentoFuncionario);
  assert.ok(
    await require('bcrypt').compare('TesteVisual123!', usuarioNovo.senhaHash),
  );
  await prova(
    'Usuario vinculado ao funcionario com senha em hash',
    {
      usuarioId: usuarioNovo.id,
      funcionarioId: funcionarioNovo.id,
      hashConferido: true,
    },
    nomeFuncionario,
  );
  await ir(`/frequencia/editar?data=${competenciaIso}-10`);
  const presencas = page.getByRole('button', { name: 'Presente', exact: true });
  for (let i = 0; i < (await presencas.count()); i++)
    await presencas.nth(i).click();
  await gravar('/frequencias', 'POST', () =>
    page
      .getByRole('button', { name: 'Salvar Frequência', exact: true })
      .click(),
  );
  const frequencia = await prisma.frequencia.findFirstOrThrow({
    where: {
      funcionarioId: funcionarioNovo.id,
      data: new Date(`${competenciaIso}-10T00:00:00Z`),
    },
  });
  assert.equal(frequencia.status, 'PRESENTE');
  await prova(
    'Frequencia salva pela interface',
    {
      frequenciaId: frequencia.id,
      funcionarioId: funcionarioNovo.id,
      status: frequencia.status,
    },
    nomeFuncionario,
  );

  const servicos = {};
  for (const tipo of ['SERRALHERIA', 'CALHAS', 'CONSTRUCAO_CIVIL']) {
    await ir('/servicos/novo');
    const nome = `Servico ${tipo} ${prefix}`;
    await page.getByLabel(/^Nome do Serviço:/).fill(nome);
    await page.getByLabel(/^Categoria:/).selectOption(tipo);
    await page.getByLabel(/^Valor Unitário/).fill('10000');
    await page.getByLabel(/^Unidade de Medida:/).selectOption({ index: 1 });
    const salvo = await gravar('/servicos', 'POST', () =>
      page.getByRole('button', { name: 'Salvar', exact: true }).click(),
    );
    const registro = await prisma.servico.findUniqueOrThrow({
      where: { id: salvo.id },
    });
    assert.equal(Number(registro.valorReferencia), 100);
    assert.equal(registro.categoria, tipo);
    servicos[tipo] = registro;
    await prova(
      `Servico ${tipo} criado pela interface`,
      { servicoId: registro.id, valor: 100 },
      nome,
    );
  }

  await ir('/estoque');
  const estoque = await prisma.estoqueMaterial.findUniqueOrThrow({
    where: { materialId },
  });
  assert.equal(Number(estoque.quantidadeAtual), 3.5);
  await prova(
    'Material e saldo inicial persistidos',
    { materialId, saldo: 3.5 },
    `Material ${prefix}`,
  );

  const projetos = [];
  for (const tipo of ['SERRALHERIA', 'CALHAS', 'CONSTRUCAO_CIVIL']) {
    const titulo = `Orcamento ${tipo} ${prefix}`;
    await ir('/orcamentos/novo');
    await page.getByLabel(/^Nome do Orçamento:/).fill(titulo);
    await page.getByLabel(/^Tipo:/).selectOption(tipo);
    await escolher(page.getByLabel(/^Nome:/), cliente.nome);
    await page
      .getByRole('button', { name: 'Adicionar Material', exact: true })
      .click();
    const linhaMaterial = page.getByRole('group', {
      name: 'Material 1',
      exact: true,
    });
    await escolher(
      linhaMaterial.getByLabel(/^Material:/),
      `Material ${prefix}`,
    );
    await linhaMaterial.getByLabel(/^Quantidade:/).fill('0,5');
    await page
      .getByRole('button', { name: 'Adicionar Serviço', exact: true })
      .click();
    const linha = page.getByRole('group', { name: 'Serviço 1', exact: true });
    await linha.getByLabel(/^Serviço:/).selectOption(String(servicos[tipo].id));
    await linha.getByLabel(/^Quantidade:/).fill('2');
    await page.getByLabel(/^Prazo estimado/).fill('15');
    const resposta = await gravar('/orcamentos', 'POST', () =>
      page.getByRole('button', { name: /Salvar/, exact: false }).click(),
    );
    const orcamento = await prisma.orcamento.findUniqueOrThrow({
      where: { id: resposta.id },
    });
    assert.equal(Number(orcamento.valorTotal), 206.25);
    assert.equal(orcamento.clienteId, cliente.id);
    await prova(
      `Orcamento ${tipo}: itens, cliente e valor salvos`,
      { orcamentoId: orcamento.id, valorTotal: 206.25 },
      titulo,
    );
    await page
      .getByRole('row')
      .filter({ hasText: titulo })
      .getByRole('button', { name: /^Aprovar/ })
      .click();
    await dialogo()
      .getByLabel(/^Responsável:/)
      .selectOption(String(funcionarioId));
    await dialogo()
      .getByLabel(/^Previsão de início:/)
      .fill(data);
    await dialogo()
      .getByLabel(/^Previsão de término:/)
      .fill(data);
    await gravar(`/orcamentos/${orcamento.id}/aprovar`, 'PATCH', () =>
      dialogo()
        .getByRole('button', { name: 'Confirmar Aprovação', exact: true })
        .click(),
    );
    const projeto = await prisma.projeto.findUniqueOrThrow({
      where: { orcamentoId: orcamento.id },
    });
    projetos.push(projeto);
    await ir('/projetos');
    await prova(
      `Aprovacao ${tipo} criou projeto relacionado`,
      { projetoId: projeto.id, orcamentoId: orcamento.id },
      titulo,
    );
    await page
      .getByRole('row')
      .filter({ hasText: titulo })
      .getByRole('button', { name: /^Iniciar/ })
      .click();
    await dialogo()
      .getByLabel(/^Data de Início da Obra/)
      .fill(data);
    await dialogo()
      .getByLabel(/^Previsão de Conclusão/)
      .fill(data);
    if (tipo !== 'CONSTRUCAO_CIVIL') {
      await dialogo()
        .getByRole('button', { name: /Continuar para a cobrança/ })
        .click();
      await dialogo()
        .getByRole('radio', { name: 'À Vista', exact: true })
        .click();
      await dialogo()
        .getByLabel(/^Data de Vencimento/)
        .fill(data);
      await dialogo()
        .getByLabel(/^Forma de Pagamento/)
        .selectOption('PIX');
    }
    await gravar(`/projetos/${projeto.id}/iniciar`, 'PATCH', () =>
      dialogo()
        .getByRole('button', {
          name:
            tipo === 'CONSTRUCAO_CIVIL'
              ? 'Iniciar Projeto'
              : 'Confirmar cobrança',
          exact: true,
        })
        .click(),
    );
    const iniciado = await prisma.projeto.findUniqueOrThrow({
      where: { id: projeto.id },
      include: { cobrancas: true },
    });
    assert.equal(iniciado.status, 'EM_EXECUCAO');
    assert.equal(
      iniciado.cobrancas.length,
      tipo === 'CONSTRUCAO_CIVIL' ? 0 : 1,
    );
    const reservas = await prisma.reservaEstoque.findMany({
      where: { projetoId: projeto.id, materialId },
    });
    assert.equal(reservas.length, 1);
    assert.equal(Number(reservas[0].quantidade), 0.5);
    await prova(
      `Inicio ${tipo} persistiu status e cobrancas`,
      {
        projetoId: projeto.id,
        status: iniciado.status,
        cobrancas: iniciado.cobrancas.length,
      },
      titulo,
    );
    if (tipo !== 'CONSTRUCAO_CIVIL') {
      const cobranca = iniciado.cobrancas[0];
      await ir(`/cobrancas/projeto/${projeto.id}`);
      const formas =
        tipo === 'SERRALHERIA'
          ? [
              'PIX',
              'DINHEIRO',
              'TRANSFERENCIA',
              'CHEQUE',
              'CARTAO_CREDITO',
              'CARTAO_DEBITO',
              'BOLETO',
            ]
          : ['PIX'];
      for (let i = 0; i < formas.length; i++) {
        const valor =
          formas.length === 1 ? 206.25 : i === formas.length - 1 ? 26.25 : 30;
        await page
          .getByRole('button', { name: 'Registrar Recebimento', exact: true })
          .click();
        await dialogo()
          .getByLabel(/^Valor Recebido/)
          .fill(String(Math.round(valor * 100)));
        await dialogo()
          .getByLabel(/^Data do Recebimento/)
          .fill(data);
        await dialogo()
          .getByLabel(/^Forma de Pagamento/)
          .selectOption(formas[i]);
        await gravar(`/cobrancas/${cobranca.id}/recebimentos`, 'POST', () =>
          dialogo()
            .getByRole('button', { name: 'Confirmar Recebimento', exact: true })
            .click(),
        );
        const pagamento = await prisma.recebimento.findFirstOrThrow({
          where: {
            parcela: { cobrancaId: cobranca.id },
            formaPagamento: formas[i],
          },
          include: { movimentacaoCaixa: true },
          orderBy: { id: 'desc' },
        });
        assert.equal(Number(pagamento.valor), valor);
        assert.equal(Number(pagamento.movimentacaoCaixa.valor), valor);
        assert.equal(pagamento.movimentacaoCaixa.tipo, 'ENTRADA');
        await prova(
          `Recebimento ${tipo} em ${formas[i]} gravou pagamento e caixa`,
          {
            recebimentoId: pagamento.id,
            movimentoId: pagamento.movimentacaoCaixa.id,
            valor,
          },
          i === formas.length - 1 ? 'Pago' : 'Parcial',
        );
      }
    }
  }

  const obra = projetos[2];
  const tituloObra = `Orcamento CONSTRUCAO_CIVIL ${prefix}`;
  await ir('/projetos');
  await page
    .getByRole('row')
    .filter({ hasText: tituloObra })
    .getByRole('button', { name: /^Mais ações/ })
    .click();
  await page
    .getByRole('menuitem', { name: 'Registrar etapa', exact: true })
    .click();
  await dialogo()
    .getByLabel(/^Descrição da etapa:/)
    .fill(`Medicao ${prefix}`);
  await dialogo()
    .getByLabel(/^Nome do Serviço:/)
    .selectOption(String(servicos.CONSTRUCAO_CIVIL.id));
  await dialogo()
    .getByLabel(/^Qtd\.:/)
    .first()
    .fill('1');
  await dialogo()
    .getByLabel(/^Custo interno estimado/)
    .fill('5000');
  await dialogo().getByRole('radio', { name: 'À Vista', exact: true }).click();
  await dialogo()
    .getByLabel(/^Data de Vencimento/)
    .fill(data);
  await dialogo()
    .getByLabel(/^Forma de Pagamento/)
    .selectOption('PIX');
  await gravar(`/projetos/${obra.id}/etapas`, 'POST', () =>
    dialogo().getByRole('button', { name: 'Confirmar', exact: true }).click(),
  );
  const etapa = await prisma.etapaProjeto.findFirstOrThrow({
    where: { projetoId: obra.id },
    include: { cobranca: true },
  });
  assert.equal(Number(etapa.valorCobrado), 100);
  assert.equal(Number(etapa.custoInternoEstimado), 50);
  assert.equal(Number(etapa.cobranca.valorTotal), 100);
  await prova(
    'Medicao da construcao civil persistiu etapa e cobranca',
    { etapaId: etapa.id, cobrancaId: etapa.cobranca.id, valor: 100 },
    tituloObra,
  );
  await ir(`/cobrancas/projeto/${obra.id}`);
  await page
    .getByRole('button', { name: 'Registrar Recebimento', exact: true })
    .click();
  await dialogo()
    .getByLabel(/^Valor Recebido/)
    .fill('10000');
  await dialogo()
    .getByLabel(/^Data do Recebimento/)
    .fill(data);
  await dialogo()
    .getByLabel(/^Forma de Pagamento/)
    .selectOption('PIX');
  await gravar(`/cobrancas/${etapa.cobranca.id}/recebimentos`, 'POST', () =>
    dialogo()
      .getByRole('button', { name: 'Confirmar Recebimento', exact: true })
      .click(),
  );
  const recebidoEtapa = await prisma.recebimento.findFirstOrThrow({
    where: { parcela: { cobrancaId: etapa.cobranca.id } },
    include: { movimentacaoCaixa: true },
  });
  assert.equal(Number(recebidoEtapa.movimentacaoCaixa.valor), 100);
  await prova(
    'Recebimento da medicao persistiu no caixa',
    { recebimentoId: recebidoEtapa.id, valor: 100 },
    'Pago',
  );

  await ir('/despesas');
  await page.getByRole('button', { name: /Nova Despesa/ }).click();
  await dialogo().getByText('Compra de Material', { exact: true }).click();
  await dialogo()
    .getByLabel(/^Data:/)
    .fill(data);
  await escolher(dialogo().getByLabel(/^Fornecedor:/), nomeFornecedor);
  const descricaoCompra = `Compra ${prefix}`;
  await dialogo()
    .getByLabel(/^Descrição:/)
    .fill(descricaoCompra);
  if (
    (await dialogo()
      .getByLabel(/^Material:/)
      .count()) === 0
  )
    await dialogo()
      .getByRole('button', { name: /Adicionar Material/ })
      .click();
  await escolher(dialogo().getByLabel(/^Material:/), `Material ${prefix}`);
  await dialogo()
    .getByLabel(/^Quantidade:/)
    .fill('2');
  await dialogo()
    .getByLabel(/^Valor Unitário:/)
    .fill('12,50');
  const compraResposta = await gravar('/despesas', 'POST', () =>
    dialogo()
      .getByRole('button', { name: 'Salvar Despesa', exact: true })
      .click(),
  );
  const compra = await prisma.despesa.findUniqueOrThrow({
    where: { id: compraResposta.id },
    include: { materiais: true, movimentacaoCaixa: true },
  });
  assert.equal(Number(compra.valorTotal), 25);
  assert.equal(Number(compra.materiais[0].quantidade), 2);
  assert.equal(compra.movimentacaoCaixa.tipo, 'SAIDA');
  const estoqueComprado = await prisma.estoqueMaterial.findUniqueOrThrow({
    where: { materialId },
  });
  assert.equal(Number(estoqueComprado.quantidadeAtual), 5.5);
  assert.equal(Number(estoqueComprado.quantidadeReservada), 1.5);
  await prova(
    'Compra aumentou estoque e gerou despesa e saida',
    { despesaId: compra.id, materialId, saldoEstoque: 5.5, reservado: 1.5 },
    descricaoCompra,
  );
  await page
    .getByRole('row')
    .filter({ hasText: descricaoCompra })
    .getByRole('button', { name: /^Visualizar/ })
    .click();
  await dialogo()
    .getByRole('button', { name: /Estornar/ })
    .click();
  await dialogo()
    .getByLabel(/^Motivo do estorno:/)
    .fill('Compra lancada por engano no teste');
  const recusa = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === `/api/despesas/${compra.id}/cancelar` &&
      r.request().method() === 'PATCH',
  );
  await dialogo()
    .getByRole('button', { name: 'Estornar Despesa', exact: true })
    .click();
  const respostaRecusa = await recusa;
  assert.equal(respostaRecusa.status(), 409);
  assert.equal(
    (await respostaRecusa.json()).codigo,
    'UTILS_ESTORNARDESPESA_CONFLICT_03',
  );
  errosEsperados.push({
    url: `/api/despesas/${compra.id}/cancelar`,
    status: 409,
  });
  const estoqueEstornado = await prisma.estoqueMaterial.findUniqueOrThrow({
    where: { materialId },
  });
  assert.equal(Number(estoqueEstornado.quantidadeAtual), 5.5);
  assert.equal(Number(estoqueEstornado.quantidadeReservada), 1.5);
  assert.equal(
    (await prisma.despesa.findUniqueOrThrow({ where: { id: compra.id } }))
      .canceladoEm,
    null,
  );
  await prova(
    'Compra de material reservado recusou estorno sem mudar dados',
    {
      despesaId: compra.id,
      saldoEstoque: 5.5,
      reservado: 1.5,
      statusEsperado: 409,
    },
    descricaoCompra,
  );

  await ir('/estoque');
  await page
    .getByRole('button', { name: 'Novo Material', exact: true })
    .click();
  const nomeLivre = `Material livre ${prefix}`;
  await dialogo()
    .getByLabel(/^Nome do Material:/)
    .fill(nomeLivre);
  await dialogo()
    .getByLabel(/^Categoria:/)
    .selectOption({ index: 1 });
  await dialogo()
    .getByLabel(/^Unidade de Medida:/)
    .selectOption({ label: 'Metro Linear' });
  await dialogo()
    .getByLabel(/^Quantidade Inicial/)
    .fill('1');
  await dialogo()
    .getByLabel(/^Preço de Referência/i)
    .fill('500');
  const livre = await gravar('/estoque/materiais', 'POST', () =>
    dialogo()
      .getByRole('button', { name: 'Cadastrar Material', exact: true })
      .click(),
  );
  const materialLivre = await prisma.material.findFirstOrThrow({
    where: { nome: nomeLivre },
  });
  await ir('/despesas');
  await page.getByRole('button', { name: /Nova Despesa/ }).click();
  await dialogo().getByText('Compra de Material', { exact: true }).click();
  await dialogo()
    .getByLabel(/^Data:/)
    .fill(data);
  await escolher(dialogo().getByLabel(/^Fornecedor:/), nomeFornecedor);
  const descricaoLivre = `Compra livre ${prefix}`;
  await dialogo()
    .getByLabel(/^Descrição:/)
    .fill(descricaoLivre);
  if (
    (await dialogo()
      .getByLabel(/^Material:/)
      .count()) === 0
  )
    await dialogo()
      .getByRole('button', { name: /Adicionar Material/ })
      .click();
  await escolher(dialogo().getByLabel(/^Material:/), nomeLivre);
  await dialogo()
    .getByLabel(/^Quantidade:/)
    .fill('2');
  await dialogo()
    .getByLabel(/^Valor Unitário:/)
    .fill('5,00');
  const compraLivre = await gravar('/despesas', 'POST', () =>
    dialogo()
      .getByRole('button', { name: 'Salvar Despesa', exact: true })
      .click(),
  );
  assert.equal(
    Number(
      (
        await prisma.estoqueMaterial.findUniqueOrThrow({
          where: { materialId: materialLivre.id },
        })
      ).quantidadeAtual,
    ),
    3,
  );
  await prova(
    'Compra sem reservas aumentou saldo do material livre',
    { materialId: materialLivre.id, despesaId: compraLivre.id, saldo: 3 },
    descricaoLivre,
  );
  await page
    .getByRole('row')
    .filter({ hasText: descricaoLivre })
    .getByRole('button', { name: /^Visualizar/ })
    .click();
  await dialogo()
    .getByRole('button', { name: /Estornar/ })
    .click();
  await dialogo()
    .getByLabel(/^Motivo do estorno:/)
    .fill('Teste de estorno de compra sem reservas');
  await gravar(`/despesas/${compraLivre.id}/cancelar`, 'PATCH', () =>
    dialogo()
      .getByRole('button', { name: 'Estornar Despesa', exact: true })
      .click(),
  );
  assert.equal(
    Number(
      (
        await prisma.estoqueMaterial.findUniqueOrThrow({
          where: { materialId: materialLivre.id },
        })
      ).quantidadeAtual,
    ),
    1,
  );
  assert.ok(
    (await prisma.despesa.findUniqueOrThrow({ where: { id: compraLivre.id } }))
      .canceladoEm,
  );
  const estornoCompra = await prisma.cancelamentoRegistro.findFirstOrThrow({
    where: { tipo: 'DESPESA', registroId: compraLivre.id },
    include: { movimentacao: true },
  });
  assert.equal(Number(estornoCompra.movimentacao.valor), 10);
  assert.equal(estornoCompra.movimentacao.tipo, 'ENTRADA');
  await prova(
    'Estorno da compra livre reverteu estoque e compensou caixa',
    {
      despesaId: compraLivre.id,
      materialId: materialLivre.id,
      saldo: 1,
      compensacao: 10,
    },
    'Estornada',
  );

  await ir('/despesas');
  await page.getByRole('button', { name: /Nova Despesa/ }).click();
  await dialogo()
    .getByLabel(/^Data:/)
    .fill(data);
  await dialogo()
    .getByLabel(/^Categoria:/)
    .selectOption({ index: 1 });
  await dialogo()
    .getByLabel(/^Valor:/)
    .fill('2500');
  const descricao = `Despesa ${prefix}`;
  await dialogo()
    .getByLabel(/^Descrição:/)
    .fill(descricao);
  const despesaResposta = await gravar('/despesas', 'POST', () =>
    dialogo()
      .getByRole('button', { name: /Salvar|Registrar Despesa/ })
      .click(),
  );
  const despesa = await prisma.despesa.findUniqueOrThrow({
    where: { id: despesaResposta.id },
    include: { movimentacaoCaixa: true },
  });
  assert.equal(Number(despesa.valorTotal), 25);
  assert.equal(despesa.movimentacaoCaixa.tipo, 'SAIDA');
  assert.equal(Number(despesa.movimentacaoCaixa.valor), 25);
  await prova(
    'Despesa diversa gravou saida no caixa',
    {
      despesaId: despesa.id,
      movimentoId: despesa.movimentacaoCaixa.id,
      valor: 25,
    },
    descricao,
  );
  await page
    .getByRole('row')
    .filter({ hasText: descricao })
    .getByRole('button', { name: /^Visualizar/ })
    .click();
  await dialogo()
    .getByRole('button', { name: /Estornar/ })
    .click();
  await dialogo()
    .getByLabel(/^Motivo do estorno:/)
    .fill('Teste de estorno pela interface');
  await gravar(`/despesas/${despesa.id}/cancelar`, 'PATCH', () =>
    dialogo()
      .getByRole('button', { name: 'Estornar Despesa', exact: true })
      .click(),
  );
  const cancelada = await prisma.despesa.findUniqueOrThrow({
    where: { id: despesa.id },
  });
  assert.ok(cancelada.canceladoEm);
  const cancelamento = await prisma.cancelamentoRegistro.findFirstOrThrow({
    where: { tipo: 'DESPESA', registroId: despesa.id },
  });
  await prova(
    'Estorno manteve despesa e auditoria',
    { despesaId: despesa.id, cancelamentoId: cancelamento.id },
    'Estornada',
  );

  await ir(`/caixa?competencia=${competenciaIso}`);
  const caixa = await prisma.caixa.findUniqueOrThrow({
    where: { competencia: new Date(`${competenciaIso}-01T00:00:00Z`) },
    include: { movimentacoes: true },
  });
  const entradas = caixa.movimentacoes
    .filter((m) => m.tipo === 'ENTRADA')
    .reduce((s, m) => s + Number(m.valor), 0);
  const saidas = caixa.movimentacoes
    .filter((m) => m.tipo === 'SAIDA')
    .reduce((s, m) => s + Number(m.valor), 0);
  assert.equal(entradas, 547.5);
  assert.equal(saidas, 60);
  assert.equal(Number(caixa.valorInicial) + entradas - saidas, 587.5);
  await prova(
    'Saldo do caixa conferido no MySQL e tela recarregada',
    { caixaId: caixa.id, inicial: 100, entradas, saidas, saldo: 587.5 },
    '587,50',
  );
  await page.getByRole('button', { name: /Fechar Mês/ }).click();
  await gravar(`/financeiro/caixa/${caixa.id}/fechar`, 'PATCH', () =>
    dialogo()
      .getByRole('button', { name: 'Confirmar Fechamento', exact: true })
      .click(),
  );
  const fechado = await prisma.caixa.findUniqueOrThrow({
    where: { id: caixa.id },
  });
  assert.equal(fechado.status, 'FECHADO');
  assert.ok(fechado.fechadoEm);
  await prova(
    'Fechamento do caixa persistido',
    { caixaId: caixa.id, status: fechado.status },
    'Fechado',
  );
  if (reiniciarBackend) {
    await reiniciarBackend();
    await ir('/clientes');
    await prova(
      'Cliente continua disponivel apos reiniciar a API',
      { clienteId: cliente.id },
      cliente.nome,
    );
    await ir(`/caixa?competencia=${competenciaIso}`);
    await prova(
      'Caixa fechado e saldo preservados apos reiniciar a API',
      { caixaId: caixa.id, saldo: 587.5 },
      '587,50',
    );
  }
  await fs.writeFile(
    path.join(pasta, 'resultado.json'),
    JSON.stringify(
      {
        completo: true,
        escopo:
          'Operacoes realizadas na interface, respostas HTTP e consultas independentes no MySQL',
        provas,
      },
      null,
      2,
    ),
  );
}

module.exports = { testar };

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const { randomBytes } = require('node:crypto');
  const { spawnSync } = require('node:child_process');
  const mariadb = require('mariadb');
  const url = new URL(process.env.DATABASE_URL);
  const nome = `fp_visual_test_${randomBytes(8).toString('hex')}`;
  url.pathname = `/${nome}`;
  const resultado = spawnSync(process.execPath, ['test/frontend.smoke.cjs'], {
    env: {
      ...process.env,
      DATABASE_URL_TEST: url.toString(),
      UI_PERSISTENCIA_EXTENDIDA: '1',
    },
    stdio: 'inherit',
    windowsHide: true,
  });
  (async () => {
    if (!/^fp_visual_test_[a-f0-9]{16}$/.test(nome))
      throw new Error('Banco inseguro');
    const c = await mariadb.createConnection({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      allowPublicKeyRetrieval:
        url.searchParams.get('allowPublicKeyRetrieval') === 'true',
    });
    try {
      await c.query(`DROP DATABASE IF EXISTS \`${nome}\``);
    } finally {
      await c.end();
    }
    process.exitCode = resultado.status === 0 ? 0 : 1;
  })().catch((e) => {
    console.error(e.code || e.message);
    process.exitCode = 1;
  });
}
