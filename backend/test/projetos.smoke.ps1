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
    $params.Body = $Body | ConvertTo-Json -Depth 12
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
$materiaisResposta = Invoke-Api -Method Get -Path '/estoque?limit=100'
$servicosResposta = Invoke-Api -Method Get -Path '/projetos/opcoes/servicos'
$materiais = @(
  $materiaisResposta.data |
    Where-Object { [decimal]$_.quantidadeDisponivel -ge 20 }
)
$servicos = @($servicosResposta | Where-Object { $_.id })
$servicoCivil = $servicos | Where-Object { $_.categoria -eq 'CONSTRUCAO_CIVIL' } | Select-Object -First 1
$servicoSerralheria = $servicos | Where-Object { $_.categoria -eq 'SERRALHERIA' } | Select-Object -First 1

if (-not $clientes.data[0] -or -not $funcionarios.data[0] -or -not $materiais[0] -or -not $servicoCivil -or -not $servicoSerralheria) {
  throw 'O teste requer cliente, funcionario, material e servicos civil/serralheria ativos.'
}

$sufixo = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$hoje = (Get-Date).ToString('yyyy-MM-dd')
$previsao = (Get-Date).AddMonths(3).ToString('yyyy-MM-dd')
$primeiroVencimento = (Get-Date).AddDays(10).ToString('yyyy-MM-dd')

$orcamentoSerralheria = Invoke-Api -Method Post -Path '/orcamentos' -Body @{
  titulo = "Projeto Serralheria $sufixo"
  tipo = 'SERRALHERIA'
  clienteId = $clientes.data[0].id
  modalidadePagamento = 'PARCELADO_AUTOMATICO'
  numeroParcelas = 2
  dataPrimeiroVencimento = $primeiroVencimento
  materiais = @(
    @{ materialId = $materiais[0].id; quantidade = 2; valorUnitario = 50 }
  )
  servicos = @(
    @{ servicoId = $servicoSerralheria.id; quantidade = 1; valorUnitario = 900 }
  )
}
$projetoSerralheria = (Invoke-Api -Method Patch -Path "/orcamentos/$($orcamentoSerralheria.id)/aprovar" -Body @{
  responsavelId = $funcionarios.data[0].id
}).projeto
$projetoSerralheriaIniciado = Invoke-Api -Method Patch -Path "/projetos/$($projetoSerralheria.id)/iniciar" -Body @{
  dataInicio = $hoje
  previsaoConclusao = $previsao
  modalidadeCobranca = 'PARCELADO_AUTOMATICO'
  formaPagamento = 'BOLETO'
  descontoPercentual = 10
  numeroParcelas = 2
  primeiroVencimento = $primeiroVencimento
}

Assert-HttpError -ExpectedStatus 409 -Action {
  Invoke-Api -Method Patch -Path "/projetos/$($projetoSerralheria.id)/iniciar" -Body @{}
}

Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Post -Path "/projetos/$($projetoSerralheria.id)/etapas" -Body @{
    descricao = 'Etapa indevida em serralheria'
    valorCobrado = 100
    servicos = @(@{ servicoId = $servicoSerralheria.id; quantidade = 1 })
  }
}

$projetoSerralheriaComExtra = Invoke-Api -Method Post -Path "/projetos/$($projetoSerralheria.id)/extras" -Body @{
  descricaoJustificativa = 'Material adicional solicitado no teste integrado'
  materiais = @(
    @{ materialId = $materiais[0].id; quantidade = 3; custoUnitarioEstimado = 10 }
  )
  servicos = @(
    @{ servicoId = $servicoSerralheria.id; quantidade = 1; custoUnitarioEstimado = 100 }
  )
}
$projetoSerralheriaCancelado = Invoke-Api -Method Patch -Path "/projetos/$($projetoSerralheria.id)/status" -Body @{
  status = 'CANCELADO'
}

$orcamentoCivil = Invoke-Api -Method Post -Path '/orcamentos' -Body @{
  titulo = "Projeto Construcao Civil $sufixo"
  tipo = 'CONSTRUCAO_CIVIL'
  clienteId = $clientes.data[0].id
  modalidadePagamento = 'A_VISTA'
  materiais = @(
    @{ materialId = $materiais[0].id; quantidade = 5; valorUnitario = 20 }
  )
  servicos = @(
    @{ servicoId = $servicoCivil.id; quantidade = 10; valorUnitario = 90 }
  )
}
$projetoCivil = (Invoke-Api -Method Patch -Path "/orcamentos/$($orcamentoCivil.id)/aprovar" -Body @{
  responsavelId = $funcionarios.data[0].id
}).projeto
$projetoCivilIniciado = Invoke-Api -Method Patch -Path "/projetos/$($projetoCivil.id)/iniciar" -Body @{
  dataInicio = $hoje
  previsaoConclusao = $previsao
}
$projetoCivilComEtapa = Invoke-Api -Method Post -Path "/projetos/$($projetoCivil.id)/etapas" -Body @{
  descricao = 'Primeira etapa de alvenaria concluida'
  dataRegistro = $hoje
  valorCobrado = 600
  modalidadeCobranca = 'A_VISTA'
  formaPagamento = 'CARTAO_DEBITO'
  descontoPercentual = 5
  servicos = @(
    @{
      servicoId = $servicoCivil.id
      quantidade = 5
      valorUnitario = 90
      custoInternoEstimado = 350
    }
  )
}

Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Post -Path "/projetos/$($projetoCivil.id)/etapas" -Body @{
    descricao = 'Tentativa de parcelamento no cartao de debito'
    valorCobrado = 100
    modalidadeCobranca = 'PARCELADO_AUTOMATICO'
    formaPagamento = 'CARTAO_DEBITO'
    numeroParcelas = 2
    primeiroVencimento = $primeiroVencimento
    servicos = @(@{ servicoId = $servicoCivil.id; quantidade = 1 })
  }
}
$projetoCivilComExtra = Invoke-Api -Method Post -Path "/projetos/$($projetoCivil.id)/extras" -Body @{
  descricaoJustificativa = 'Reforco adicional solicitado durante a execucao'
  materiais = @(
    @{ materialId = $materiais[0].id; quantidade = 2 }
  )
}

Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Post -Path "/projetos/$($projetoCivil.id)/etapas" -Body @{
    descricao = 'Medicao acima do valor original'
    valorCobrado = 500
    servicos = @(@{ servicoId = $servicoCivil.id; quantidade = 1 })
  }
}

