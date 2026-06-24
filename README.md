# Sistema de Agendamento e Monitoramento de Laboratórios Acadêmicos

Backend REST e frontend integrado para gerenciamento de laboratórios, reservas, problemas e relatórios.

Documentação completa da API, payloads, respostas, permissões e regras de negócio: [docs/API.md](docs/API.md).

## Requisitos

- Node.js 22 ou superior;
- npm;
- Docker Desktop ou Docker Engine com Docker Compose;
- portas `3000` e `5432` disponíveis.

## Instalação

Na raiz do projeto, instale exatamente as dependências registradas no `package-lock.json`:

```bash
npm ci
```

## Configuração do ambiente

Copie o arquivo de exemplo sem remover o original:

No PowerShell:

```powershell
Copy-Item .env.example .env
```

No Bash:

```bash
cp .env.example .env
```

Gere um segredo JWT aleatório:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Substitua o valor de `JWT_SECRET` no `.env` pelo resultado. O arquivo deve manter esta estrutura:

```env
PORT=3000
JWT_SECRET=<valor-aleatório-com-pelo-menos-32-caracteres>
DATABASE_URL=postgresql://laboratorios_app:laboratorios_app@localhost:5432/laboratorios
DB_SSL=false
```

O `.env` contém configuração local e não deve ser enviado ou versionado. Somente `.env.example` faz parte da entrega.

## Como rodar com Docker

1. Instale Docker Desktop ou Docker Engine com Docker Compose.

2. Configure o `.env` conforme a seção anterior.

3. Na raiz do projeto, suba o PostgreSQL e a aplicação:

   ```bash
   docker compose up --build
   ```

4. Abra `http://localhost:3000`.

O comando acima sobe dois serviços:

- `postgres`: PostgreSQL 16 com banco `laboratorios`.
- `app`: backend Node/Express servindo a API e o frontend.

O PostgreSQL é obrigatório para atender ao RNF04. No Docker Compose, a aplicação recebe `DATABASE_URL=postgresql://laboratorios_app:laboratorios_app@postgres:5432/laboratorios` e não usa armazenamento em arquivo JSON.

O Compose não inclui segredo JWT padrão. Ele interrompe a configuração se `JWT_SECRET` não estiver definida. Use um valor aleatório exclusivo mesmo em avaliação local; nunca reutilize o exemplo, credenciais ou segredos de outro ambiente.

Na primeira execução, o container do PostgreSQL executa:

- `backend/db/init/01-create-database.sh`: cria o usuário `laboratorios_app`, cria o banco `laboratorios` e ajusta permissões.
- `backend/db/init/02-init-tables.sh`: aplica `backend/schema.sql` para inicializar as tabelas.

O backend também reaplica `backend/schema.sql` na inicialização e carrega dados iniciais quando o banco está vazio.

Para parar os containers:

```bash
docker compose down
```

Para remover também o volume do banco e recomeçar do zero:

```bash
docker compose down -v
```

## Como rodar localmente sem container da aplicação

1. Suba um PostgreSQL local ou use apenas o servico `postgres` do Compose:

   ```bash
   docker compose up postgres
   ```

2. Instale as dependências:

   ```bash
   npm ci
   ```

3. Configure o `.env` conforme a seção “Configuração do ambiente”.

4. Inicie o servidor:

   ```bash
   npm start
   ```

5. Abra `http://localhost:3000`.

Durante o desenvolvimento, também é possível reiniciar automaticamente o servidor:

```bash
npm run dev
```

O servidor falha ao iniciar quando:

- `JWT_SECRET` está ausente ou vazia;
- `JWT_SECRET` tem menos de 32 caracteres ou contém termos previsíveis de exemplo/desenvolvimento;
- `DATABASE_URL` está ausente ou não usa `postgres://`/`postgresql://`.

## Acessos de demonstração acadêmica

- Administrador: matrícula `000000`, senha `admin123`
- Professor: matrícula `2026001`, senha `123456`

Essas credenciais existem apenas para demonstração e avaliação acadêmica. A matrícula e a senha precisam ser digitadas manualmente na tela de login; o sistema não preenche campos nem autentica automaticamente.

## Documentação da API

Consulte [docs/API.md](docs/API.md) para:

- execução com Docker e configuração das variáveis obrigatórias;
- autenticação JWT e credenciais de demonstração acadêmica;
- senhas protegidas com bcrypt usando 12 salt rounds;
- lista completa de endpoints e permissões;
- payloads e respostas de exemplo;
- códigos de erro;
- regras de negócio e proteção transacional das reservas.

### Swagger / OpenAPI

Com a aplicação em execução, acesse a documentação interativa em:

```text
http://localhost:3000/api-docs
```

A especificação OpenAPI em JSON está disponível em:

```text
http://localhost:3000/api-docs.json
```

Para testar as rotas protegidas pela interface Swagger:

1. Execute `POST /autenticacao/login`.
2. Copie o valor do campo `token` retornado.
3. Clique em **Authorize** e informe somente o token.
4. Execute as demais rotas conforme as permissões do usuário autenticado.

## Qualidade e testes

Execute a suíte automatizada uma vez:

```bash
npm test
```

Execute os testes em modo de observação:

```bash
npm run test:watch
```

Verifique ou corrija problemas de lint:

```bash
npm run lint
npm run lint:fix
```

Verifique ou aplique a formatação:

```bash
npm run format:check
npm run format
```

## Gerar o ZIP de entrega

No PowerShell, execute:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-delivery.ps1
```

O script cria `entrega-etapa-2.zip` na raiz, excluindo dependências, `.env`, histórico Git, logs, caches, arquivos temporários e ZIPs anteriores.

## Checklist da Etapa 2

- [x] Node.js/Express
- [x] PostgreSQL
- [x] JWT
- [x] bcrypt
- [x] Swagger/OpenAPI
- [x] ESLint
- [x] Prettier
- [x] Testes automatizados com Vitest
- [x] Docker e Docker Compose
