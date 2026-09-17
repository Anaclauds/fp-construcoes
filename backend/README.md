<div align="center">

# Back-end - FP Construções

### API do Sistema de Gestão FP Construções

<br>

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Language-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

<br><br>

<img
  src="../assets/equipe/peterson.png"
  width="190"
  alt="Peterson de Almeida Oenning"
/>

### Peterson de Almeida Oenning

**Desenvolvimento Back-end**

NestJS | Prisma | MySQL | Swagger

<br>

API responsável pelas regras da aplicação, autenticação, autorização,
integrações e persistência dos dados do **Sistema de Gestão FP Construções**.

<br>

<a href="https://github.com/petersonoenning">
  <img
    src="https://img.shields.io/badge/GitHub-Ver%20perfil-181717?style=for-the-badge&logo=github&logoColor=white"
    alt="GitHub Peterson"
  />
</a>

</div>

---

<div align="center">

[**Documentação principal**](../README.md)
&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
[**Documentação do Front-end**](../frontend/README.md)

</div>

---

## Sumário

1. [Sobre a API](#sobre-a-api)
2. [Tecnologias](#tecnologias)
3. [Pré-requisitos](#pré-requisitos)
4. [Clonando o repositório](#clonando-o-repositório)
5. [Instalando os pacotes](#instalando-os-pacotes)
6. [Preparando o MySQL](#preparando-o-mysql)
7. [Configurando as variáveis de ambiente](#configurando-as-variáveis-de-ambiente)
8. [Preparando o Prisma e os dados iniciais](#preparando-o-prisma-e-os-dados-iniciais)
9. [Executando a API](#executando-a-api)
10. [Acessando a API e o Swagger](#acessando-a-api-e-o-swagger)
11. [Autenticação inicial](#autenticação-inicial)
12. [Integração com o Front-end](#integração-com-o-front-end)
13. [Executando Front-end e Back-end juntos](#executando-front-end-e-back-end-juntos)
14. [Testes automatizados](#testes-automatizados)
15. [Principais comandos](#principais-comandos)
16. [Estrutura do Back-end](#estrutura-do-back-end)
17. [Módulos disponíveis](#módulos-disponíveis)
18. [Migrations durante o desenvolvimento](#migrations-durante-o-desenvolvimento)
19. [Solução de problemas](#solução-de-problemas)
20. [Segurança e versionamento](#segurança-e-versionamento)
21. [Documentação complementar](#documentação-complementar)

---

## Sobre a API

O Back-end foi desenvolvido em TypeScript com NestJS e segue uma organização
modular. Ele é responsável por:

- receber e responder requisições HTTP;
- validar os dados de entrada;
- executar as regras da aplicação;
- autenticar usuários com JWT;
- autorizar operações conforme as permissões do usuário;
- consultar serviços externos, como a busca de CEP;
- acessar o MySQL por meio do Prisma ORM;
- gerar relatórios em PDF e Excel;
- disponibilizar o contrato da API pelo Swagger UI.

O fluxo simplificado é:

```text
Front-end Vue
     |
     | HTTP + JSON + JWT
     v
Controller NestJS
     |
     v
Service / regras da aplicação
     |
     v
Prisma Client
     |
     v
MySQL
```

---

## Tecnologias

| Tecnologia | Finalidade |
| :--- | :--- |
| **Node.js** | Ambiente de execução do Back-end |
| **NestJS 11** | Framework da API e organização modular |
| **TypeScript** | Linguagem do código-fonte |
| **Prisma ORM 7** | Modelagem, migrations e acesso tipado aos dados |
| **MySQL 8.4** | Banco de dados relacional |
| **JWT + Passport** | Autenticação das requisições |
| **bcrypt** | Hash seguro das senhas |
| **class-validator** | Validação dos DTOs |
| **Swagger / OpenAPI** | Documentação e testes manuais dos endpoints |
| **Jest + Supertest** | Testes unitários e de integração |
| **PDFKit + ExcelJS** | Geração de relatórios PDF e Excel |

Todos os pacotes JavaScript necessários já estão declarados em `package.json` e
travados em `package-lock.json`. Eles não devem ser instalados individualmente.
O comando `npm ci` instala automaticamente as versões registradas no projeto.

### Pacotes de execução instalados pelo npm

```text
@nestjs/common
@nestjs/config
@nestjs/core
@nestjs/jwt
@nestjs/passport
@nestjs/platform-express
@nestjs/swagger
@prisma/adapter-mariadb
@prisma/client
bcrypt
class-transformer
class-validator
dotenv
exceljs
mariadb
passport
passport-jwt
pdfkit
reflect-metadata
rxjs
swagger-ui-express
```

### Pacotes de desenvolvimento e testes instalados pelo npm

```text
@eslint/eslintrc
@eslint/js
@nestjs/cli
@nestjs/schematics
@nestjs/testing
@types/bcrypt
@types/express
@types/jest
@types/node
@types/passport-jwt
@types/pdfkit
@types/supertest
eslint
eslint-config-prettier
eslint-plugin-prettier
globals
jest
prettier
prisma
source-map-support
supertest
ts-jest
ts-loader
ts-node
tsconfig-paths
typescript
typescript-eslint
```

As versões exatas devem ser consultadas em `package.json` e
`package-lock.json`. A equipe não precisa executar um comando para cada pacote.

---

## Pré-requisitos

Instale no computador:

1. **Git**;
2. **Node.js 24 LTS**;
3. **npm**, instalado junto com o Node.js;
4. **MySQL Community Server 8.4**;
5. **MySQL Workbench**, recomendado para administrar o banco visualmente;
6. **Visual Studio Code**, recomendado para o desenvolvimento.

O projeto foi validado localmente com Node.js 24 e npm 11. Outras versões podem
funcionar, mas utilizar a mesma versão principal reduz diferenças entre os
computadores da equipe.

### Downloads oficiais para Windows

| Ferramenta | Download oficial |
| :--- | :--- |
| Git | [git-scm.com/download/win](https://git-scm.com/download/win) |
| Node.js 24 LTS | [nodejs.org/en/download](https://nodejs.org/en/download) |
| MySQL Community Server | [dev.mysql.com/downloads/mysql](https://dev.mysql.com/downloads/mysql/) |
| MySQL Workbench | [dev.mysql.com/downloads/workbench](https://dev.mysql.com/downloads/workbench/) |
| Visual Studio Code | [code.visualstudio.com/download](https://code.visualstudio.com/download) |

### Instalação recomendada

1. Instale o Git para Windows mantendo a integração com o terminal e o PATH.
2. Instale a versão **LTS** do Node.js com o npm incluído.
3. Na página do MySQL Community Server, selecione a série **8.4 LTS**, Windows e
   o instalador MSI de 64 bits.
4. Durante a configuração do MySQL, mantenha a porta `3306`, configure o serviço
   para iniciar com o Windows e guarde a senha definida para o usuário `root`.
5. Instale o MySQL Workbench e crie uma conexão para `localhost:3306`.
6. Instale o VS Code e abra a pasta raiz `fp-construcoes`, não apenas um arquivo
   isolado.

> O MySQL Installer geral pode oferecer outra série do servidor. Para manter a
> tecnologia definida no projeto, selecione explicitamente o MySQL Community
> Server 8.4 LTS na página oficial do servidor.

Confira a instalação pelo terminal:

```powershell
git --version
node --version
npm --version
```

Se o comando `mysql` estiver configurado no PATH, também é possível verificar:

```powershell
mysql --version
```

> O MySQL precisa estar instalado e com o serviço em execução antes de iniciar a
> API. O Prisma não instala o MySQL.

---

## Clonando o repositório

Clone o repositório oficial:

```powershell
git clone https://github.com/Anaclauds/fp-construcoes.git
cd fp-construcoes
```

Entre na pasta do Back-end:

```powershell
cd backend
```

No VS Code, também é possível utilizar `Ctrl + Shift + P`, selecionar
`Git: Clone` e informar a URL do repositório.

---

## Instalando os pacotes

Dentro de `backend/`, execute:

```powershell
npm ci
```

O `npm ci` utiliza o `package-lock.json`, instala todas as dependências e mantém
o ambiente dos integrantes da equipe mais consistente.

Ele criará a pasta local:

```text
node_modules/
```

Essa pasta é necessária para executar o projeto, mas é recriada em cada
computador e não deve ser enviada ao GitHub.

Caso o PowerShell bloqueie o comando `npm`, utilize:

```powershell
npm.cmd ci
```

> Não execute `npm audit fix --force` sem uma análise conjunta da equipe. Esse
> comando pode trocar versões principais e causar incompatibilidades.

---

## Preparando o MySQL

### O banco é criado automaticamente?

O **MySQL precisa ser instalado manualmente**. O banco principal
`fp_construcoes` também deve ser criado uma vez no computador de cada
desenvolvedor.

Depois disso, as migrations do Prisma criam automaticamente todas as tabelas,
campos, chaves, relacionamentos e restrições dentro desse banco.

O banco de testes pode ser criado automaticamente pela configuração de testes,
desde que o usuário do MySQL possua permissão para criar bancos. Mesmo assim,
criá-lo antecipadamente deixa a preparação mais previsível.

### Criando os bancos pelo MySQL Workbench

1. Abra o MySQL Workbench.
2. Entre na conexão local do MySQL.
3. Abra uma nova aba SQL.
4. Execute:

```sql
CREATE DATABASE IF NOT EXISTS fp_construcoes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS fp_construcoes_test
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

5. Atualize a lista de schemas e confirme que os dois bancos aparecem.

### Criando pelo terminal do MySQL

Se o cliente do MySQL estiver no PATH:

```powershell
mysql -u root -p
```

Digite a senha configurada durante a instalação e execute o mesmo SQL apresentado
acima. Para sair:

```sql
exit;
```

---

## Configurando as variáveis de ambiente

Na pasta `backend/`, crie o arquivo local `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

No Prompt de Comando, o equivalente é:

```bat
copy .env.example .env
```

Abra o novo `.env` e substitua os valores de exemplo pelas configurações do
MySQL instalado no computador:

```env
DATABASE_URL="mysql://root:SENHA_DO_MYSQL@localhost:3306/fp_construcoes?allowPublicKeyRetrieval=true"
DATABASE_URL_TEST="mysql://root:SENHA_DO_MYSQL@localhost:3306/fp_construcoes_test?allowPublicKeyRetrieval=true"
PORT=3000
JWT_SECRET="UMA_CHAVE_LOCAL_LONGA_E_DIFICIL_DE_ADIVINHAR"
JWT_EXPIRES_IN="8h"
SEED_ADMIN_PASSWORD="UMA_SENHA_LOCAL_COM_PELO_MENOS_8_CARACTERES"
```

### Significado das variáveis

| Variável | Obrigatória | Finalidade |
| :--- | :---: | :--- |
| `DATABASE_URL` | Sim | Conexão da aplicação com o banco principal |
| `DATABASE_URL_TEST` | Para testes E2E | Conexão exclusiva com o banco de testes |
| `PORT` | Não | Porta da API; o padrão é `3000` |
| `JWT_SECRET` | Sim | Chave usada para assinar e validar os tokens JWT |
| `JWT_EXPIRES_IN` | Não | Referência da duração desejada; a implementação atual utiliza 8 horas |
| `SEED_ADMIN_PASSWORD` | Para criar o administrador | Senha inicial; deve possuir no mínimo 8 caracteres |
| `SEED_ADMIN_CPF` | Não | Login inicial; se omitido, utiliza `00000000000` |

Para escolher outro login fictício de desenvolvimento, é possível acrescentar:

```env
SEED_ADMIN_CPF="00000000000"
```

Não utilize CPF, senha ou qualquer dado real durante o desenvolvimento.

Se a senha do MySQL contiver caracteres reservados de URL, como `@`, `:`, `/`,
`#` ou `%`, eles precisam ser codificados na `DATABASE_URL`. Uma alternativa para
o ambiente local é criar um usuário MySQL exclusivo para o projeto com uma senha
forte compatível com URL.

O parâmetro `allowPublicKeyRetrieval=true` permite a autenticação local com o
plugin padrão de versões atuais do MySQL. Ele deve ser utilizado somente em um
ambiente de desenvolvimento confiável. A conexão de produção deverá usar as
configurações seguras definidas para a infraestrutura de implantação.

> O `.env` nunca deve ser enviado ao GitHub. Somente o `.env.example` é
> versionado.

---

## Preparando o Prisma e os dados iniciais

Execute os comandos abaixo dentro de `backend/`.

### 1. Gerar o Prisma Client

```powershell
npm run prisma:generate
```

Esse comando gera a interface utilizada pelos services para acessar o banco.

### 2. Aplicar as migrations existentes

```powershell
npx prisma migrate deploy
```

Esse comando lê o histórico em `prisma/migrations/` e cria a estrutura completa
no banco `fp_construcoes`.

Ele altera a estrutura do banco, mas não cria o servidor MySQL. O MySQL e o banco
`fp_construcoes` precisam existir conforme a seção anterior.

### 3. Inserir os dados iniciais

```powershell
npm run prisma:seed
```

O seed:

- cria ou atualiza um funcionário administrador fictício;
- cria o usuário inicial quando `SEED_ADMIN_PASSWORD` está configurada;
- concede as permissões administrativas dos módulos;
- cadastra materiais e serviços fictícios para desenvolvimento;
- prepara quantidades fictícias de estoque.

O seed utiliza operações idempotentes nas informações principais e pode ser
executado novamente durante a preparação do ambiente.

### 4. Inspecionar o banco visualmente, se necessário

```powershell
npm run prisma:studio
```

O Prisma Studio é uma ferramenta de desenvolvimento. Ele não substitui as telas
do sistema e não deve ser exposto em produção.

---

## Executando a API

Para executar em modo de desenvolvimento, com reinício automático após mudanças:

```powershell
npm run start:dev
```

Saída esperada: a aplicação inicia sem erro e passa a aceitar requisições na porta
configurada no `.env`.

Para interromper a execução:

```text
Ctrl + C
```

### Execução de produção local

Gere o build:

```powershell
npm run build
```

Execute o código compilado:

```powershell
npm run start:prod
```

O fluxo de produção definitivo será complementado quando a implantação na OCI
for configurada.

---

## Acessando a API e o Swagger

Com `PORT=3000`:

| Recurso | Endereço |
| :--- | :--- |
| Verificação da API | `http://localhost:3000/api` |
| Swagger UI | `http://localhost:3000/docs` |
| Base da API para o Front-end | `http://localhost:3000/api` |

O prefixo global de todos os endpoints da aplicação é:

```text
/api
```

Exemplos:

```http
POST  /api/auth/login
GET   /api/auth/me
GET   /api/clientes
POST  /api/clientes
GET   /api/clientes/:id
PATCH /api/clientes/:id
PATCH /api/clientes/:id/desativar
PATCH /api/clientes/:id/reativar
```

O Swagger é o contrato navegável da API e deve ser consultado para verificar os
campos, filtros, respostas e códigos de cada endpoint.

---

## Autenticação inicial

Após executar o seed, o login inicial de desenvolvimento é:

```text
Login: valor de SEED_ADMIN_CPF ou 00000000000
Senha: valor definido em SEED_ADMIN_PASSWORD
```

Esses dados devem ser fictícios e utilizados apenas no ambiente local.

Endpoint de autenticação:

```http
POST /api/auth/login
Content-Type: application/json
```

Corpo:

```json
{
  "login": "00000000000",
  "senha": "A_SENHA_DEFINIDA_NO_ENV"
}
```

A resposta contém o `accessToken` e os dados do usuário autenticado. Nas rotas
protegidas, envie:

```http
Authorization: Bearer ACCESS_TOKEN
```

No Swagger, clique em **Authorize** e informe o token conforme o campo exibido
pela interface.

---

## Integração com o Front-end

O Front-end Vue e o Back-end são executados em processos separados. Em ambiente
local, a configuração recomendada para o Front-end é:

```env
VITE_API_URL="http://localhost:3000/api"
```

Esse arquivo pertence à pasta `frontend/` e também deve ficar fora do Git quando
contiver configurações específicas do computador.

Exemplo de instância Axios no Front-end:

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
```

Após o login, o Front-end deve anexar o token nas requisições protegidas:

```ts
api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
```

Fluxo esperado:

```text
Vue envia a requisição
        |
        v
Axios usa http://localhost:3000/api
        |
        v
NestJS valida JWT, permissão e DTO
        |
        v
Service aplica as regras
        |
        v
Prisma acessa o MySQL
        |
        v
Resposta JSON retorna ao Vue
```

O Back-end está com CORS habilitado para permitir a comunicação local com o
servidor de desenvolvimento do Vite. As regras de origem deverão ser restringidas
antes da implantação pública.

---

## Executando Front-end e Back-end juntos

Abra o repositório `fp-construcoes` no VS Code e utilize dois terminais.

### Terminal 1 - Back-end

```powershell
cd backend
npm run start:dev
```

### Terminal 2 - Front-end

Depois que a estrutura Vue estiver disponível:

```powershell
cd frontend
npm ci
npm run dev
```

Normalmente o Vite exibirá um endereço semelhante a:

```text
http://localhost:5173
```

Para a integração funcionar:

1. o serviço do MySQL deve estar ativo;
2. a API deve estar ativa na porta `3000` ou na porta configurada;
3. o Front-end deve usar a mesma base definida em `VITE_API_URL`;
4. as migrations precisam ter sido aplicadas;
5. o seed precisa ter criado um usuário para o primeiro login.

---

## Testes automatizados

### Atenção ao banco de testes

Os testes de integração utilizam `DATABASE_URL_TEST`. O nome do banco precisa
conter a palavra `test`. Essa proteção reduz o risco de executar testes contra o
banco de desenvolvimento.

Durante os testes, os dados do banco de testes podem ser criados, alterados ou
removidos. Nunca aponte `DATABASE_URL_TEST` para um banco com dados importantes.

O preparo dos testes E2E:

1. conecta ao servidor MySQL;
2. cria `fp_construcoes_test` automaticamente, se necessário e permitido;
3. aplica as migrations nesse banco;
4. executa os cenários automatizados.

### Testes unitários

```powershell
npm test -- --runInBand
```

### Testes de integração / E2E

```powershell
npm run test:e2e -- --runInBand
```

### Todos os testes

```powershell
npm run test:all
```

### Testes E2E com cobertura

```powershell
npm run test:e2e:coverage
```

O relatório HTML é gerado localmente em:

```text
coverage/e2e/lcov-report/index.html
```

A pasta `coverage/` é gerada automaticamente e não deve ser enviada ao GitHub.

---

## Principais comandos

| Comando | Finalidade |
| :--- | :--- |
| `npm ci` | Instala exatamente as dependências do lockfile |
| `npm run start:dev` | Inicia a API em desenvolvimento |
| `npm run build` | Compila o TypeScript |
| `npm run start:prod` | Executa o build compilado |
| `npm run lint` | Verifica e corrige o padrão do código |
| `npm run format` | Formata `src/` e `test/` com Prettier |
| `npm test` | Executa os testes unitários |
| `npm run test:e2e` | Executa os testes de integração |
| `npm run test:all` | Executa testes unitários e E2E |
| `npm run test:e2e:coverage` | Executa E2E e gera cobertura |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate -- --name nome` | Cria uma nova migration em desenvolvimento |
| `npx prisma migrate deploy` | Aplica migrations já existentes |
| `npm run prisma:seed` | Insere os dados iniciais fictícios |
| `npm run prisma:studio` | Abre a interface local do Prisma |

---

## Estrutura do Back-end

```text
backend/
|
|-- docs/                 # Decisões e guias de integração
|-- prisma/
|   |-- migrations/       # Histórico versionado da estrutura do banco
|   |-- schema.prisma     # Modelos, relações, enums e restrições
|   `-- seed.js           # Dados iniciais fictícios
|-- src/
|   |-- auth/             # Login, JWT e autorização
|   |-- clientes/
|   |-- cobrancas/
|   |-- despesas/
|   |-- enderecos/
|   |-- equipamentos/
|   |-- estoque/
|   |-- financeiro/
|   |-- fornecedores/
|   |-- frequencias/
|   |-- funcionarios/
|   |-- materiais/
|   |-- orcamentos/
|   |-- prisma/           # PrismaService e módulo compartilhado
|   |-- projetos/
|   |-- servicos/
|   |-- usuarios/
|   |-- app.module.ts
|   `-- main.ts
|-- test/                 # Configuração e cenários E2E
|-- .env.example          # Modelo seguro de configuração
|-- package.json          # Scripts e dependências
|-- package-lock.json     # Versões reproduzíveis
|-- prisma.config.ts      # Configuração do Prisma CLI
`-- README.md
```

As pastas `node_modules/`, `dist/`, `coverage/`, `generated/` e `logs/` são
locais ou geradas automaticamente e não devem ser versionadas.

---

## Módulos disponíveis

| Área | Rota base |
| :--- | :--- |
| Sistema | `/api` |
| Autenticação | `/api/auth` |
| Usuários e permissões | `/api/usuarios` |
| Funcionários | `/api/funcionarios` |
| Frequências | `/api/frequencias` |
| Clientes | `/api/clientes` |
| Endereços e CEP | `/api/enderecos` |
| Orçamentos | `/api/orcamentos` |
| Cobranças | `/api/cobrancas` |
| Projetos | `/api/projetos` |
| Serviços | `/api/servicos` |
| Materiais | `/api/materiais` |
| Estoque | `/api/estoque` |
| Equipamentos | `/api/equipamentos` |
| Fornecedores | `/api/fornecedores` |
| Despesas | `/api/despesas` |
| Financeiro e caixa | `/api/financeiro` |

Os métodos e subcaminhos completos devem ser consultados no Swagger, pois ele é
gerado diretamente a partir dos controllers da aplicação.

---

## Migrations durante o desenvolvimento

Existem dois fluxos diferentes.

### Aplicar a estrutura já versionada

Quem acabou de clonar o projeto deve executar:

```powershell
npx prisma migrate deploy
```

### Alterar a estrutura do banco

Somente quando houver mudança intencional no `schema.prisma`, como tabela, campo,
relacionamento, enum ou restrição, o responsável pelo Back-end cria uma migration:

```powershell
npm run prisma:migrate -- --name descricao_da_alteracao
```

Depois devem ser revisados e versionados:

```text
prisma/schema.prisma
prisma/migrations/
```

Um cadastro, uma consulta ou uma atualização comum usa o Prisma Client e modifica
os dados. Essas operações não criam migrations.

---

## Solução de problemas

### `Environment variable not found: DATABASE_URL`

Confirme que o arquivo abaixo existe:

```text
backend/.env
```

Ele deve estar na mesma pasta de `package.json` e `prisma.config.ts`.

### `Unknown database 'fp_construcoes'`

O servidor MySQL está acessível, mas o banco ainda não foi criado. Execute o SQL
da seção [Preparando o MySQL](#preparando-o-mysql).

### `Access denied for user`

Revise usuário e senha nas URLs do `.env`. Confirme também se o usuário possui
permissões sobre os bancos principal e de testes.

### Não foi possível conectar ao MySQL

Confirme:

- se o MySQL está instalado;
- se o serviço do MySQL está em execução;
- se a porta é `3306` ou a porta configurada localmente;
- se `localhost` está correto;
- se firewall ou outra instalação não está bloqueando a porta.

### Porta `3000` já está em uso

Altere no `.env`:

```env
PORT=3001
```

Depois atualize o Front-end:

```env
VITE_API_URL="http://localhost:3001/api"
```

### `npm` bloqueado pelo PowerShell

Use a variante `.cmd`:

```powershell
npm.cmd ci
npm.cmd run start:dev
```

Também é possível revisar a política de execução do PowerShell conforme as regras
do próprio computador.

### Prisma Client desatualizado

Após receber mudanças no schema ou trocar de branch:

```powershell
npm run prisma:generate
npx prisma migrate deploy
```

### O login inicial não funciona

1. Confira se `SEED_ADMIN_PASSWORD` possui pelo menos 8 caracteres.
2. Execute novamente `npm run prisma:seed`.
3. Use `SEED_ADMIN_CPF` ou o padrão `00000000000` como login.
4. Use exatamente a senha definida no `.env`.

### O Front-end não consegue acessar a API

Confira:

- se `npm run start:dev` está ativo no Back-end;
- se `http://localhost:3000/api` abre no navegador;
- se `VITE_API_URL` inclui `/api`;
- se a porta configurada no Front-end é a mesma da API;
- se o token foi enviado como `Authorization: Bearer TOKEN`;
- se o usuário possui permissão para o módulo solicitado.

---

## Segurança e versionamento

Nunca envie ao GitHub:

```text
.env
node_modules/
dist/
coverage/
generated/
logs/
```

Também não devem ser versionados:

- senhas reais;
- credenciais do MySQL;
- tokens JWT;
- chaves privadas;
- dados reais de clientes, funcionários ou fornecedores;
- relatórios contendo informações pessoais reais.

Durante o desenvolvimento, utilize somente dados fictícios e descartáveis.

Para novas atividades, utilize branches específicas, por exemplo:

```text
feat/backend-orcamentos
fix/backend-autenticacao
test/backend-clientes
docs/backend-execucao
```

Exemplo de commit:

```text
feat(backend): adiciona implementação inicial da API
```

---

## Documentação complementar

| Documento | Conteúdo |
| :--- | :--- |
| [`docs/DECISOES_INTEGRACAO_FIGMA_API.md`](docs/DECISOES_INTEGRACAO_FIGMA_API.md) | Decisões funcionais alinhadas ao protótipo |
| [`docs/GUIA_INTEGRACAO_FRONTEND.md`](docs/GUIA_INTEGRACAO_FRONTEND.md) | Contratos e orientações para integração com o Front-end |
| [`docs/SETUP_WINDOWS.md`](docs/SETUP_WINDOWS.md) | Referência resumida de configuração no Windows |
| [`docs/PANORAMA_TESTES_AUTOMATIZADOS.md`](docs/PANORAMA_TESTES_AUTOMATIZADOS.md) | Estratégia e cobertura dos testes |
| [`docs/RELATORIO_TESTES_INTEGRADOS.md`](docs/RELATORIO_TESTES_INTEGRADOS.md) | Registro dos cenários de integração verificados |

---

<div align="center">

### Back-end - FP Construções

**Desenvolvido por Peterson de Almeida Oenning**

NestJS | Prisma | MySQL | Swagger

[Voltar ao início](#back-end---fp-construções)

</div>
