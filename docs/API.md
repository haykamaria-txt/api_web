# Documentação da API

API REST do Sistema de Agendamento e Monitoramento de Laboratórios Acadêmicos.

## 1. Endereço da aplicação

Com o projeto executando localmente:

- Frontend: `http://localhost:3000`
- API: `http://localhost:3000`
- Informações básicas da API: `GET http://localhost:3000/api`

Os exemplos deste documento usam:

```text
http://localhost:3000
```

## 2. Execução com Docker

### Requisitos

- Docker Desktop ou Docker Engine.
- Docker Compose.
- Node.js apenas para gerar facilmente o segredo JWT.

### PowerShell

```powershell
$env:JWT_SECRET = node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
docker compose up --build
```

### Bash

```bash
export JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
docker compose up --build
```

Depois, acesse `http://localhost:3000`.

O Compose inicia:

- `postgres`: PostgreSQL 16, banco `laboratorios`;
- `app`: backend Node.js/Express e frontend estático.

Para encerrar:

```bash
docker compose down
```

Para apagar também os dados persistidos no volume:

```bash
docker compose down -v
```

## 3. Variáveis obrigatórias

| Variável       | Obrigatória | Descrição                                                                                                           |
| -------------- | ----------: | ------------------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`   |         Sim | Segredo usado para assinar os tokens JWT. Deve possuir pelo menos 32 caracteres e não pode ser um valor previsível. |
| `DATABASE_URL` |         Sim | URL de conexão com PostgreSQL usando `postgres://` ou `postgresql://`.                                              |

Exemplo para execução local sem o container da aplicação:

```env
JWT_SECRET=<segredo-aleatório-com-pelo-menos-32-caracteres>
DATABASE_URL=postgresql://laboratorios_app:laboratorios_app@localhost:5432/laboratorios
PORT=3000
DB_SSL=false
```

No Docker Compose, `DATABASE_URL` já aponta para o serviço `postgres`. O valor de `JWT_SECRET` deve ser fornecido externamente.

A aplicação falha ao iniciar se qualquer variável obrigatória estiver ausente ou inválida.

## 4. Credenciais de demonstração acadêmica

| Perfil        | Matrícula | Senha      |
| ------------- | --------- | ---------- |
| Administrador | `000000`  | `admin123` |
| Professor     | `2026001` | `123456`   |

Essas credenciais existem apenas para demonstração e avaliação acadêmica.

Elas precisam ser digitadas manualmente. O frontend não preenche matrícula ou senha e não realiza login automático quando os campos estão vazios.

## 5. Autenticação JWT

O login devolve um token JWT. Nas rotas protegidas, envie:

```http
Authorization: Bearer <token>
```

Exemplo com `curl`:

```bash
curl http://localhost:3000/autenticacao/perfil \
  -H "Authorization: Bearer <token>"
```

O token possui validade de 8 horas.

## 6. Perfis e permissões

### Rotas exclusivas de professor

- `POST /reservas`
- `GET /reservas/recomendacao`

### Rotas exclusivas de administrador

- `GET /usuarios`
- `DELETE /usuarios/:id`
- `POST /labs`
- `PUT /labs/:id`
- `DELETE /labs/:id`
- `PATCH /reservas/:id/aprovar`
- `PATCH /reservas/:id/rejeitar`
- `DELETE /problemas/:id`
- `GET /relatorios/utilizacao`
- `GET /relatorios/historico`
- `GET /relatorios/labs-mais-utilizados`
- `GET /relatorios/problemas`

### Rotas autenticadas para ambos os perfis

As demais rotas de perfil, consulta, calendário, problemas, inventário e acesso exigem JWT e aplicam restrições adicionais quando necessário.

## 7. Formato de erro

```json
{
  "erro": "Mensagem explicando o problema."
}
```

### Códigos comuns

| Código | Significado                                               | Exemplos                                                        |
| -----: | --------------------------------------------------------- | --------------------------------------------------------------- |
|  `400` | Dados obrigatórios ausentes ou regra de validação violada | Data inválida, capacidade excedida ou antecedência insuficiente |
|  `401` | Token ausente/inválido ou credenciais incorretas          | Login inválido ou acesso sem JWT                                |
|  `403` | Usuário autenticado sem permissão                         | Professor tentando cadastrar laboratório                        |
|  `404` | Recurso não encontrado                                    | Laboratório, usuário, reserva ou problema inexistente           |
|  `409` | Conflito de estado                                        | Matrícula duplicada ou conflito de horário                      |

