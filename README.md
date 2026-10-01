# Sistema de Agendamento e Monitoramento de Laboratórios Acadêmicos

Aplicação web para gerenciar laboratórios, reservas, problemas, inventário e registros de acesso. O backend usa Node.js, Express, PostgreSQL e Sequelize, organizado em camadas.

## Requisitos

- Node.js 22 ou superior e npm;
- Docker Desktop ou Docker Engine com Docker Compose;
- portas `3000` e `5432` disponíveis.

## Arquitetura

As requisições seguem o fluxo `Route → Controller → Service → Repository → Model → PostgreSQL`:

- **Routes** associam endpoints HTTP aos Controllers;
- **Controllers** leem a requisição e montam a resposta;
- **Services** aplicam validações, permissões e regras de negócio;
- **Repositories** fazem operações CRUD pelos Models Sequelize;
- **Models** mapeiam tabelas, colunas, constraints e relacionamentos;
- **`backend/src/config/database.js`** configura a conexão com PostgreSQL usando variáveis de ambiente.

As entidades persistidas são usuários, laboratórios, reservas, problemas, inventário e acessos. A estrutura principal está em `backend/src/`; a definição SQL usada na inicialização de um banco novo está em `backend/schema.sql`.

### Modelagem de dados

- [MER — Modelo Entidade-Relacionamento](docs/MER.md)
- [Diagrama de Classes](docs/Diagrama-de-Classes.md)
- [Schema PostgreSQL](backend/schema.sql)

Os diagramas abaixo refletem as tabelas e associações implementadas em `backend/schema.sql` e nos Models Sequelize. Os campos `userId` e `labId` dos Models são mapeados para `usuario_id` e `laboratorio_id` no banco.

#### Modelo Entidade-Relacionamento

```mermaid
erDiagram
    USUARIOS ||--o{ RESERVAS : realiza
    LABORATORIOS ||--o{ RESERVAS : recebe
    USUARIOS ||--o{ PROBLEMAS : relata
    LABORATORIOS ||--o{ PROBLEMAS : apresenta
    LABORATORIOS ||--o{ INVENTARIO : possui
    USUARIOS ||--o{ ACESSOS : registra
    LABORATORIOS ||--o{ ACESSOS : registra

    USUARIOS {
        int id PK
        varchar nome
        varchar matricula UK
        varchar curso
        varchar perfil
        text senha_hash
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    LABORATORIOS {
        int id PK
        varchar nome
        varchar tipo
        int capacidade
        varchar localizacao
        jsonb recursos
        boolean ativo
        timestamp created_at
        timestamp updated_at
    }
    RESERVAS {
        int id PK
        int usuario_id FK
        int laboratorio_id FK
        date data
        time inicio
        time termino
        int quantidade_alunos "NULL permitido"
        varchar status
        text observacao "NULL permitido"
        timestamp created_at
        timestamp updated_at
    }
    PROBLEMAS {
        int id PK
        int laboratorio_id FK
        int usuario_id FK
        varchar tipo
        text descricao
        varchar status
        timestamp created_at
        timestamp updated_at
    }
    INVENTARIO {
        int id PK
        int laboratorio_id FK
        varchar item
        int disponivel
        int indisponivel
        timestamp created_at
        timestamp updated_at
    }
    ACESSOS {
        int id PK
        int laboratorio_id FK
        int usuario_id FK
        varchar tipo
        timestamp created_at
    }
```

#### Diagrama de Classes dos Models

```mermaid
classDiagram
    class Usuario {
        +Integer id
        +String nome
        +String matricula
        +String curso
        +String role
        +String passwordHash
        +Boolean ativo
        +Date createdAt
        +Date updatedAt
    }
    class Laboratorio {
        +Integer id
        +String nome
        +String tipo
        +Integer capacidade
        +String localizacao
        +JSON recursos
        +Boolean ativo
        +Date createdAt
        +Date updatedAt
    }
    class Reserva {
        +Integer id
        +Integer userId
        +Integer labId
        +Date data
        +Time inicio
        +Time termino
        +Integer quantidadeAlunos
        +String status
        +String observacao
        +Date createdAt
        +Date updatedAt
    }
    class Problema {
        +Integer id
        +Integer labId
        +Integer userId
        +String tipo
        +String descricao
        +String status
        +Date createdAt
        +Date updatedAt
    }
    class Inventario {
        +Integer id
        +Integer labId
        +String item
        +Integer disponivel
        +Integer indisponivel
        +Date createdAt
        +Date updatedAt
    }
    class Acesso {
        +Integer id
        +Integer labId
        +Integer userId
        +String tipo
        +Date createdAt
    }

    Usuario "1" --> "0..*" Reserva : reservas
    Laboratorio "1" --> "0..*" Reserva : reservas
    Usuario "1" --> "0..*" Problema : problemas
    Laboratorio "1" --> "0..*" Problema : problemas
    Laboratorio "1" --> "0..*" Inventario : inventario
    Usuario "1" --> "0..*" Acesso : acessos
    Laboratorio "1" --> "0..*" Acesso : acessos
```

