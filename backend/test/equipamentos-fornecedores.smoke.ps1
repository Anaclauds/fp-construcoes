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

function Get-CnpjDigit {
  param([string]$Base)

  $weight = $Base.Length - 7
  $sum = 0
  foreach ($character in $Base.ToCharArray()) {
    $sum += [int]::Parse($character) * $weight
    if ($weight -eq 2) { $weight = 9 } else { $weight-- }
  }
  $remainder = $sum % 11
  if ($remainder -lt 2) { return 0 }
  return 11 - $remainder
}

function New-ValidCnpj {
  $root = ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() % 100000000).ToString('00000000')
  $base = "${root}0001"
  $first = Get-CnpjDigit -Base $base
  $second = Get-CnpjDigit -Base "${base}${first}"
  return "${base}${first}${second}"
}

$loginBody = @{ login = $Login; senha = $Senha } | ConvertTo-Json
$auth = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body $loginBody
$script:Headers = @{ Authorization = "Bearer $($auth.accessToken)" }
$sufixo = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$cnpj = New-ValidCnpj

Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Post -Path '/fornecedores' -Body @{
    razaoSocial = 'Fornecedor CNPJ Invalido'
    nomeFantasia = 'Invalido'
    cnpj = '11.111.111/1111-11'
    contato = '(69) 99999-9999'
    responsavel = 'Responsavel Invalido'
    cargoResponsavel = 'Gerente'
    cep = '76920-000'
    cidade = 'Ouro Preto do Oeste'
    estado = 'RO'
    rua = 'Rua Teste'
    numero = '1'
    bairro = 'Centro'
  }
}

$fornecedorBody = @{
  razaoSocial = "Fornecedor Integrado $sufixo Ltda"
  nomeFantasia = "Fornecedor$sufixo"
  cnpj = $cnpj
  contato = '(69) 99123-4567'
  responsavel = 'Carlos Henrique'
  cargoResponsavel = 'Gerente Comercial'
  cep = '76916-000'
  cidade = 'Ouro Preto do Oeste'
  estado = 'RO'
  rua = 'Avenida Industrial'
  numero = '450'
  bairro = 'Setor Industrial'
  complemento = 'Galpao 2'
}
$fornecedor = Invoke-Api -Method Post -Path '/fornecedores' -Body $fornecedorBody
Assert-HttpError -ExpectedStatus 409 -Action {
  Invoke-Api -Method Post -Path '/fornecedores' -Body $fornecedorBody
}
$listaFornecedores = Invoke-Api -Method Get -Path "/fornecedores?busca=$sufixo"
if ($listaFornecedores.meta.total -ne 1) { throw 'A busca nao encontrou o fornecedor criado.' }
$fornecedorEditado = Invoke-Api -Method Patch -Path "/fornecedores/$($fornecedor.id)" -Body @{
  responsavel = 'Mariana Souza'
  cargoResponsavel = 'Supervisora Comercial'
  cidade = 'Ji-Parana'
}
if ($fornecedorEditado.responsavel -ne 'Mariana Souza') { throw 'O fornecedor nao foi editado.' }
$opcoes = @(Invoke-Api -Method Get -Path '/fornecedores/opcoes/ativos')
if (-not ($opcoes | Where-Object { $_.id -eq $fornecedor.id })) { throw 'O fornecedor ativo nao apareceu nas opcoes.' }

$material = Invoke-Api -Method Post -Path '/materiais' -Body @{
  nome = "Material Fornecedor $sufixo"
  categoria = 'Aco e Metais'
  unidadeMedida = 'Unidade'
  descricao = 'Material usado para testar fornecedor preferencial.'
  precoReferencia = 25
  fornecedorPreferencialId = $fornecedor.id
}
if ($material.fornecedorPreferencial.id -ne $fornecedor.id) { throw 'O fornecedor nao foi vinculado ao material.' }