## 8. Autenticação

### `POST /autenticacao/cadastro`

Cadastra um usuário.

- Sem JWT, o perfil criado é professor.
- Para cadastrar outro administrador, envie JWT de administrador e `role: "admin"`.

Payload:

```json
{
  "nome": "Ana Souza",
  "matricula": "2026010",
  "curso": "Informática",
  "senha": "senha-acadêmica",
  "role": "professor"
}
```

Resposta `201`:

```json
{
  "usuario": {
    "id": 5,
    "nome": "Ana Souza",
    "matricula": "2026010",
    "curso": "Informática",
    "role": "professor",
    "ativo": true,
    "createdAt": "2026-06-22T12:00:00.000Z",
    "updatedAt": "2026-06-22T12:00:00.000Z"
  }
}
```

### `POST /autenticacao/login`

Payload:

```json
{
  "matricula": "2026001",
  "senha": "123456"
}
```

Resposta `200`:

```json
{
  "token": "<token-jwt>",
  "usuario": {
    "id": 2,
    "nome": "Maria Silva",
    "matricula": "2026001",
    "curso": "Informática",
    "role": "professor",
    "ativo": true
  }
}
```

## 9. Perfil e usuários

### `GET /autenticacao/perfil`

Retorna o usuário associado ao token.

Resposta:

```json
{
  "usuario": {
    "id": 2,
    "nome": "Maria Silva",
    "matricula": "2026001",
    "curso": "Informática",
    "role": "professor",
    "ativo": true
  }
}
```

### `PUT /autenticacao/perfil`

Atualiza nome, curso e, opcionalmente, senha do usuário autenticado.

Payload:

```json
{
  "nome": "Maria Silva Atualizada",
  "curso": "Sistemas de Informação",
  "senha": "nova-senha"
}
```

### `GET /usuarios`

Lista usuários ativos. Exclusiva de administrador.

Resposta:

```json
{
  "usuarios": [
    {
      "id": 2,
      "nome": "Maria Silva",
      "matricula": "2026001",
      "curso": "Informática",
      "role": "professor",
      "ativo": true
    }
  ]
}
```

### `GET /usuarios/:id`

- Administrador pode consultar qualquer usuário.
- Professor pode consultar apenas o próprio cadastro.

### `PUT /usuarios/:id`

- Administrador pode atualizar os campos do usuário, inclusive perfil e matrícula.
- Professor pode atualizar apenas o próprio cadastro, sem alterar perfil ou matrícula.

Payload administrativo:

```json
{
  "nome": "Ana Souza",
  "matricula": "2026010",
  "curso": "Redes",
  "role": "professor",
  "senha": "nova-senha"
}
```

### `DELETE /usuarios/:id`

Exclusiva de administrador. Realiza exclusão lógica, definindo `ativo` como `false`.

Resposta: `204 No Content`.

## 10. Laboratórios

### `GET /labs`

Lista laboratórios ativos.

Filtros opcionais:

```text
GET /labs?capacidade=30
GET /labs?capacidadeMin=30
```

Resposta:

```json
{
  "laboratorios": [
    {
      "id": 1,
      "nome": "Laboratório 01 - Informática",
      "tipo": "Informática",
      "capacidade": 30,
      "localizacao": "Bloco A",
      "recursos": ["Computadores", "Projetor", "Internet"],
      "ativo": true
    }
  ]
}
```

### `POST /labs`

Exclusiva de administrador.

Payload:

```json
{
  "nome": "Laboratório 05 - Redes",
  "tipo": "Redes",
  "capacidade": 25,
  "localizacao": "Bloco D",
  "recursos": ["Roteadores", "Switches", "Projetor"]
}
```

Resposta `201`:

```json
{
  "laboratorio": {
    "id": 5,
    "nome": "Laboratório 05 - Redes",
    "tipo": "Redes",
    "capacidade": 25,
    "localizacao": "Bloco D",
    "recursos": ["Roteadores", "Switches", "Projetor"],
    "ativo": true
  }
}
```

### `GET /labs/:id`

Consulta um laboratório ativo pelo ID.

### `PUT /labs/:id`

Exclusiva de administrador.

Payload:

```json
{
  "nome": "Laboratório 05 - Redes Atualizado",
  "tipo": "Redes",
  "capacidade": 28,
  "localizacao": "Bloco D - Sala 2",
  "recursos": ["Roteadores", "Switches"]
}
```

### `DELETE /labs/:id`

Exclusiva de administrador. Realiza exclusão lógica, definindo `ativo` como `false`.

