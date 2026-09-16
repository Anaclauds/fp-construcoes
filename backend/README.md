<div align="center">

# ⚙️ Back-end — FP Construções

### API do Sistema de Gestão FP Construções

<br>

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Language-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-API-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

<br><br>

<img
  src="../assets/equipe/peterson.png"
  width="190"
  alt="Peterson de Almeida Oenning"
/>

### 👨‍💻 Peterson de Almeida Oenning

**Desenvolvimento Back-end**

NestJS • Prisma • MySQL • Swagger

<br>

Responsável pelo desenvolvimento da API, implementação das regras da aplicação e integração com o banco de dados do **Sistema de Gestão FP Construções**.

<br>

<a href="https://github.com/petersonoenning">
  <img
    src="https://img.shields.io/badge/GitHub-Ver%20perfil-181717?style=for-the-badge&logo=github&logoColor=white"
    alt="GitHub Peterson"
  />
</a>

</div>

<br>

---

<div align="center">

[⬅️ **Documentação principal**](../README.md)
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
[🎨 **Documentação do Front-end**](../frontend/README.md)

</div>

---

## 📌 Sobre

O Back-end é responsável pelo **processamento das regras da aplicação, disponibilização da API e persistência dos dados** do Sistema de Gestão FP Construções.

A aplicação será desenvolvida utilizando **NestJS**, com **Prisma ORM** para realizar o mapeamento e acesso ao banco de dados relacional **MySQL**.

---

## 🛠️ Tecnologias

| Tecnologia | Utilização |
| :--- | :--- |
| **NestJS 11** | Desenvolvimento da API |
| **TypeScript** | Linguagem utilizada no Back-end |
| **Prisma ORM** | Mapeamento e acesso ao banco de dados |
| **MySQL 8.4** | Banco de dados relacional |
| **Swagger** | Documentação e testes da API |

---

## 🧩 Estrutura

A aplicação poderá seguir uma estrutura modular semelhante a:

```text
backend/
│
├── prisma/
│   ├── migrations/          # Histórico de alterações do banco
│   └── schema.prisma        # Modelagem utilizada pelo Prisma
│
├── src/
│   ├── modules/             # Módulos da aplicação
│   ├── common/              # Recursos compartilhados
│   ├── app.module.ts
│   └── main.ts
│
├── test/                    # Testes
├── .env.example
├── package.json
└── README.md
```

Os módulos poderão representar diferentes domínios do sistema:

```text
modules/
│
├── clientes/
├── fornecedores/
├── funcionarios/
├── servicos/
├── materiais/
├── orcamentos/
├── projetos/
├── cobrancas/
├── estoque/
├── compras/
└── caixa/
```

> A organização definitiva dos módulos poderá evoluir conforme o desenvolvimento.

---

## 🏛️ Funcionamento

De forma simplificada, uma requisição seguirá o fluxo:

```text
Front-end
   ↓
Requisição HTTP
   ↓
Controller — NestJS
   ↓
Service — Regras da aplicação
   ↓
Prisma ORM
   ↓
MySQL
   ↓
Resposta
   ↓
Front-end
```

Por exemplo:

```text
POST /clientes
       ↓
ClientesController
       ↓
ClientesService
       ↓
Prisma ORM
       ↓
MySQL
       ↓
Cliente cadastrado
       ↓
Resposta HTTP
```

---

## 📡 API REST

A API disponibilizará endpoints para comunicação com o Front-end.

Exemplos:

```http
GET    /clientes
GET    /clientes/:id
POST   /clientes
PUT    /clientes/:id
DELETE /clientes/:id
```

A documentação dos endpoints será disponibilizada utilizando **Swagger**.

---

## 🗄️ Persistência dos dados

O **Prisma ORM** será utilizado entre a aplicação NestJS e o MySQL.

```text
NestJS
   ↓
Service
   ↓
Prisma
   ↓
MySQL
```

O Prisma também será utilizado no gerenciamento das alterações estruturais do banco por meio de **migrations**.

```text
schema.prisma
      ↓
   Migration
      ↓
Alteração da estrutura
      ↓
     MySQL
```

---

## 🚀 Executando o Back-end

### 1. Acesse o diretório

```bash
cd backend
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Utilize como referência:

```text
.env.example
```

### 4. Execute as migrations

```bash
npx prisma migrate dev
```

### 5. Inicie a aplicação

```bash
npm run start:dev
```

---

## 🔐 Variáveis de ambiente

Informações sensíveis não devem ser versionadas.

Exemplo:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/fp_construcoes"
```

O arquivo:

```text
.env
```

deve permanecer no `.gitignore`.

O repositório deve conter somente o `.env.example`, contendo exemplos das variáveis necessárias e **sem credenciais reais**.

---

## 📖 Swagger

O Swagger será utilizado para documentação e visualização dos endpoints disponibilizados pela API.

Por meio dele será possível visualizar informações como:

```text
Endpoint
   │
   ├── Método HTTP
   ├── Parâmetros
   ├── Corpo da requisição
   ├── Possíveis respostas
   └── Códigos de status
```

O endereço da documentação será registrado aqui após a configuração definitiva da aplicação.

---

<div align="center">

### ⚙️ Back-end — FP Construções

**Desenvolvido por Peterson de Almeida Oenning**

NestJS • Prisma • MySQL • Swagger

[⬆️ Voltar ao início](#️-back-end--fp-construções)

</div>