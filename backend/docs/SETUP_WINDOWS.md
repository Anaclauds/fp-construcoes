# Setup local - FP Construcoes API

## 1. Entrar na pasta do backend

```powershell
cd backend
```

## 2. Instalar dependencias

Use `npm.cmd` no PowerShell se o Windows bloquear o comando `npm`.

```powershell
npm.cmd install
```

## 3. Configurar o MySQL

Crie um banco chamado `fp_construcoes` no MySQL.

```sql
CREATE DATABASE fp_construcoes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

Depois ajuste o arquivo `.env` com o usuario e a senha reais do seu MySQL.

```env
DATABASE_URL="mysql://root:sua_senha@localhost:3306/fp_construcoes"
PORT=3000
```

## 4. Gerar Prisma Client

```powershell
npm.cmd run prisma:generate
```

## 5. Criar as tabelas no banco

```powershell
npm.cmd run prisma:migrate -- --name init
```

## 6. Rodar a API

```powershell
npm.cmd run start:dev
```

## 7. Acessar

- API: http://localhost:3000/api
- Swagger: http://localhost:3000/docs

## Comandos uteis

```powershell
npm.cmd run build
npm.cmd test
npm.cmd run prisma:studio
```
