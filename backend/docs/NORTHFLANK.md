# Publicacao do backend no Northflank

O frontend permanece na Vercel. O servico deve usar somente `/backend` como
contexto de build, acompanhar `main` e habilitar CI/CD. Usar uma instancia
gratuita e o MySQL privado do mesmo projeto. Nao publicar a porta do banco.

## Build e execucao

- Node.js 24; instalar com `npm ci` incluindo dependencias de desenvolvimento.
- Build: `npm run build` gera o Prisma Client e compila o NestJS.
- Execucao: `npm run start:cloud` aplica migrations pendentes e inicia a API.
- Manter a CLI Prisma disponivel no runtime. Com buildpack Heroku, definir
  `NPM_CONFIG_PRODUCTION=false` no build e verificar nos logs que nao houve
  remocao das devDependencies. Nao usar `npm ci --omit=dev` neste fluxo.
- Definir a porta HTTP igual a `PORT` (por exemplo, 8080).
- O comando de migrations usa `&&`: se falhar, a API nao inicia.

## Variaveis protegidas

- `DATABASE_URL`: conexao do MySQL privado, com TLS conforme o certificado e
  as instrucoes do addon. Nao desabilitar validacao do certificado.
- `JWT_SECRET`: segredo exclusivo do ambiente, forte e aleatorio.
- `JWT_EXPIRES_IN`: validade do token.
- `PORT=8080`.
- `CORS_ORIGINS=https://fp-construcoes.vercel.app`.
- `APP_TIMEZONE=America/Porto_Velho`.
- `TRUST_PROXY`: configurar de acordo com o proxy da plataforma; nao habilitar
  confianca irrestrita sem validar o caminho de rede.

Nunca versionar segredos, copiar o `.env` local para o repositorio ou executar
`prisma migrate reset` neste ambiente. CORS nao substitui autenticacao.

## Estrutura e atualizacoes

As migrations versionadas criam as tabelas do banco vazio. Alteracoes futuras
no schema exigem gerar e revisar uma migration local e inclui-la no Git.
`migrate deploy` nao gera migrations nem importa dados locais. Nao executar
seed de demonstracao automaticamente em cada deploy. O primeiro usuario
administrador exige um procedimento separado e autorizado.

Aplicar alteracoes compativeis com a versao anterior da API durante rollouts;
mudancas destrutivas exigem backup e planejamento. O comando de inicializacao
nao substitui um pipeline de release com verificacoes e rollback.

## Validacao antes da entrega

Conferir migrations, logs, login, CORS do dominio autorizado, cadastro e consulta
com dados ficticios e persistencia depois de um novo deploy. Testar uso de
memoria, exportacoes PDF/Excel e limites do plano gratuito. O deploy so esta
concluido quando esses testes forem executados no ambiente publicado.
