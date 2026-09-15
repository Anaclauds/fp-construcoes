<div align="center">

# 🎨 Front-end — FP Construções

Interface web do **Sistema de Gestão FP Construções**.

<br>

![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Frontend-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=for-the-badge&logo=axios&logoColor=white)

</div>

[⬅️ Voltar para a documentação principal](../README.md)  
[⚙️ Ver documentação do Back-end](../backend/README.md)

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

## 🔄 Comunicação com o Back-end

```text
Usuário
   ↓
Interface Vue.js
   ↓
Axios
   ↓
API REST — NestJS
   ↓
Prisma
   ↓
MySQL
```

Principais operações HTTP:

```text
GET     → Consultar dados
POST    → Cadastrar dados
PUT     → Atualizar dados
DELETE  → Excluir dados
```

---

## 🚀 Executando o Front-end

Acesse o diretório:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

O Vite informará no terminal o endereço local para acessar a aplicação.

---

## 🔐 Variáveis de ambiente

As configurações específicas do ambiente devem ser armazenadas em um arquivo `.env`.

Exemplo:

```env
VITE_API_URL=http://localhost:3000
```

> ⚠️ Arquivos `.env` com informações reais não devem ser enviados ao GitHub.

O `.env.example` poderá ser utilizado para documentar as variáveis necessárias.

---

## 👩‍💻 Responsável

**Ana Claudia**  
Desenvolvimento Front-end

**Análise e Desenvolvimento de Sistemas — IFRO**