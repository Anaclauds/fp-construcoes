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
$sufixo = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$servico = Invoke-Api -Method Post -Path '/servicos' -Body @{
  nome = "Servico Estoque $sufixo"
  categoria = 'SERRALHERIA'
  descricao = 'Servico criado pelo protocolo automatizado.'
  valorReferencia = 350
  unidadeMedida = 'Metro linear'
}
$listaServicos = Invoke-Api -Method Get -Path "/servicos?busca=$sufixo&categoria=SERRALHERIA"
if ($listaServicos.meta.total -ne 1) { throw 'A busca do servico nao retornou o cadastro criado.' }
$null = Invoke-Api -Method Get -Path "/servicos/$($servico.id)"
$servicoEditado = Invoke-Api -Method Patch -Path "/servicos/$($servico.id)" -Body @{
  valorReferencia = 375.5
  unidadeMedida = 'Metro'
}
if ([decimal]$servicoEditado.valorReferencia -ne 375.5) { throw 'O servico nao foi editado.' }
$null = Invoke-Api -Method Patch -Path "/servicos/$($servico.id)/desativar"
$servicoInativo = Invoke-Api -Method Get -Path "/servicos?busca=$sufixo&status=INATIVO"
if ($servicoInativo.meta.total -ne 1) { throw 'O servico nao foi desativado.' }
$null = Invoke-Api -Method Patch -Path "/servicos/$($servico.id)/reativar"

$materialCatalogo = Invoke-Api -Method Post -Path '/materiais' -Body @{
  nome = "Material Catalogo $sufixo"
  categoria = 'Aco e Metais'
  unidadeMedida = 'Unidade'
  descricao = 'Material sem saldo inicial.'
  precoReferencia = 18.5
}
$materialCatalogoEditado = Invoke-Api -Method Patch -Path "/materiais/$($materialCatalogo.id)" -Body @{
  precoReferencia = 19.75
  descricao = 'Material atualizado pelo teste.'
}
if ([decimal]$materialCatalogoEditado.precoReferencia -ne 19.75) { throw 'O material do catalogo nao foi editado.' }
$null = Invoke-Api -Method Patch -Path "/materiais/$($materialCatalogo.id)/desativar"
$null = Invoke-Api -Method Patch -Path "/materiais/$($materialCatalogo.id)/reativar"

$materialEstoque = Invoke-Api -Method Post -Path '/estoque/materiais' -Body @{
  nome = "Tubo Teste $sufixo"
  categoria = 'Perfil'
  unidadeMedida = 'Metro'
  quantidadeInicial = 100
  observacoes = 'Material criado pelo protocolo automatizado de estoque.'
}
$estoqueLista = Invoke-Api -Method Get -Path "/estoque?busca=$sufixo&categoria=Perfil"
if ($estoqueLista.meta.total -ne 1) { throw 'A busca do estoque nao retornou o material criado.' }
$null = Invoke-Api -Method Post -Path "/estoque/$($materialEstoque.id)/ajustes" -Body @{
  tipo = 'AJUSTE_ENTRADA'
  quantidade = 10
  justificativa = 'Entrada de conferencia automatizada.'
}
$estoqueAjustado = Invoke-Api -Method Post -Path "/estoque/$($materialEstoque.id)/ajustes" -Body @{
  tipo = 'AJUSTE_SAIDA'
  quantidade = 5
  justificativa = 'Saida de conferencia automatizada.'
}
if ([decimal]$estoqueAjustado.saldo.quantidadeAtual -ne 105) { throw 'O saldo apos os ajustes deveria ser 105.' }
Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Post -Path "/estoque/$($materialEstoque.id)/ajustes" -Body @{
    tipo = 'AJUSTE_SAIDA'
    quantidade = 106
    justificativa = 'Esta saida deve ser bloqueada.'
  }
}

$clientes = Invoke-Api -Method Get -Path '/clientes?status=ATIVO&limit=1'
$funcionarios = Invoke-Api -Method Get -Path '/funcionarios?status=ATIVO&limit=1'
if (-not $clientes.data[0] -or -not $funcionarios.data[0]) {
  throw 'O teste integrado requer cliente e funcionario ativos.'
}
$orcamento = Invoke-Api -Method Post -Path '/orcamentos' -Body @{
  titulo = "Reserva Estoque $sufixo"
  tipo = 'SERRALHERIA'
  clienteId = $clientes.data[0].id
  modalidadePagamento = 'A_VISTA'
  materiais = @(
    @{ materialId = $materialEstoque.id; quantidade = 20; valorUnitario = 19.75 }
  )
  servicos = @(
    @{ servicoId = $servico.id; quantidade = 1; valorUnitario = 375.5 }
  )
}
$projeto = (Invoke-Api -Method Patch -Path "/orcamentos/$($orcamento.id)/aprovar" -Body @{
  responsavelId = $funcionarios.data[0].id
}).projeto
$null = Invoke-Api -Method Patch -Path "/projetos/$($projeto.id)/iniciar" -Body @{
  formaPagamento = 'PIX'
  modalidadeCobranca = 'A_VISTA'
}
$estoqueReservado = Invoke-Api -Method Get -Path "/estoque/$($materialEstoque.id)"
if ([decimal]$estoqueReservado.saldo.quantidadeReservada -ne 20) { throw 'O inicio do projeto nao reservou 20 unidades.' }
$null = Invoke-Api -Method Post -Path "/projetos/$($projeto.id)/extras" -Body @{
  descricaoJustificativa = 'Material extra para validar a reserva.'
  materiais = @(
    @{ materialId = $materialEstoque.id; quantidade = 5; custoUnitarioEstimado = 19.75 }
  )
}
$estoqueComExtra = Invoke-Api -Method Get -Path "/estoque/$($materialEstoque.id)"
if ([decimal]$estoqueComExtra.saldo.quantidadeReservada -ne 25) { throw 'O extra nao elevou a reserva para 25 unidades.' }
Assert-HttpError -ExpectedStatus 409 -Action {
  Invoke-Api -Method Patch -Path "/materiais/$($materialEstoque.id)/desativar"
}
$null = Invoke-Api -Method Patch -Path "/projetos/$($projeto.id)/status" -Body @{ status = 'CANCELADO' }
$estoqueLiberado = Invoke-Api -Method Get -Path "/estoque/$($materialEstoque.id)"
if ([decimal]$estoqueLiberado.saldo.quantidadeReservada -ne 0) { throw 'O cancelamento nao liberou as reservas.' }
if ([decimal]$estoqueLiberado.saldo.quantidadeAtual -ne 105) { throw 'O cancelamento alterou indevidamente o estoque fisico.' }
$null = Invoke-Api -Method Patch -Path "/materiais/$($materialEstoque.id)/desativar"
$null = Invoke-Api -Method Patch -Path "/materiais/$($materialEstoque.id)/reativar"

[pscustomobject]@{
  servicoId = $servico.id
  materialCatalogoId = $materialCatalogo.id
  materialEstoqueId = $materialEstoque.id
  projetoId = $projeto.id
  saldoAtual = $estoqueLiberado.saldo.quantidadeAtual
  saldoReservado = $estoqueLiberado.saldo.quantidadeReservada
  resultado = 'PROTOCOLO COMPLETO APROVADO'
} | Format-List
