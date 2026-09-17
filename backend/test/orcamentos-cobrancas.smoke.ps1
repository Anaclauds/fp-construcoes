param(
  [string]$BaseUrl = 'http://localhost:3000/api',
  [Parameter(Mandatory = $true)]
  [string]$Login,
  [Parameter(Mandatory = $true)]
  [string]$Senha
)

$ErrorActionPreference = 'Stop'

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body
  )

  $params = @{
    Method = $Method
    Uri = "$BaseUrl$Path"
    Headers = $script:Headers
    ContentType = 'application/json'
  }
  if ($null -ne $Body) {
    $params.Body = $Body | ConvertTo-Json -Depth 10
  }
  Invoke-RestMethod @params
}

function Assert-HttpError {
  param(
    [scriptblock]$Action,
    [int]$ExpectedStatus
  )

  try {
    & $Action
    throw "Era esperado o status HTTP $ExpectedStatus, mas a operacao foi aceita."
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    if ($status -ne $ExpectedStatus) {
      throw
    }
  }
}

$loginBody = @{ login = $Login; senha = $Senha } | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body $loginBody
$script:Headers = @{ Authorization = "Bearer $($auth.accessToken)" }

$clientes = Invoke-Api -Method Get -Path '/clientes?status=ATIVO&limit=1'
$funcionarios = Invoke-Api -Method Get -Path '/funcionarios?status=ATIVO&limit=1'
$materiais = Invoke-Api -Method Get -Path '/orcamentos/opcoes/materiais'
$servicos = Invoke-Api -Method Get -Path '/orcamentos/opcoes/servicos'

if (-not $clientes.data[0] -or -not $funcionarios.data[0] -or -not $materiais[0] -or -not $servicos[0]) {
  throw 'O teste requer um cliente, um funcionario, um material e um servico ativos.'
}

$sufixo = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$orcamento = Invoke-Api -Method Post -Path '/orcamentos' -Body @{
  titulo = "Teste Integrado Orcamento $sufixo"
  tipo = 'CALHAS'
  clienteId = $clientes.data[0].id
  desconto = 0
  modalidadePagamento = 'A_VISTA'
  materiais = @(
    @{
      materialId = $materiais[0].id
      quantidade = 2
      valorUnitario = 12
    }
  )
  servicos = @(
    @{
      servicoId = $servicos[0].id
      descricaoAdicional = 'Fluxo automatizado de validacao'
      quantidade = 1
      valorUnitario = 476
    }
  )
}

$listaOrcamentos = Invoke-Api -Method Get -Path "/orcamentos?busca=$($orcamento.numero)"
$detalheOrcamento = Invoke-Api -Method Get -Path "/orcamentos/$($orcamento.id)"
$orcamentoEditado = Invoke-Api -Method Patch -Path "/orcamentos/$($orcamento.id)" -Body @{
  titulo = "Teste Integrado Editado $sufixo"
}
$orcamentoEmAnalise = Invoke-Api -Method Patch -Path "/orcamentos/$($orcamento.id)/status" -Body @{
  status = 'EM_ANALISE'
}
$aprovacao = Invoke-Api -Method Patch -Path "/orcamentos/$($orcamento.id)/aprovar" -Body @{
  responsavelId = $funcionarios.data[0].id
}

Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Patch -Path "/orcamentos/$($orcamento.id)" -Body @{ titulo = 'Edicao proibida' }
}

Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Post -Path '/orcamentos' -Body @{
    titulo = 'Orcamento sem itens'
    tipo = 'SERRALHERIA'
    clienteId = $clientes.data[0].id
  }
}

$hoje = (Get-Date).ToString('yyyy-MM-dd')
$proximoMes = (Get-Date).AddMonths(1).ToString('yyyy-MM-dd')
$cobranca = Invoke-Api -Method Post -Path '/cobrancas' -Body @{
  projetoId = $aprovacao.projeto.id
  tipo = 'FINAL'
  modalidade = 'PARCELADO_MANUAL'
  formaPagamento = 'CARTAO_CREDITO'
  percentualDesconto = 0
  valorTotal = 500
  parcelas = @(
    @{ numero = 1; vencimento = $hoje; valor = 250 },
    @{ numero = 2; vencimento = $proximoMes; valor = 250 }
  )
}

$listaCobrancas = Invoke-Api -Method Get -Path "/cobrancas?busca=$sufixo"
$cobrancasProjeto = Invoke-Api -Method Get -Path "/cobrancas/projetos/$($aprovacao.projeto.id)"
$detalheCobranca = Invoke-Api -Method Get -Path "/cobrancas/$($cobranca.id)"
$parcelaId = $detalheCobranca.parcelas[0].id
$aposRecebimento = Invoke-Api -Method Post -Path "/cobrancas/$($cobranca.id)/recebimentos" -Body @{
  parcelaId = $parcelaId
  valor = 100
  dataRecebimento = $hoje
  formaPagamento = 'CARTAO_DEBITO'
  observacoes = 'Recebimento parcial do teste integrado'
}

Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Post -Path "/cobrancas/$($cobranca.id)/recebimentos" -Body @{
    parcelaId = $parcelaId
    valor = 150.01
    dataRecebimento = $hoje
    formaPagamento = 'PIX'
  }
}

[pscustomobject]@{
  autenticacao = 'OK'
  catalogos = if ($materiais.Count -gt 0 -and $servicos.Count -gt 0) { 'OK' } else { 'FALHOU' }
  cadastroOrcamento = if ($orcamento.valorTotal -eq 500) { 'OK' } else { 'FALHOU' }
  listagemOrcamento = if ($listaOrcamentos.meta.total -ge 1) { 'OK' } else { 'FALHOU' }
  visualizacaoOrcamento = if ($detalheOrcamento.id -eq $orcamento.id) { 'OK' } else { 'FALHOU' }
  edicaoOrcamento = if ($orcamentoEditado.titulo -like '*Editado*') { 'OK' } else { 'FALHOU' }
  statusOrcamento = if ($orcamentoEmAnalise.status -eq 'EM_ANALISE') { 'OK' } else { 'FALHOU' }
  aprovacaoProjeto = if ($aprovacao.projeto.id) { 'OK' } else { 'FALHOU' }
  bloqueioEdicaoAprovado = 'OK'
  validacaoOrcamentoSemItens = 'OK'
  geracaoCobranca = if ($cobranca.parcelas.Count -eq 2) { 'OK' } else { 'FALHOU' }
  listagemCobranca = if ($listaCobrancas.meta.total -ge 1) { 'OK' } else { 'FALHOU' }
  detalhesProjeto = if ($cobrancasProjeto.cobrancas.Count -eq 1) { 'OK' } else { 'FALHOU' }
  recebimentoParcial = if ($aposRecebimento.status -eq 'PARCIAL') { 'OK' } else { 'FALHOU' }
  bloqueioValorExcedente = 'OK'
  orcamentoId = $orcamento.id
  projetoId = $aprovacao.projeto.id
  cobrancaId = $cobranca.id
} | ConvertTo-Json
