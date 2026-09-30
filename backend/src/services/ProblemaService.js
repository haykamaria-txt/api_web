import ServiceError from "./ServiceError.js";
import { publicUser } from "./UsuarioService.js";

const problemStatuses = ["aberto", "em_andamento", "resolvido"];

function requireField(value, message) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new ServiceError(400, message);
  }
}

export default class ProblemaService {
  constructor(problemaRepository, usuarioRepository, laboratorioService) {
    this.problemas = problemaRepository;
    this.usuarios = usuarioRepository;
    this.laboratorios = laboratorioService;
  }

  async enrich(problem) {
    const [user, lab] = await Promise.all([
      this.usuarios.findById(problem.userId),
      this.laboratorios.findById(problem.labId, { includeInactive: true }),
    ]);
    return { ...problem, responsavel: publicUser(user), laboratorio: lab };
  }

  async create(body, requester) {
    const labId = await this.laboratorios.resolveId(body);
    requireField(body.tipo, "Tipo de problema é obrigatório.");
    requireField(body.descricao, "Descrição é obrigatória.");
    return this.enrich(
      await this.problemas.create({
        labId,
        userId: requester.id,
        tipo: String(body.tipo).trim(),
        descricao: String(body.descricao).trim(),
        status: "aberto",
      }),
    );
  }

  async list(filters, requester) {
    const problems = await this.problemas.findAll({
      ...filters,
      userId: requester.role === "admin" ? filters.userId : requester.id,
    });
    return Promise.all(problems.map((problem) => this.enrich(problem)));
  }

  async findById(id, requester) {
    const problem = await this.problemas.findById(id);
    if (!problem) throw new ServiceError(404, "Problema não encontrado.");
    if (requester.role !== "admin" && Number(problem.userId) !== Number(requester.id)) {
      throw new ServiceError(403, "Usuário sem permissão para acessar este problema.");
    }
    return this.enrich(problem);
  }

  async update(id, body, requester) {
    const current = await this.problemas.findById(id);
    if (!current) throw new ServiceError(404, "Problema não encontrado.");
    if (requester.role !== "admin" && Number(current.userId) !== Number(requester.id)) {
      throw new ServiceError(403, "Usuário sem permissão para atualizar este problema.");
    }
    const labId =
      body.labId || body.laboratorioId ? await this.laboratorios.resolveId(body) : current.labId;
    const status = requester.role === "admin" ? body.status || current.status : current.status;
    if (!problemStatuses.includes(status)) {
      throw new ServiceError(400, "Status de problema inválido.");
    }
    const updated = await this.problemas.update(id, {
      labId,
      userId: current.userId,
      tipo: body.tipo || current.tipo,
      descricao: body.descricao || current.descricao,
      status,
    });
    if (!updated) throw new ServiceError(404, "Problema não encontrado.");
    return this.enrich(updated);
  }

  async delete(id) {
    if (!(await this.problemas.delete(id))) throw new ServiceError(404, "Problema não encontrado.");
  }

  async report() {
    const problems = await this.problemas.findAll();
    const byStatus = problems.reduce((acc, problem) => {
      acc[problem.status] = (acc[problem.status] || 0) + 1;
      return acc;
    }, {});
    return {
      total: problems.length,
      porStatus: byStatus,
      problemas: await Promise.all(problems.map((problem) => this.enrich(problem))),
    };
  }
}