## Instalação

Na raiz do projeto, instale as dependências do lockfile:

```bash
npm ci
```

## Configuração do ambiente

Crie um arquivo local `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Gere um segredo JWT aleatório:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copie o resultado para `JWT_SECRET` no `.env`. O segredo deve ter pelo menos 32 caracteres. Exemplo da configuração local:

```env
PORT=3000
JWT_SECRET=<segredo-aleatório-com-pelo-menos-32-caracteres>
DATABASE_URL=postgresql://laboratorios_app:laboratorios_app@localhost:5432/laboratorios
DB_SSL=false
```

O `.env` contém segredos e configurações locais; não o envie nem o versione. O arquivo `.env.example` pode ser compartilhado.

## Executar com Docker Compose

1. Configure o `.env` conforme a seção anterior.
2. Na raiz do projeto, construa e inicie a aplicação e o PostgreSQL:

   ```bash
   docker compose up --build
   ```

3. Acesse a aplicação em <http://localhost:3000>.

O Compose inicia o PostgreSQL 16 e a aplicação Express. A API usa a conexão PostgreSQL fornecida por `DATABASE_URL`; o Compose não oferece um segredo JWT padrão e exige que `JWT_SECRET` esteja configurado.

Em um volume PostgreSQL novo, os scripts em `backend/db/init/` criam o banco e aplicam `backend/schema.sql`. Na inicialização da API, o Sequelize autentica a conexão e sincroniza os Models sem alterar tabelas existentes. Dados de demonstração são carregados quando o banco está vazio. Volumes já inicializados não reaplicam os scripts de bootstrap.

Para parar os serviços, execute:

```bash
docker compose down
```

Para apagar também os dados persistidos e reiniciar o banco do zero:

```bash
docker compose down -v
```

Esse último comando remove o volume do PostgreSQL.

## Executar localmente

1. Instale as dependências com `npm ci` e configure o `.env` para apontar a `DATABASE_URL` ao PostgreSQL.
2. Inicie um PostgreSQL local ou o serviço de banco do Compose e mantenha-o em execução:

   ```bash
   docker compose up postgres
   ```

3. Em outro terminal, inicie a API:

   ```bash
   npm start
   ```

Durante o desenvolvimento, use o reinício automático:

```bash
npm run dev
```

A aplicação não inicia sem um `JWT_SECRET` válido e uma `DATABASE_URL` PostgreSQL. Para interromper o servidor local, use `Ctrl+C`.

## Acessos de demonstração

- Administrador: matrícula `000000`, senha `admin123`;
- Professor: matrícula `2026001`, senha `123456`.

Essas contas são destinadas somente à demonstração acadêmica. A tela de login não preenche credenciais nem autentica automaticamente.

## Documentação da API

Consulte [docs/API.md](docs/API.md) para endpoints, permissões, exemplos de payloads e respostas, erros e regras de negócio.

Com a aplicação em execução, a documentação interativa está em <http://localhost:3000/api-docs> e o JSON OpenAPI em <http://localhost:3000/api-docs.json>.

Para testar uma rota protegida no Swagger:

1. Execute `POST /autenticacao/login`.
2. Copie o campo `token` da resposta.
3. Clique em **Authorize** e informe o token.
4. Execute a rota desejada com a conta apropriada.

## Qualidade e testes

Execute os testes automatizados:

```bash
npm test
```

Verifique o lint e a formatação:

```bash
npm run lint
npm run format:check
```

## Checklist da Etapa 3

- [x] PostgreSQL e Sequelize configurados por variáveis de ambiente;
- [x] Models e mapeamentos implementados para as entidades do sistema;
- [x] Relacionamentos entre usuários, laboratórios, reservas, problemas, inventário e acessos;
- [x] CRUD pelos Repositories Sequelize;
- [x] Validações e regras de negócio nos Services;
- [x] Integração da API pelo fluxo Controller → Service → Repository → Model;
- [x] MER e Diagrama de Classes incluídos na documentação;
- [x] Aplicação e persistência validadas localmente com PostgreSQL;
- [ ] Demonstrar a aplicação funcionando durante a apresentação.

## Gerar o pacote de entrega

No PowerShell, gere o ZIP da Etapa 3:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-delivery.ps1
```

O script cria `entrega-etapa-3.zip` na raiz. O pacote exclui dependências instaladas, `.env`, histórico Git, caches, logs, arquivos temporários e ZIPs anteriores.