$listaProjetos = Invoke-Api -Method Get -Path "/projetos?busca=$sufixo"
$detalheCivil = Invoke-Api -Method Get -Path "/projetos/$($projetoCivil.id)"
$historicoCivil = Invoke-Api -Method Get -Path "/projetos/$($projetoCivil.id)/historico"
$projetoCivilConcluido = Invoke-Api -Method Patch -Path "/projetos/$($projetoCivil.id)/status" -Body @{
  status = 'CONCLUIDO'
}

Assert-HttpError -ExpectedStatus 409 -Action {
  Invoke-Api -Method Post -Path "/projetos/$($projetoCivil.id)/extras" -Body @{
    descricaoJustificativa = 'Extra indevido apos conclusao'
    materiais = @(@{ materialId = $materiais[0].id; quantidade = 1 })
  }
}

try {
  Invoke-RestMethod -Method Get -Uri "$BaseUrl/projetos"
  throw 'A listagem de projetos foi aceita sem autenticacao.'
} catch {
  if ([int]$_.Exception.Response.StatusCode -ne 401) {
    throw
  }
}

[pscustomobject]@{
  autenticacao = 'OK'
  listagemIndicadoresFiltros = if ($listaProjetos.meta.total -ge 2) { 'OK' } else { 'FALHOU' }
  detalhesProjeto = if ($detalheCivil.id -eq $projetoCivil.id) { 'OK' } else { 'FALHOU' }
  inicioSerralheria = if ($projetoSerralheriaIniciado.status -eq 'EM_EXECUCAO') { 'OK' } else { 'FALHOU' }
  cobrancaInicialSerralheria = if ($projetoSerralheriaIniciado.cobrancas.Count -eq 1 -and $projetoSerralheriaIniciado.cobrancas[0].parcelas.Count -eq 2) { 'OK' } else { 'FALHOU' }
  pagamentoBoleto = if ($projetoSerralheriaIniciado.cobrancas[0].formaPagamento -eq 'BOLETO') { 'OK' } else { 'FALHOU' }
  descontoPercentual = if ($projetoSerralheriaIniciado.cobrancas[0].percentualDesconto -eq 10 -and $projetoSerralheriaIniciado.cobrancas[0].desconto -eq 100 -and $projetoSerralheriaIniciado.cobrancas[0].valorTotal -eq 900) { 'OK' } else { 'FALHOU' }
  bloqueioInicioDuplicado = 'OK'
  bloqueioEtapaSerralheria = 'OK'
  extraSerralheria = if ($projetoSerralheriaComExtra.extras.Count -eq 1) { 'OK' } else { 'FALHOU' }
  cancelamento = if ($projetoSerralheriaCancelado.status -eq 'CANCELADO') { 'OK' } else { 'FALHOU' }
  inicioConstrucaoCivil = if ($projetoCivilIniciado.status -eq 'EM_EXECUCAO' -and $projetoCivilIniciado.cobrancas.Count -eq 0) { 'OK' } else { 'FALHOU' }
  etapaComServicos = if ($projetoCivilComEtapa.etapas.Count -eq 1 -and $projetoCivilComEtapa.etapas[0].servicos.Count -eq 1) { 'OK' } else { 'FALHOU' }
  cobrancaMedicao = if ($projetoCivilComEtapa.cobrancas.Count -eq 1 -and $projetoCivilComEtapa.cobrancas[0].tipo -eq 'MEDICAO') { 'OK' } else { 'FALHOU' }
  pagamentoDebitoAVista = if ($projetoCivilComEtapa.cobrancas[0].formaPagamento -eq 'CARTAO_DEBITO' -and $projetoCivilComEtapa.cobrancas[0].valorTotal -eq 570) { 'OK' } else { 'FALHOU' }
  bloqueioDebitoParcelado = 'OK'
  extraConstrucao = if ($projetoCivilComExtra.extras.Count -eq 1) { 'OK' } else { 'FALHOU' }
  bloqueioMedicaoExcedente = 'OK'
  historico = if ($historicoCivil.historico.Count -eq 2) { 'OK' } else { 'FALHOU' }
  conclusao = if ($projetoCivilConcluido.status -eq 'CONCLUIDO' -and $projetoCivilConcluido.dataConclusao) { 'OK' } else { 'FALHOU' }
  bloqueioExecucaoFinalizada = 'OK'
  protecaoJwt = 'OK'
  projetoSerralheriaId = $projetoSerralheria.id
  projetoCivilId = $projetoCivil.id
} | ConvertTo-Json
