<div align="center">

# ⚙️ Back-end — FP Construções

API do **Sistema de Gestão FP Construções**.

<br>

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Language-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-API-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

</div>

[⬅️ Voltar para a documentação principal](../README.md)  
[🎨 Ver documentação do Front-end](../frontend/README.md)

---

## 📌 Sobre

O Back-end é responsável pelo **processamento das regras da aplicação, disponibilização da API e persistência dos dados** do Sistema de Gestão FP Construções.

A aplicação será desenvolvida utilizando **NestJS**, com **Prisma ORM** para acesso ao banco de dados relacional **MySQL**.

---

## 🛠️ Tecnologias

| Tecnologia | Utilização |
| :--- | :--- |
| **NestJS 11** | Desenvolvimento da API |
| **TypeScript** | Linguagem de programação |
| **Prisma ORM** | Mapeamento e acesso ao banco de dados |
| **MySQL 8.4** | Banco de dados relacional |
| **Swagger** | Documentação e testes da API |

---

## 🧩 Estrutura

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
├── orcamentos/
├── projetos/
├── estoque/
├── cobrancas/
└── caixa/
```

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

Exemplo:

```text
POST /clientes
       ↓
ClientesController
       ↓
ClientesService
       ↓
Prisma
       ↓
MySQL
       ↓
Cliente cadastrado
```

---

## 📡 API REST

Exemplos de endpoints:

```http
GET    /clientes
GET    /clientes/:id
POST   /clientes
PUT    /clientes/:id
DELETE /clientes/:id
```

A documentação dos endpoints será disponibilizada utilizando **Swagger**.

---

## 🚀 Executando o Back-end

Acesse o diretório:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Configure as variáveis de ambiente utilizando como referência:

```text
.env.example
```

Execute as migrations:

```bash
npx prisma migrate dev
```

Inicie a aplicação:

```bash
npm run start:dev
```

---

## 🔐 Variáveis de ambiente

Informações sensíveis não devem ser versionadas.

Exemplo de variável:

```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/fp_construcoes"
```

O arquivo:

```text
.env
```

deve permanecer no `.gitignore`.

O repositório deve conter somente o `.env.example` com exemplos das variáveis necessárias e **sem credenciais reais**.

---

## 👨‍💻 Responsável

**Peterson de Almeida Oenning**  
Desenvolvimento Back-end

**Análise e Desenvolvimento de Sistemas — IFRO**