Resposta: `204 No Content`.

## 11. Reservas

### Regras de negócio

- Apenas professores podem criar reservas.
- A reserva deve ser feita com no mínimo 3 dias de antecedência.
- O horário inicial deve ser anterior ao horário final.
- A quantidade de alunos deve ser positiva.
- A quantidade de alunos não pode ultrapassar a capacidade do laboratório.
- Reservas `pendente` e `aprovada` bloqueiam horários sobrepostos.
- Reservas `cancelada` e `rejeitada` não bloqueiam o horário.
- Professor pode consultar, editar ou cancelar apenas as próprias reservas.
- Reservas passadas não podem ser editadas ou canceladas.
- O cancelamento é lógico: o registro permanece no banco com status `cancelada`.

### Proteção contra concorrência

Na criação, a API:

1. inicia uma transação PostgreSQL;
2. obtém um `pg_advisory_xact_lock` para o laboratório e a data;
3. verifica novamente os conflitos dentro da transação;
4. insere a reserva somente se o horário continuar livre;
5. confirma a transação.

Assim, duas requisições simultâneas para horários sobrepostos no mesmo laboratório e data não criam duas reservas. Uma recebe `201` e a outra recebe `409`.

### `POST /reservas`

Exclusiva de professor.

Payload:

```json
{
  "labId": 1,
  "data": "2026-07-15",
  "inicio": "08:00",
  "termino": "10:00",
  "quantidadeAlunos": 25,
  "observacao": "Aula prática"
}
```

Também é aceito `laboratorioId` no lugar de `labId`.

Resposta `201`:

```json
{
  "reserva": {
    "id": 10,
    "userId": 2,
    "labId": 1,
    "data": "2026-07-15",
    "inicio": "08:00",
    "termino": "10:00",
    "quantidadeAlunos": 25,
    "status": "pendente",
    "observacao": "Aula prática",
    "professor": {
      "id": 2,
      "nome": "Maria Silva",
      "role": "professor"
    },
    "laboratorio": {
      "id": 1,
      "nome": "Laboratório 01 - Informática",
      "capacidade": 30
    }
  }
}
```

Resposta de conflito `409`:

```json
{
  "erro": "Já existe reserva para este laboratório no horário informado."
}
```

### `GET /reservas`

- Professor recebe apenas as próprias reservas.
- Administrador pode consultar todas ou aplicar filtros.

Filtros opcionais:

```text
GET /reservas?userId=2
GET /reservas?labId=1
GET /reservas?data=2026-07-15
GET /reservas?status=pendente
```

Resposta:

```json
{
  "reservas": [
    {
      "id": 10,
      "data": "2026-07-15",
      "inicio": "08:00",
      "termino": "10:00",
      "status": "pendente",
      "professor": {},
      "laboratorio": {}
    }
  ]
}
```

### `GET /reservas/recomendacao`

Exclusiva de professor. Retorna sugestão simples de laboratório, data e horário.

### `GET /reservas/:id`

- Administrador pode consultar qualquer reserva.
- Professor pode consultar apenas reserva propria.

### `PUT /reservas/:id`

Atualiza uma reserva futura.

Payload:

```json
{
  "labId": 2,
  "data": "2026-07-16",
  "inicio": "10:00",
  "termino": "12:00",
  "quantidadeAlunos": 20,
  "observacao": "Horário atualizado"
}
```

Administrador também pode enviar:

```json
{
  "status": "aprovada"
}
```

### `DELETE /reservas/:id`

Cancela logicamente uma reserva futura, alterando o status para `cancelada`.

Resposta: `204 No Content`.

### `PATCH /reservas/:id/aprovar`

Exclusiva de administrador. Revalida conflito antes de alterar o status para `aprovada`.

### `PATCH /reservas/:id/rejeitar`

Exclusiva de administrador. Altera o status para `rejeitada`.

## 12. Calendário

### `GET /calendario`

Exemplo:

```text
GET /calendario?data=2026-07-15
```

Sem `data`, utiliza a data atual.

Resposta resumida:

```json
{
  "data": "2026-07-15",
  "reservas": [],
  "laboratorios": [
    {
      "laboratorio": {
        "id": 1,
        "nome": "Laboratório 01 - Informática"
      },
      "slots": [
        {
          "inicio": "07:00",
          "termino": "07:30",
          "status": "livre",
          "reservaId": null
        }
      ]
    }
  ]
}
```

### `GET /calendario/laboratorio/:id`

