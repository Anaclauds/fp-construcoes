<div align="center">

# 🏗️ Sistema de Gestão — FP Construções

### Desenvolvimento WEB de um Sistema de Gestão para empresa na área de Construção Civil e Serralheria

Projeto desenvolvido como **Trabalho de Conclusão de Curso (TCC)** do curso de **Análise e Desenvolvimento de Sistemas** do Instituto Federal de Educação, Ciência e Tecnologia de Rondônia — **IFRO, Campus Ji-Paraná**.

<br>

![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

![TypeScript](https://img.shields.io/badge/TypeScript-Language-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Git](https://img.shields.io/badge/Git-Versionamento-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-Repositório-181717?style=for-the-badge&logo=github&logoColor=white)

</div>

---

## 🧭 Navegação

<div align="center">

A documentação está organizada entre a visão geral do sistema e as áreas específicas de desenvolvimento.

| 🎨 Front-end | ⚙️ Back-end | 📚 Documentação |
| :---: | :---: | :---: |
| Vue.js • Vite • Bootstrap • Axios | NestJS • Prisma • MySQL • Swagger | Diagramas e documentos |
| [**Acessar Front-end**](./frontend/README.md) | [**Acessar Back-end**](./backend/README.md) | [**Acessar documentação**](./docs/) |

</div>

---

## 📌 Sobre o projeto

O **Sistema de Gestão FP Construções** tem como objetivo apoiar e centralizar os processos administrativos e operacionais da **FP Construções**, empresa que atua nas áreas de **construção civil, serralheria, calhas e rufos**.

Atualmente, parte significativa das informações da empresa é registrada e acompanhada de forma manual e por meio do WhatsApp. O sistema busca proporcionar maior organização e centralização dessas informações, auxiliando no acompanhamento das atividades da empresa.

A aplicação será desenvolvida utilizando arquitetura **cliente-servidor**, com separação entre **Front-end, Back-end e Banco de Dados**.

---

## ✨ Principais funcionalidades

- 👥 Gestão de clientes;
- 🤝 Gestão de fornecedores;
- 👷 Gestão de funcionários;
- 🛠️ Cadastro de serviços;
- 📦 Cadastro de produtos e matérias-primas;
- 🧾 Elaboração e gerenciamento de orçamentos;
- 🏗️ Gerenciamento de projetos;
- 📏 Registro de etapas e medições;
- 💳 Gerenciamento de cobranças;
- ➕ Registro de materiais e serviços extras;
- 🛒 Registro de compras e despesas;
- 📦 Controle de estoque;
- 💰 Controle de caixa;
- 🔐 Gerenciamento de usuários e permissões.

---

# 🛠️ Tecnologias

## 🎨 Front-end

| Tecnologia | Utilização |
| :--- | :--- |
| **Vue.js** | Desenvolvimento da interface web |
| **Vite** | Ambiente de desenvolvimento e geração do build |
| **Bootstrap** | Estilização e responsividade |
| **Axios** | Comunicação HTTP entre Front-end e API |
| **Figma** | Prototipação das interfaces |

## ⚙️ Back-end

| Tecnologia | Utilização |
| :--- | :--- |
| **NestJS 11** | Desenvolvimento da API e regras da aplicação |
| **TypeScript** | Linguagem utilizada no Back-end |
| **Prisma ORM** | Mapeamento e acesso ao banco de dados |
| **Swagger** | Documentação e testes dos endpoints |

## 🗄️ Banco de Dados

| Tecnologia | Utilização |
| :--- | :--- |
| **MySQL 8.4** | Sistema Gerenciador de Banco de Dados relacional |

## 🔧 Desenvolvimento e gerenciamento

| Ferramenta | Utilização |
| :--- | :--- |
| **Git** | Controle de versão |
| **GitHub** | Hospedagem e colaboração no código-fonte |
| **Visual Studio Code** | Ambiente de desenvolvimento |
| **Jira** | Organização e acompanhamento das atividades |
| **Scrum** | Organização do processo de desenvolvimento |

---

# 🏛️ Arquitetura da aplicação

De forma simplificada, a comunicação entre as tecnologias ocorre da seguinte maneira:

```text
┌──────────────────────┐
│       USUÁRIO        │
│      Navegador       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      FRONT-END       │
│       Vue.js         │
│  Vite + Bootstrap    │
└──────────┬───────────┘
           │
         Axios
           │
           │ HTTP / REST
           ▼
┌──────────────────────┐
│       BACK-END       │
│       NestJS         │
│    API + Regras      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        PRISMA        │
│         ORM          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        MySQL         │
│   Banco de Dados     │
└──────────────────────┘
```

O **Front-end** é responsável pela interação com o usuário. O **Axios** realiza as requisições HTTP para a API desenvolvida em **NestJS**, que processa as regras da aplicação. O **Prisma ORM** realiza o mapeamento e acesso aos dados armazenados no **MySQL**.

---

# 📂 Estrutura do repositório

```text
fp-construcoes/
│
├── assets/
│   └── equipe/
│       ├── anaclaudia.png
│       └── peterson.png
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── backend/
│   ├── prisma/
│   ├── src/
│   ├── test/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── diagramas/
│   └── ...
│
├── .gitignore
└── README.md
```

> A estrutura interna poderá evoluir conforme as necessidades identificadas durante o desenvolvimento.

---

# 🌿 Estratégia de versionamento

O projeto utiliza **Git** para controle de versão e **GitHub** para hospedagem e colaboração.

A branch:

```text
main
```

representa a versão principal e estável do projeto.

Novas funcionalidades, correções e alterações devem ser desenvolvidas em branches específicas antes de serem integradas à `main`.

## Padrão de branches

| Prefixo | Finalidade |
| :--- | :--- |
| `feat/` | Nova funcionalidade |
| `fix/` | Correção de erro |
| `docs/` | Alterações na documentação |
| `refactor/` | Refatoração de código |
| `test/` | Criação ou alteração de testes |
| `chore/` | Configurações e tarefas auxiliares |

Exemplos:

```text
feat/cadastro-clientes
feat/orcamentos
feat/controle-caixa
fix/correcao-login
docs/atualizacao-readme
```

---

# 🔄 Fluxo de desenvolvimento

```text
Criar branch
     ↓
Desenvolver
     ↓
Realizar commits
     ↓
Push para o GitHub
     ↓
Pull Request
     ↓
Revisão
     ↓
Merge na main
```

---

# 💬 Padrão de commits

Exemplos de mensagens:

```bash
feat: adiciona cadastro de clientes

feat: implementa tela de orçamento

fix: corrige cálculo do valor total

refactor: reorganiza serviço de clientes

docs: atualiza documentação do projeto

test: adiciona testes de cadastro de cliente
```

Devem ser evitadas mensagens pouco descritivas, como:

```text
alteração
teste
arrumei
agora foi
```

---

# 🚀 Como executar o projeto

## Pré-requisitos

Antes de executar o sistema, é necessário possuir:

- Node.js;
- npm;
- Git;
- MySQL.

Clone o repositório:

```bash
git clone https://github.com/SEU-USUARIO/fp-construcoes.git
```

Acesse o projeto:

```bash
cd fp-construcoes
```

## 🎨 Front-end

```bash
cd frontend
npm install
npm run dev
```

## ⚙️ Back-end

```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```

> As instruções poderão ser atualizadas conforme a configuração definitiva do ambiente.

---

# 🔐 Variáveis de ambiente

Informações sensíveis, como credenciais de banco de dados, não devem ser enviadas ao GitHub.

O arquivo:

```text
.env
```

deve permanecer no `.gitignore`.

O repositório poderá conter:

```text
.env.example
```

para documentar as variáveis necessárias sem expor credenciais reais.

---

# 👩‍💻 Equipe de Desenvolvimento

<p align="center">
  Desenvolvimento realizado em conjunto nas áreas de Front-end e Back-end.
</p>

<br>

<table align="center">
  <tr>
    <td align="center" width="320">
      <img
        src="./assets/equipe/anaclaudia.png"
        width="170"
        alt="Ana Claudia"
      />
      <br><br>
      <strong>👩‍💻 Ana Claudia</strong>
      <br>
      <sub><b>Desenvolvimento Front-end</b></sub>
      <br><br>
      <sub>Vue.js • Vite • Bootstrap • Axios</sub>
      <br><br>
      <a href="https://github.com/Anaclauds">
        <img
          src="https://img.shields.io/badge/GitHub-Ver%20perfil-181717?style=for-the-badge&logo=github&logoColor=white"
          alt="GitHub Ana Claudia"
        />
      </a>
    </td>
    <td align="center" width="320">
      <img
        src="./assets/equipe/peterson.png"
        width="170"
        alt="Peterson de Almeida Oenning"
      />
      <br><br>
      <strong>👨‍💻 Peterson de Almeida Oenning</strong>
      <br>
      <sub><b>Desenvolvimento Back-end</b></sub>
      <br><br>
      <sub>NestJS • Prisma • MySQL • Swagger</sub>
      <br><br>
      <a href="https://github.com/petersonoenning">
        <img
          src="https://img.shields.io/badge/GitHub-Ver%20perfil-181717?style=for-the-badge&logo=github&logoColor=white"
          alt="GitHub Peterson"
        />
      </a>
    </td>
  </tr>
</table>

<br>

<div align="center">

### 🎓 Orientação

**Prof. Jackson Henrique**  
Orientador do Trabalho de Conclusão de Curso

### 🏗️ Product Owner / Cliente

**Francisco Pereira da Silva**  
Proprietário da FP Construções

</div>

---

# 🎓 Contexto acadêmico

| Informação | Descrição |
| :--- | :--- |
| **Curso** | Análise e Desenvolvimento de Sistemas |
| **Instituição** | Instituto Federal de Educação, Ciência e Tecnologia de Rondônia — IFRO |
| **Campus** | Ji-Paraná |
| **Projeto** | Trabalho de Conclusão de Curso |
| **Empresa** | FP Construções |
| **Área** | Construção Civil e Serralheria |

---

# 📊 Status do projeto

### 🟡 Em desenvolvimento

```text
Levantamento de requisitos       ✅ Concluído
Prototipação no Figma            ✅ Concluída
Modelagem do banco               ✅ Realizada
TCC I                            ✅ Aprovado
Desenvolvimento Front-end        🚧 Em desenvolvimento
Desenvolvimento Back-end         🚧 Em desenvolvimento
Integração Front + Back          ⏳ Planejada
Testes                           ⏳ Planejados
Implantação                      ⏳ Planejada
```

---

# ☁️ Implantação

A implantação do sistema está prevista em ambiente de nuvem utilizando a **Oracle Cloud Infrastructure (OCI)**.

```text
Internet
   │
   ▼
Oracle Cloud Infrastructure
   │
   ▼
VM Linux
   │
   ├── Front-end
   ├── Back-end
   └── Banco de Dados
```

As configurações definitivas serão documentadas conforme a evolução do projeto.

---

<div align="center">

## 🏗️ FP Construções

### Tecnologia aplicada à gestão da construção civil e serralheria.

<br>

Desenvolvido por **Ana Claudia & Peterson de Almeida Oenning**

🎓 **Análise e Desenvolvimento de Sistemas — IFRO**

</div>