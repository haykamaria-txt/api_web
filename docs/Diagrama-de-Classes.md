# Diagrama de Classes do domínio

Classes persistentes correspondentes aos Models Sequelize e associações definidas em `backend/src/models/index.js`.

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

`role`, `passwordHash`, `userId`, `labId` e `quantidadeAlunos` são nomes usados nos Models; Sequelize os mapeia para as colunas SQL `perfil`, `senha_hash`, `usuario_id`, `laboratorio_id` e `quantidade_alunos`, respectivamente. `Acesso` não tem `updatedAt`, de acordo com a tabela `acessos`.