Consulta o calendário de um laboratório.

```text
GET /calendario/laboratorio/1?data=2026-07-15
```

### `GET /calendario/disponiveis`

Sem filtros, lista todos os laboratórios ativos.

Com filtros:

```text
GET /calendario/disponiveis?data=2026-07-15&inicio=08:00&termino=10:00
```

### `GET /calendario/reservados`

Lista reservas ativas (`pendente` ou `aprovada`).

```text
GET /calendario/reservados?data=2026-07-15
```

## 13. Problemas e reclamações

### `POST /problemas`

Payload:

```json
{
  "labId": 1,
  "tipo": "Projetor com defeito",
  "descricao": "O projetor não liga."
}
```

Resposta `201`:

```json
{
  "problema": {
    "id": 3,
    "labId": 1,
    "userId": 2,
    "tipo": "Projetor com defeito",
    "descricao": "O projetor não liga.",
    "status": "aberto",
    "responsavel": {},
    "laboratorio": {}
  }
}
```

### `GET /problemas`

- Professor recebe apenas os problemas registrados por ele.
- Administrador pode consultar todos e usar filtros.

Filtros:

```text
GET /problemas?userId=2
GET /problemas?labId=1
GET /problemas?status=aberto
```

### `GET /problemas/:id`

Administrador pode consultar qualquer problema. Professor pode consultar apenas o próprio.

### `PUT /problemas/:id`

Payload:

```json
{
  "tipo": "Projetor sem imagem",
  "descricao": "O equipamento liga, mas não apresenta imagem.",
  "status": "em_andamento"
}
```

Somente administrador pode efetivamente alterar o status. Professor pode atualizar tipo e descrição do próprio registro.

### `DELETE /problemas/:id`

Exclusiva de administrador. Remove fisicamente o registro.

Resposta: `204 No Content`.

## 14. Relatórios

Todas as rotas desta secao sao exclusivas de administrador.

### `GET /relatorios/utilizacao`

Resposta:

```json
{
  "utilizacao": [
    {
      "laboratorio": {
        "id": 1,
        "nome": "Laboratório 01 - Informática"
      },
      "totalReservas": 4,
      "horasUtilizadas": 8
    }
  ]
}
```

Reservas canceladas ou rejeitadas não entram no cálculo.

### `GET /relatorios/historico`

Retorna o histórico de reservas com professor e laboratório relacionados.

### `GET /relatorios/labs-mais-utilizados`

Retorna a utilização ordenada da maior para a menor quantidade de reservas.

### `GET /relatorios/problemas`

Resposta:

```json
{
  "total": 3,
  "porStatus": {
    "aberto": 1,
    "em_andamento": 1,
    "resolvido": 1
  },
  "problemas": []
}
```

## 15. Rotas auxiliares

### `GET /api`

Rota pública com nome do sistema, grupos principais de endpoints e armazenamento utilizado.

### `GET /dashboard/resumo`

Rota autenticada. Retorna indicadores de professores, agendamentos, reclamações e inventário.

### `GET /inventario`

Rota autenticada. Lista os itens de inventário agrupáveis por laboratório.

Filtro opcional:

```text
GET /inventario?labId=1
```

### `POST /acessos/checkin`

Rota autenticada.

```json
{
  "labId": 1
}
```

### `POST /acessos/checkout`

Rota autenticada.

```json
{
  "labId": 1
}
```

## 16. Exemplo completo com curl

### Login

```bash
curl -X POST http://localhost:3000/autenticacao/login \
  -H "Content-Type: application/json" \
  -d '{"matricula":"2026001","senha":"123456"}'
```

Copie o valor retornado em `token`.

### Listar laboratórios

```bash
curl http://localhost:3000/labs \
  -H "Authorization: Bearer <token>"
```

### Criar reserva

```bash
curl -X POST http://localhost:3000/reservas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "labId": 1,
    "data": "2026-07-15",
    "inicio": "08:00",
    "termino": "10:00",
    "quantidadeAlunos": 25,
    "observacao": "Aula prática"
  }'
```

## 17. Observações para avaliação

- A persistência oficial é exclusivamente PostgreSQL.
- `DATABASE_URL` e `JWT_SECRET` são obrigatórias.
- Senhas são armazenadas com hash `bcrypt` usando 12 salt rounds.
- Rotas protegidas usam JWT no cabecalho `Authorization`.
- O cadastro, a edição e o cancelamento respeitam as permissões de professor e administrador.
- A criação de reserva possui proteção transacional contra requisições concorrentes.
