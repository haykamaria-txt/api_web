# Modelo Entidade-Relacionamento

MER da aplicação de gestão de laboratórios, derivado de `backend/schema.sql`.

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

Restrições relevantes: matrícula única; perfil em `admin|professor`; capacidade maior que zero; quantidade de alunos, quando informada, maior que zero; início anterior ao término; status da reserva em `pendente|aprovada|rejeitada|cancelada`; status do problema em `aberto|em_andamento|resolvido`; tipo de acesso em `checkin|checkout`; contagens do inventário não negativas. As FKs usam `NO ACTION` em exclusão e atualização. A tabela `acessos` não possui `updated_at`.
