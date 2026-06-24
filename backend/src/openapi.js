import swaggerJSDoc from "swagger-jsdoc";

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (name) => ({ type: "array", items: ref(name) });
const content = (schema) => ({ "application/json": { schema } });
const response = (description, schema) => ({
  description,
  ...(schema ? { content: content(schema) } : {}),
});
const body = (schema) => ({ required: true, content: content(schema) });
const security = [{ bearerAuth: [] }];
const id = {
  name: "id",
  in: "path",
  required: true,
  description: "Identificador numérico do recurso.",
  schema: { type: "integer", minimum: 1 },
};
const date = {
  name: "data",
  in: "query",
  description: "Data no formato AAAA-MM-DD. Quando omitida, usa a data atual.",
  schema: { type: "string", format: "date" },
};
const errors = {
  400: response("Requisição inválida ou regra de negócio violada.", ref("Error")),
  401: response("Token JWT ausente, inválido ou expirado.", ref("Error")),
  403: response("Usuário sem permissão para executar a operação.", ref("Error")),
  404: response("Recurso não encontrado.", ref("Error")),
};
const wrapped = (property, schema) => ({
  type: "object",
  properties: { [property]: schema },
});
const listResponse = (property, schemaName) => wrapped(property, arrayOf(schemaName));

const definition = {
  openapi: "3.0.3",
  info: {
    title: "API de Agendamento e Monitoramento de Laboratórios",
    version: "1.0.0",
    description:
      "API REST para autenticação, usuários, laboratórios, reservas, calendário, problemas, relatórios, inventário e controle de acessos. "
      + "Nas rotas protegidas, use o token retornado pelo login no botão Authorize.",
  },
  servers: [
    { url: "/", description: "Servidor atual" },
    { url: "http://localhost:3000", description: "Ambiente local e Docker" },
  ],
  tags: [
    { name: "API", description: "Informações gerais da API." },
    { name: "Autenticação", description: "Cadastro, login e perfil autenticado." },
    { name: "Usuários", description: "Gerenciamento de usuários." },
    { name: "Laboratórios", description: "Gerenciamento de laboratórios." },
    { name: "Reservas", description: "Criação e gerenciamento de reservas." },
    { name: "Calendário", description: "Agenda e disponibilidade dos laboratórios." },
    { name: "Problemas", description: "Registro e acompanhamento de problemas." },
    { name: "Relatórios", description: "Relatórios administrativos." },
    { name: "Dashboard", description: "Indicadores resumidos do sistema." },
    { name: "Inventário", description: "Consulta de itens dos laboratórios." },
    { name: "Acessos", description: "Registro de check-in e checkout." },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Informe somente o token retornado por POST /autenticacao/login.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["erro"],
        properties: {
          erro: { type: "string", example: "Recurso não encontrado." },
          detalhe: {
            type: "string",
            nullable: true,
            description: "Stack trace retornada somente em desenvolvimento.",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 2 },
          nome: { type: "string", example: "Maria Silva" },
          matricula: { type: "string", example: "2026001" },
          curso: { type: "string", example: "Informática" },
          role: { type: "string", enum: ["admin", "professor"], example: "professor" },
          ativo: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      UserCreateRequest: {
        type: "object",
        required: ["nome", "matricula", "senha"],
        properties: {
          nome: { type: "string", example: "Ana Souza" },
          matricula: { type: "string", example: "2026010" },
          curso: { type: "string", example: "Informática", default: "Geral" },
          senha: { type: "string", format: "password", example: "senha-academica" },
          role: {
            type: "string",
            enum: ["admin", "professor"],
            default: "professor",
            description: "Criar administrador exige autenticação de administrador.",
          },
          perfil: {
            type: "string",
            enum: ["admin", "professor"],
            deprecated: true,
            description: "Alias aceito para role.",
          },
        },
      },
      UserUpdateRequest: {
        type: "object",
        properties: {
          nome: { type: "string" },
          matricula: { type: "string", description: "Alterável somente por administrador." },
          curso: { type: "string" },
          senha: { type: "string", format: "password" },
          role: {
            type: "string",
            enum: ["admin", "professor"],
            description: "Alterável somente por administrador.",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["matricula", "senha"],
        properties: {
          matricula: { type: "string", example: "2026001" },
          senha: { type: "string", format: "password", example: "123456" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string", description: "Token JWT válido por 8 horas." },
          usuario: ref("User"),
        },
      },
      Lab: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          nome: { type: "string", example: "Laboratório 01 - Informática" },
          tipo: { type: "string", example: "Informática" },
          capacidade: { type: "integer", minimum: 1, example: 30 },
          localizacao: { type: "string", example: "Bloco A" },
          recursos: {
            type: "array",
            items: { type: "string" },
            example: ["Computadores", "Projetor", "Internet"],
          },
          ativo: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      LabCreateRequest: {
        type: "object",
        required: ["nome", "tipo", "capacidade"],
        properties: {
          nome: { type: "string", example: "Laboratório 05 - Redes" },
          tipo: { type: "string", example: "Redes" },
          capacidade: { type: "integer", minimum: 1, example: 25 },
          localizacao: { type: "string", example: "Bloco D" },
          recursos: { type: "array", items: { type: "string" } },
        },
      },
      LabUpdateRequest: {
        type: "object",
        properties: {
          nome: { type: "string" },
          tipo: { type: "string" },
          capacidade: { type: "integer", minimum: 1 },
          localizacao: { type: "string" },
          recursos: { type: "array", items: { type: "string" } },
        },
      },
      Reservation: {
        type: "object",
        properties: {
          id: { type: "integer", example: 10 },
          userId: { type: "integer", example: 2 },
          labId: { type: "integer", example: 1 },
          data: { type: "string", format: "date", example: "2026-07-15" },
          inicio: { type: "string", pattern: "^\\d{2}:\\d{2}$", example: "08:00" },
          termino: { type: "string", pattern: "^\\d{2}:\\d{2}$", example: "10:00" },
          quantidadeAlunos: { type: "integer", minimum: 1, example: 25 },
          status: {
            type: "string",
            enum: ["pendente", "aprovada", "rejeitada", "cancelada"],
          },
          observacao: { type: "string", example: "Aula prática" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          professor: { allOf: [ref("User")], nullable: true },
          laboratorio: { allOf: [ref("Lab")], nullable: true },
        },
      },
      ReservationCreateRequest: {
        type: "object",
        required: ["data", "inicio", "termino", "quantidadeAlunos"],
        properties: {
          labId: { type: "integer", minimum: 1, example: 1 },
          laboratorioId: { type: "integer", minimum: 1, description: "Alias de labId." },
          laboratorio: { type: "string", description: "Nome exato do laboratório." },
          data: { type: "string", format: "date", example: "2026-07-15" },
          inicio: { type: "string", example: "08:00" },
          termino: { type: "string", example: "10:00" },
          quantidadeAlunos: { type: "integer", minimum: 1, example: 25 },
          observacao: { type: "string", example: "Aula prática" },
        },
      },
      ReservationUpdateRequest: {
        type: "object",
        properties: {
          labId: { type: "integer", minimum: 1 },
          laboratorioId: { type: "integer", minimum: 1 },
          data: { type: "string", format: "date" },
          inicio: { type: "string", example: "10:00" },
          termino: { type: "string", example: "12:00" },
          quantidadeAlunos: { type: "integer", minimum: 1 },
          observacao: { type: "string" },
          status: {
            type: "string",
            enum: ["pendente", "aprovada", "rejeitada", "cancelada"],
            description: "Alterável por esta rota somente por administrador.",
          },
        },
      },
      Problem: {
        type: "object",
        properties: {
          id: { type: "integer", example: 3 },
          labId: { type: "integer", example: 1 },
          userId: { type: "integer", example: 2 },
          tipo: { type: "string", example: "Projetor com defeito" },
          descricao: { type: "string", example: "O projetor não liga." },
          status: {
            type: "string",
            enum: ["aberto", "em_andamento", "resolvido"],
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          responsavel: { allOf: [ref("User")], nullable: true },
          laboratorio: { allOf: [ref("Lab")], nullable: true },
        },
      },
      ProblemCreateRequest: {
        type: "object",
        required: ["tipo", "descricao"],
        properties: {
          labId: { type: "integer", minimum: 1, example: 1 },
          laboratorioId: { type: "integer", minimum: 1 },
          laboratorio: { type: "string", description: "Nome exato do laboratório." },
          tipo: { type: "string", example: "Projetor com defeito" },
          descricao: { type: "string", example: "O projetor não liga." },
        },
      },
      ProblemUpdateRequest: {
        type: "object",
        properties: {
          labId: { type: "integer", minimum: 1 },
          laboratorioId: { type: "integer", minimum: 1 },
          tipo: { type: "string" },
          descricao: { type: "string" },
          status: {
            type: "string",
            enum: ["aberto", "em_andamento", "resolvido"],
            description: "Alterável somente por administrador.",
          },
        },
      },
      ScheduleSlot: {
        type: "object",
        properties: {
          inicio: { type: "string", example: "07:00" },
          termino: { type: "string", example: "07:30" },
          status: { type: "string", enum: ["livre", "ocupado"] },
          reservaId: { type: "integer", nullable: true },
        },
      },
      LabSchedule: {
        type: "object",
        properties: {
          laboratorio: ref("Lab"),
          slots: { type: "array", items: ref("ScheduleSlot") },
        },
      },
      InventoryItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          labId: { type: "integer" },
          item: { type: "string" },
          disponivel: { type: "integer" },
          indisponivel: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          laboratorio: { allOf: [ref("Lab")], nullable: true },
        },
      },
      Access: {
        type: "object",
        properties: {
          id: { type: "integer" },
          labId: { type: "integer" },
          userId: { type: "integer" },
          tipo: { type: "string", enum: ["checkin", "checkout"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      LabReferenceRequest: {
        type: "object",
        properties: {
          labId: { type: "integer", minimum: 1, example: 1 },
          laboratorioId: { type: "integer", minimum: 1 },
          laboratorio: { type: "string", description: "Nome exato do laboratório." },
        },
      },
      UsageReport: {
        type: "object",
        properties: {
          laboratorio: ref("Lab"),
          totalReservas: { type: "integer", example: 4 },
          horasUtilizadas: { type: "number", format: "float", example: 8.5 },
        },
      },
    },
  },
  paths: {
    "/api-docs.json": {
      get: {
        tags: ["API"],
        summary: "Obter especificação OpenAPI",
        description: "Retorna esta documentação no formato OpenAPI 3.0.3 em JSON.",
        responses: {
          200: response("Especificação OpenAPI.", {
            type: "object",
            additionalProperties: true,
          }),
        },
      },
    },
    "/api": {
      get: {
        tags: ["API"],
        summary: "Obter informações gerais da API",
        description: "Retorna o nome do sistema, os grupos de endpoints e o armazenamento.",
        responses: {
          200: response("Informações gerais.", {
            type: "object",
            properties: {
              nome: { type: "string" },
              endpoints: { type: "array", items: { type: "string" } },
              storage: { type: "string", example: "postgresql" },
            },
          }),
        },
      },
    },
    "/autenticacao/cadastro": {
      post: {
        tags: ["Autenticação"],
        summary: "Cadastrar usuário",
        description:
          "Cria um professor sem autenticação. Para criar administrador, exige JWT de administrador.",
        security: [{}, ...security],
        requestBody: body(ref("UserCreateRequest")),
        responses: {
          201: response("Usuário criado.", wrapped("usuario", ref("User"))),
          ...errors,
          409: response("Matrícula já cadastrada.", ref("Error")),
        },
      },
    },
    "/autenticacao/login": {
      post: {
        tags: ["Autenticação"],
        summary: "Autenticar usuário",
        description: "Valida matrícula e senha e retorna um JWT válido por 8 horas.",
        requestBody: body(ref("LoginRequest")),
        responses: {
          200: response("Login realizado.", ref("LoginResponse")),
          400: errors[400],
          401: response("Matrícula ou senha inválidos.", ref("Error")),
        },
      },
    },
    "/autenticacao/perfil": {
      get: {
        tags: ["Autenticação"],
        summary: "Consultar perfil autenticado",
        description: "Retorna os dados públicos do usuário associado ao JWT.",
        security,
        responses: {
          200: response("Perfil atual.", wrapped("usuario", ref("User"))),
          401: errors[401],
        },
      },
      put: {
        tags: ["Autenticação"],
        summary: "Atualizar perfil autenticado",
        description: "Atualiza nome, curso e, opcionalmente, senha.",
        security,
        requestBody: body(ref("UserUpdateRequest")),
        responses: {
          200: response("Perfil atualizado.", wrapped("usuario", ref("User"))),
          400: errors[400],
          401: errors[401],
        },
      },
    },
    "/usuarios": {
      get: {
        tags: ["Usuários"],
        summary: "Listar usuários ativos",
        description: "Rota exclusiva de administrador.",
        security,
        responses: {
          200: response("Lista de usuários.", listResponse("usuarios", "User")),
          401: errors[401],
          403: errors[403],
        },
      },
    },
    "/usuarios/{id}": {
      get: {
        tags: ["Usuários"],
        summary: "Consultar usuário",
        description: "Administrador consulta qualquer usuário; professor consulta apenas a si.",
        security,
        parameters: [id],
        responses: {
          200: response("Usuário encontrado.", wrapped("usuario", ref("User"))),
          ...errors,
        },
      },
      put: {
        tags: ["Usuários"],
        summary: "Atualizar usuário",
        description:
          "Administrador pode alterar matrícula e perfil; professor atualiza apenas o próprio cadastro.",
        security,
        parameters: [id],
        requestBody: body(ref("UserUpdateRequest")),
        responses: {
          200: response("Usuário atualizado.", wrapped("usuario", ref("User"))),
          ...errors,
        },
      },
      delete: {
        tags: ["Usuários"],
        summary: "Desativar usuário",
        description: "Exclusão lógica exclusiva de administrador.",
        security,
        parameters: [id],
        responses: {
          204: response("Usuário desativado."),
          401: errors[401],
          403: errors[403],
          404: errors[404],
        },
      },
    },
    "/labs": {
      get: {
        tags: ["Laboratórios"],
        summary: "Listar laboratórios ativos",
        description: "Lista laboratórios e permite filtrar pela capacidade mínima.",
        security,
        parameters: [
          {
            name: "capacidadeMin",
            in: "query",
            schema: { type: "integer", minimum: 1 },
            description: "Capacidade mínima.",
          },
          {
            name: "capacidade",
            in: "query",
            schema: { type: "integer", minimum: 1 },
            description: "Alias de capacidadeMin.",
          },
        ],
        responses: {
          200: response("Lista de laboratórios.", listResponse("laboratorios", "Lab")),
          401: errors[401],
        },
      },
      post: {
        tags: ["Laboratórios"],
        summary: "Criar laboratório",
        description: "Rota exclusiva de administrador.",
        security,
        requestBody: body(ref("LabCreateRequest")),
        responses: {
          201: response("Laboratório criado.", wrapped("laboratorio", ref("Lab"))),
          400: errors[400],
          401: errors[401],
          403: errors[403],
        },
      },
    },
    "/labs/{id}": {
      get: {
        tags: ["Laboratórios"],
        summary: "Consultar laboratório",
        description: "Retorna um laboratório ativo pelo ID.",
        security,
        parameters: [id],
        responses: {
          200: response("Laboratório encontrado.", wrapped("laboratorio", ref("Lab"))),
          401: errors[401],
          404: errors[404],
        },
      },
      put: {
        tags: ["Laboratórios"],
        summary: "Atualizar laboratório",
        description: "Rota exclusiva de administrador.",
        security,
        parameters: [id],
        requestBody: body(ref("LabUpdateRequest")),
        responses: {
          200: response("Laboratório atualizado.", wrapped("laboratorio", ref("Lab"))),
          ...errors,
        },
      },
      delete: {
        tags: ["Laboratórios"],
        summary: "Desativar laboratório",
        description: "Exclusão lógica exclusiva de administrador.",
        security,
        parameters: [id],
        responses: {
          204: response("Laboratório desativado."),
          401: errors[401],
          403: errors[403],
          404: errors[404],
        },
      },
    },
    "/reservas": {
      post: {
        tags: ["Reservas"],
        summary: "Criar reserva",
        description:
          "Exclusiva de professor. Exige antecedência de 3 dias, capacidade suficiente e horário livre.",
        security,
        requestBody: body(ref("ReservationCreateRequest")),
        responses: {
          201: response("Reserva criada com status pendente.", wrapped("reserva", ref("Reservation"))),
          400: errors[400],
          401: errors[401],
          403: errors[403],
          404: errors[404],
          409: response("Conflito de horário.", ref("Error")),
        },
      },
      get: {
        tags: ["Reservas"],
        summary: "Listar reservas",
        description:
          "Professor recebe as próprias reservas. Administrador pode consultar todas e filtrar.",
        security,
        parameters: [
          { name: "userId", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "labId", in: "query", schema: { type: "integer", minimum: 1 } },
          {
            name: "laboratorioId",
            in: "query",
            schema: { type: "integer", minimum: 1 },
            description: "Alias de labId.",
          },
          date,
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["pendente", "aprovada", "rejeitada", "cancelada"],
            },
          },
        ],
        responses: {
          200: response("Lista de reservas.", listResponse("reservas", "Reservation")),
          401: errors[401],
        },
      },
    },
    "/reservas/recomendacao": {
      get: {
        tags: ["Reservas"],
        summary: "Obter recomendação de reserva",
        description: "Exclusiva de professor; sugere laboratório, data e horário.",
        security,
        responses: {
          200: response("Recomendação gerada.", {
            type: "object",
            properties: {
              recomendacao: {
                type: "object",
                properties: {
                  data: { type: "string", format: "date" },
                  inicio: { type: "string" },
                  termino: { type: "string" },
                  laboratorio: ref("Lab"),
                },
              },
            },
          }),
          401: errors[401],
          403: errors[403],
        },
      },
    },
    "/reservas/{id}": {
      get: {
        tags: ["Reservas"],
        summary: "Consultar reserva",
        description: "Administrador consulta qualquer reserva; professor somente as próprias.",
        security,
        parameters: [id],
        responses: {
          200: response("Reserva encontrada.", wrapped("reserva", ref("Reservation"))),
          ...errors,
        },
      },
      put: {
        tags: ["Reservas"],
        summary: "Atualizar reserva",
        description:
          "Atualiza reserva futura e revalida regras. Somente administrador altera o status.",
        security,
        parameters: [id],
        requestBody: body(ref("ReservationUpdateRequest")),
        responses: {
          200: response("Reserva atualizada.", wrapped("reserva", ref("Reservation"))),
          ...errors,
          409: response("Conflito de horário.", ref("Error")),
        },
      },
      delete: {
        tags: ["Reservas"],
        summary: "Cancelar reserva",
        description: "Cancela logicamente uma reserva futura.",
        security,
        parameters: [id],
        responses: { 204: response("Reserva cancelada."), ...errors },
      },
    },
    "/reservas/{id}/aprovar": {
      patch: {
        tags: ["Reservas"],
        summary: "Aprovar reserva",
        description: "Exclusiva de administrador. Revalida conflitos antes da aprovação.",
        security,
        parameters: [id],
        responses: {
          200: response("Reserva aprovada.", wrapped("reserva", ref("Reservation"))),
          ...errors,
          409: response("Conflito de horário.", ref("Error")),
        },
      },
    },
    "/reservas/{id}/rejeitar": {
      patch: {
        tags: ["Reservas"],
        summary: "Rejeitar reserva",
        description: "Rota exclusiva de administrador.",
        security,
        parameters: [id],
        responses: {
          200: response("Reserva rejeitada.", wrapped("reserva", ref("Reservation"))),
          401: errors[401],
          403: errors[403],
          404: errors[404],
        },
      },
    },
    "/calendario": {
      get: {
        tags: ["Calendário"],
        summary: "Consultar calendário geral",
        description: "Retorna reservas e slots de todos os laboratórios para uma data.",
        security,
        parameters: [date],
        responses: {
          200: response("Calendário da data.", {
            type: "object",
            properties: {
              data: { type: "string", format: "date" },
              reservas: arrayOf("Reservation"),
              laboratorios: arrayOf("LabSchedule"),
            },
          }),
          400: errors[400],
          401: errors[401],
        },
      },
    },
    "/calendario/laboratorio/{id}": {
      get: {
        tags: ["Calendário"],
        summary: "Consultar calendário de um laboratório",
        description: "Retorna os slots de um laboratório para a data informada.",
        security,
        parameters: [id, date],
        responses: {
          200: response("Calendário do laboratório.", {
            type: "object",
            properties: {
              data: { type: "string", format: "date" },
              laboratorio: ref("Lab"),
              slots: { type: "array", items: ref("ScheduleSlot") },
            },
          }),
          400: errors[400],
          401: errors[401],
          404: errors[404],
        },
      },
    },
    "/calendario/disponiveis": {
      get: {
        tags: ["Calendário"],
        summary: "Listar laboratórios disponíveis",
        description:
          "Sem filtros lista todos; com data, início e término exclui os laboratórios ocupados.",
        security,
        parameters: [
          date,
          { name: "inicio", in: "query", schema: { type: "string", example: "08:00" } },
          { name: "termino", in: "query", schema: { type: "string", example: "10:00" } },
        ],
        responses: {
          200: response("Laboratórios disponíveis.", listResponse("laboratorios", "Lab")),
          400: errors[400],
          401: errors[401],
        },
      },
    },
    "/calendario/reservados": {
      get: {
        tags: ["Calendário"],
        summary: "Listar horários reservados",
        description: "Retorna reservas pendentes ou aprovadas, opcionalmente por data.",
        security,
        parameters: [date],
        responses: {
          200: response("Reservas ativas.", listResponse("reservas", "Reservation")),
          400: errors[400],
          401: errors[401],
        },
      },
    },
    "/problemas": {
      post: {
        tags: ["Problemas"],
        summary: "Registrar problema",
        description: "Cria um problema com status aberto para o usuário autenticado.",
        security,
        requestBody: body(ref("ProblemCreateRequest")),
        responses: {
          201: response("Problema registrado.", wrapped("problema", ref("Problem"))),
          400: errors[400],
          401: errors[401],
        },
      },
      get: {
        tags: ["Problemas"],
        summary: "Listar problemas",
        description: "Professor recebe os próprios registros; administrador consulta todos.",
        security,
        parameters: [
          { name: "userId", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "labId", in: "query", schema: { type: "integer", minimum: 1 } },
          {
            name: "laboratorioId",
            in: "query",
            schema: { type: "integer", minimum: 1 },
            description: "Alias de labId.",
          },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["aberto", "em_andamento", "resolvido"] },
          },
        ],
        responses: {
          200: response("Lista de problemas.", listResponse("problemas", "Problem")),
          401: errors[401],
        },
      },
    },
    "/problemas/{id}": {
      get: {
        tags: ["Problemas"],
        summary: "Consultar problema",
        description: "Administrador consulta qualquer problema; professor somente os próprios.",
        security,
        parameters: [id],
        responses: {
          200: response("Problema encontrado.", wrapped("problema", ref("Problem"))),
          ...errors,
        },
      },
      put: {
        tags: ["Problemas"],
        summary: "Atualizar problema",
        description:
          "Professor atualiza tipo e descrição dos próprios registros; administrador também altera status.",
        security,
        parameters: [id],
        requestBody: body(ref("ProblemUpdateRequest")),
        responses: {
          200: response("Problema atualizado.", wrapped("problema", ref("Problem"))),
          ...errors,
        },
      },
      delete: {
        tags: ["Problemas"],
        summary: "Excluir problema",
        description: "Remove fisicamente o problema. Rota exclusiva de administrador.",
        security,
        parameters: [id],
        responses: {
          204: response("Problema excluído."),
          401: errors[401],
          403: errors[403],
          404: errors[404],
        },
      },
    },
    "/relatorios/utilizacao": {
      get: {
        tags: ["Relatórios"],
        summary: "Gerar relatório de utilização",
        description: "Exclusiva de administrador; ignora reservas canceladas e rejeitadas.",
        security,
        responses: {
          200: response("Utilização por laboratório.", listResponse("utilizacao", "UsageReport")),
          401: errors[401],
          403: errors[403],
        },
      },
    },
    "/relatorios/historico": {
      get: {
        tags: ["Relatórios"],
        summary: "Consultar histórico de reservas",
        description: "Rota exclusiva de administrador.",
        security,
        responses: {
          200: response("Histórico completo.", listResponse("historico", "Reservation")),
          401: errors[401],
          403: errors[403],
        },
      },
    },
    "/relatorios/labs-mais-utilizados": {
      get: {
        tags: ["Relatórios"],
        summary: "Listar laboratórios mais utilizados",
        description: "Exclusiva de administrador; ordena por quantidade de reservas.",
        security,
        responses: {
          200: response("Ranking de utilização.", listResponse("laboratorios", "UsageReport")),
          401: errors[401],
          403: errors[403],
        },
      },
    },
    "/relatorios/problemas": {
      get: {
        tags: ["Relatórios"],
        summary: "Gerar relatório de problemas",
        description: "Exclusiva de administrador; agrupa a quantidade por status.",
        security,
        responses: {
          200: response("Relatório de problemas.", {
            type: "object",
            properties: {
              total: { type: "integer" },
              porStatus: {
                type: "object",
                additionalProperties: { type: "integer" },
                example: { aberto: 1, em_andamento: 1, resolvido: 1 },
              },
              problemas: arrayOf("Problem"),
            },
          }),
          401: errors[401],
          403: errors[403],
        },
      },
    },
    "/dashboard/resumo": {
      get: {
        tags: ["Dashboard"],
        summary: "Obter indicadores do dashboard",
        description: "Retorna indicadores respeitando o perfil autenticado.",
        security,
        responses: {
          200: response("Resumo do dashboard.", {
            type: "object",
            properties: {
              professores: { type: "integer" },
              agendamentosHoje: { type: "integer" },
              reclamacoesAbertas: { type: "integer" },
              agendamentosSemana: { type: "integer" },
              itensIndisponiveis: { type: "integer" },
            },
          }),
          401: errors[401],
        },
      },
    },
    "/inventario": {
      get: {
        tags: ["Inventário"],
        summary: "Listar inventário",
        description: "Lista itens e inclui o laboratório relacionado.",
        security,
        parameters: [
          {
            name: "labId",
            in: "query",
            schema: { type: "integer", minimum: 1 },
            description: "Filtra os itens por laboratório.",
          },
        ],
        responses: {
          200: response("Itens de inventário.", listResponse("inventario", "InventoryItem")),
          401: errors[401],
        },
      },
    },
    "/acessos/checkin": {
      post: {
        tags: ["Acessos"],
        summary: "Registrar check-in",
        description: "Registra a entrada do usuário autenticado em um laboratório.",
        security,
        requestBody: body(ref("LabReferenceRequest")),
        responses: {
          201: response("Check-in registrado.", wrapped("acesso", ref("Access"))),
          400: errors[400],
          401: errors[401],
        },
      },
    },
    "/acessos/checkout": {
      post: {
        tags: ["Acessos"],
        summary: "Registrar checkout",
        description: "Registra a saída do usuário autenticado de um laboratório.",
        security,
        requestBody: body(ref("LabReferenceRequest")),
        responses: {
          201: response("Checkout registrado.", wrapped("acesso", ref("Access"))),
          400: errors[400],
          401: errors[401],
        },
      },
    },
  },
};

export const openapiSpec = swaggerJSDoc({ definition, apis: [] });
