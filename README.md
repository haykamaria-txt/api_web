# Sistema de Agendamento e Monitoramento de Laboratórios Acadêmicos

Backend REST e frontend integrado para gerenciamento de laboratórios, reservas, problemas e relatórios.

Documentação completa da API, payloads, respostas, permissões e regras de negócio: [docs/API.md](docs/API.md).

## Como rodar com Docker

1. Instale Docker Desktop ou Docker Engine com Docker Compose.

2. Gere um segredo JWT aleatório e defina `JWT_SECRET` no ambiente. Exemplo:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   No PowerShell:

   ```powershell
   $env:JWT_SECRET="<valor-gerado>"
   ```

   No Bash:

   ```bash
   export JWT_SECRET="<valor-gerado>"
   ```

3. Na raiz do projeto, suba todos os serviços:

   ```bash
   docker compose up
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

Para parar os containers, pressione `Ctrl+C`. Para remover também o volume do banco e recomeçar do zero:

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
   npm install
   ```

3. Copie `.env.example` para `.env`, gere um segredo aleatório e configure as variáveis obrigatórias:

   ```env
   JWT_SECRET=<valor-aleatório-com-pelo-menos-32-caracteres>
   DATABASE_URL=postgresql://laboratorios_app:laboratorios_app@localhost:5432/laboratorios
   ```

4. Inicie o servidor:

   ```bash
   npm start
   ```

5. Abra `http://localhost:3000`.

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
- lista completa de endpoints e permissões;
- payloads e respostas de exemplo;
- códigos de erro;
- regras de negócio e proteção transacional das reservas.
