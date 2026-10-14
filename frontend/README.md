<div align="center">

# 🎨 Front-end — FP Construções

### Interface web do Sistema de Gestão FP Construções

<br>

![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=for-the-badge&logo=axios&logoColor=white)

<br><br>

<img
  src="../assets/equipe/anaclaudia.png"
  width="190"
  alt="Ana Claudia"
/>

### 👩‍💻 Ana Claudia

**Desenvolvimento Front-end**

Vue.js • Vite • Bootstrap • Axios

<br>

Responsável pelo desenvolvimento da interface e pela integração do Front-end com a API do **Sistema de Gestão FP Construções**.

<br>

<a href="https://github.com/Anaclauds">
  <img
    src="https://img.shields.io/badge/GitHub-Ver%20perfil-181717?style=for-the-badge&logo=github&logoColor=white"
    alt="GitHub Ana Claudia"
  />
</a>

</div>

<br>

---

<div align="center">

[⬅️ **Documentação principal**](../README.md)
&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;
[⚙️ **Documentação do Back-end**](../backend/README.md)

</div>

---

## 📌 Sobre

O Front-end é responsável pela **interface e interação do usuário com o Sistema de Gestão FP Construções**.

A aplicação transforma os dados e funcionalidades disponibilizados pelo Back-end em interfaces que permitem ao usuário cadastrar, consultar, editar e acompanhar as informações da empresa.

As interfaces foram inicialmente prototipadas no **Figma** e serão implementadas utilizando **Vue.js**.

---

## 🛠️ Tecnologias

| Tecnologia | Utilização |
| :--- | :--- |
| **Vue.js** | Construção da interface e dos componentes |
| **Vite** | Ambiente de desenvolvimento e geração do build |
| **Bootstrap** | Estilização e responsividade |
| **Axios** | Comunicação HTTP com a API |
| **Figma** | Prototipação das interfaces |

---

## 🧩 Estrutura

A aplicação poderá seguir uma estrutura semelhante a:

```text
frontend/
│
├── public/
│
├── src/
│   ├── assets/          # Imagens, ícones e arquivos estáticos
│   ├── components/      # Componentes reutilizáveis
│   ├── views/           # Páginas/telas da aplicação
│   ├── services/        # Comunicação com a API
│   ├── router/          # Rotas da aplicação
│   ├── App.vue
│   └── main.js
│
├── .env.example
├── package.json
└── README.md
```

> A estrutura poderá ser adaptada conforme as necessidades identificadas durante o desenvolvimento.

---

## 🧱 Componentização

A utilização do Vue.js permite organizar a interface por meio de componentes reutilizáveis.

Alguns exemplos previstos para o sistema:

```text
components/
│
├── MenuLateral
├── BotaoSalvar
├── BotaoCancelar
├── CampoData
├── MensagemConfirmacao
└── ...
```

A componentização contribui para o reaproveitamento de elementos e facilita a manutenção da interface.

---

## ⚡ Reatividade

O Vue.js permitirá que a interface seja atualizada automaticamente quando o estado dos dados for alterado.

Um exemplo no sistema é o orçamento:

```text
Quantidade do material
          +
Valor unitário
          ↓
     Alteração
          ↓
Vue atualiza o estado
          ↓
Total do orçamento é recalculado
          ↓
Interface é atualizada
```

---

## 🔄 Comunicação com o Back-end

A comunicação com a API será realizada utilizando **Axios**.

```text
Usuário
   ↓
Interface Vue.js
   ↓
Axios
   ↓
API REST — NestJS
   ↓
Prisma ORM
   ↓
MySQL
```

Principais operações HTTP:

| Método | Utilização |
| :--- | :--- |
| `GET` | Consultar dados |
| `POST` | Cadastrar dados |
| `PUT` | Atualizar dados |
| `DELETE` | Excluir dados |

Exemplo:

```text
Usuário preenche cadastro
          ↓
Componente Vue
          ↓
Axios
          ↓
POST /clientes
          ↓
API NestJS
          ↓
Resposta da API
          ↓
Interface apresenta o resultado
```

---

## 🚀 Executando o Front-end

### Pré-requisitos

- **Node.js 20.19+ ou 22.12+** (exigido pelo Vite). Confira com `node -v`.
- **Back-end rodando** (veja a [documentação do Back-end](../backend/README.md)). Sem a API, a tela de login abre, mas não entra.

### 1. Acesse o diretório

```bash
cd frontend
```

### 2. Instale as dependências

```bash
npm ci
```

> `npm ci` instala exatamente as versões do `package-lock.json`. Use `npm install` só para adicionar ou atualizar pacotes.

### 3. Configure o endereço da API (opcional)

Copie o arquivo de exemplo:

```bash
# Linux/macOS/Git Bash
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Sem o `.env`, o front usa `http://localhost:3000/api`, o endereço padrão do back-end local. Só altere `VITE_API_URL` se a API estiver em outro endereço ou porta.

### 4. Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

Acesse **http://localhost:5173** e entre com um usuário cadastrado no back-end (o seed do back-end cria o administrador inicial; veja `SEED_ADMIN_CPF` e `SEED_ADMIN_PASSWORD` no `.env` do back-end).

### Problemas comuns

| Sintoma | Causa provável |
| :--- | :--- |
| Login mostra "Sem conexão com o servidor" | Back-end parado ou `VITE_API_URL` errado |
| `npm ci` ou `npm run dev` reclama da versão do Node | Node abaixo de 20.19 |
| "Muitas tentativas" no login | Limite de tentativas do back-end; aguarde 1 minuto |
| Porta 5173 ocupada | Outro `npm run dev` aberto; o Vite sugere outra porta |

---

## 📦 Build de produção

Para gerar os arquivos otimizados da aplicação:

```bash
npm run build
```

O Vite será responsável por gerar o build utilizado posteriormente no ambiente de produção.

---

## 🔐 Variáveis de ambiente

As configurações específicas do ambiente devem ser armazenadas em um arquivo `.env`.

Exemplo:

```env
VITE_API_URL=http://localhost:3000/api
```

Se a variável não for definida, o front usa esse mesmo endereço.

> ⚠️ Arquivos `.env` com informações reais não devem ser enviados ao GitHub.

O arquivo `.env.example` poderá ser utilizado para documentar as variáveis necessárias.

---

<div align="center">

### 🎨 Front-end — FP Construções

**Desenvolvido por Ana Claudia**

Vue.js • Vite • Bootstrap • Axios

[⬆️ Voltar ao início](#-front-end--fp-construções)

</div>