$equipamento = Invoke-Api -Method Post -Path '/equipamentos' -Body @{
  nome = "Serra Circular Teste $sufixo"
  tipo = 'ELETRICO'
  marca = 'Makita'
  modelo = '5007MG'
  observacoes = 'Revisao anual prevista para 2027.'
  dataAquisicao = '2022-03-10'
  valorAquisicao = 1200
  fornecedorId = $fornecedor.id
}
if ($equipamento.codigoPatrimonial -notmatch '^EQP-\d{3,}$') { throw 'O codigo patrimonial nao foi gerado corretamente.' }
if ($equipamento.fornecedor.id -ne $fornecedor.id) { throw 'O fornecedor nao foi vinculado ao equipamento.' }
$listaEquipamentos = Invoke-Api -Method Get -Path "/equipamentos?busca=$sufixo&tipo=ELETRICO"
if ($listaEquipamentos.meta.total -ne 1) { throw 'A busca nao encontrou o equipamento criado.' }
$equipamentoDetalhes = Invoke-Api -Method Get -Path "/equipamentos/$($equipamento.id)"
if ([decimal]$equipamentoDetalhes.valorAquisicao -ne 1200) { throw 'Os detalhes de aquisicao estao incorretos.' }
$equipamentoEditado = Invoke-Api -Method Patch -Path "/equipamentos/$($equipamento.id)" -Body @{
  marca = 'Bosch'
  modelo = 'GKS 150'
  valorAquisicao = 1350.5
}
if ($equipamentoEditado.marca -ne 'Bosch') { throw 'O equipamento nao foi editado.' }
Assert-HttpError -ExpectedStatus 400 -Action {
  Invoke-Api -Method Post -Path '/equipamentos' -Body @{
    nome = 'Equipamento com data futura'
    tipo = 'MANUAL'
    marca = 'Teste'
    dataAquisicao = (Get-Date).AddDays(2).ToString('yyyy-MM-dd')
  }
}

$null = Invoke-Api -Method Patch -Path "/equipamentos/$($equipamento.id)/desativar"
$equipamentoInativo = Invoke-Api -Method Get -Path "/equipamentos?busca=$sufixo&status=INATIVO"
if ($equipamentoInativo.meta.total -ne 1) { throw 'O equipamento nao foi desativado.' }
$null = Invoke-Api -Method Patch -Path "/equipamentos/$($equipamento.id)/reativar"

$null = Invoke-Api -Method Patch -Path "/fornecedores/$($fornecedor.id)/desativar"
$opcoesSemFornecedor = @(Invoke-Api -Method Get -Path '/fornecedores/opcoes/ativos')
if ($opcoesSemFornecedor | Where-Object { $_.id -eq $fornecedor.id }) { throw 'Fornecedor inativo permaneceu nas opcoes.' }
Assert-HttpError -ExpectedStatus 404 -Action {
  Invoke-Api -Method Post -Path '/equipamentos' -Body @{
    nome = 'Equipamento com fornecedor inativo'
    tipo = 'MANUAL'
    marca = 'Teste'
    fornecedorId = $fornecedor.id
  }
}
$null = Invoke-Api -Method Patch -Path "/fornecedores/$($fornecedor.id)/reativar"
$fornecedorDetalhes = Invoke-Api -Method Get -Path "/fornecedores/$($fornecedor.id)"
if (-not ($fornecedorDetalhes.equipamentos | Where-Object { $_.id -eq $equipamento.id })) { throw 'O equipamento nao apareceu nos vinculos do fornecedor.' }
if (-not ($fornecedorDetalhes.materiaisPreferenciais | Where-Object { $_.id -eq $material.id })) { throw 'O material nao apareceu nos vinculos do fornecedor.' }

[pscustomobject]@{
  fornecedorId = $fornecedor.id
  cnpj = $fornecedor.cnpj
  equipamentoId = $equipamento.id
  codigoPatrimonial = $equipamento.codigoPatrimonial
  materialVinculadoId = $material.id
  resultado = 'PROTOCOLO COMPLETO APROVADO'
} | Format-List
