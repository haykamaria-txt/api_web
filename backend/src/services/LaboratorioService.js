import ServiceError from "./ServiceError.js";

function requireField(value, message) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new ServiceError(400, message);
  }
}

function positiveCapacity(value) {
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    throw new ServiceError(400, "Capacidade deve ser um número inteiro positivo.");
  }
  return capacity;
}

export default class LaboratorioService {
  constructor(laboratorioRepository) {
    this.laboratorios = laboratorioRepository;
  }

  async list(filters = {}, options = {}) {
    const labs = await this.laboratorios.findAll(options);
    const minimum = Number(filters.capacidadeMin || filters.capacidade || 0);
    return labs.filter((lab) => !minimum || Number(lab.capacidade) >= minimum);
  }

  async findById(id, { includeInactive = false } = {}) {
    const lab = await this.laboratorios.findById(id);
    if (!lab || (!includeInactive && lab.ativo === false)) {
      throw new ServiceError(404, "Laboratório não encontrado.");
    }
    return lab;
  }

  async create(body) {
    requireField(body.nome, "Nome do laboratório é obrigatório.");
    requireField(body.tipo, "Tipo do laboratório é obrigatório.");
    requireField(body.capacidade, "Capacidade é obrigatória.");
    return this.laboratorios.create({
      nome: String(body.nome).trim(),
      tipo: String(body.tipo).trim(),
      capacidade: positiveCapacity(body.capacidade),
      localizacao: String(body.localizacao || "Não informada").trim(),
      recursos: Array.isArray(body.recursos) ? body.recursos : [],
    });
  }

  async update(id, body) {
    const current = await this.findById(id, { includeInactive: true });
    const updated = await this.laboratorios.update(id, {
      nome: body.nome ?? current.nome,
      tipo: body.tipo ?? current.tipo,
      capacidade: body.capacidade ? positiveCapacity(body.capacidade) : current.capacidade,
      localizacao: body.localizacao ?? current.localizacao,
      recursos: Array.isArray(body.recursos) ? body.recursos : current.recursos,
      ativo: current.ativo,
    });
    if (!updated) throw new ServiceError(404, "Laboratório não encontrado.");
    return updated;
  }

  async delete(id) {
    const lab = await this.laboratorios.delete(id);
    if (!lab) throw new ServiceError(404, "Laboratório não encontrado.");
    return lab;
  }

  async resolveId(body) {
    const labId = Number(body.labId || body.laboratorioId);
    if (Number.isInteger(labId) && labId > 0) return labId;
    if (body.laboratorio) {
      const labs = await this.laboratorios.findAll();
      const lab = labs.find((item) => item.nome === body.laboratorio);
      if (lab) return lab.id;
    }
    throw new ServiceError(400, "Laboratório é obrigatório.");
  }
}
