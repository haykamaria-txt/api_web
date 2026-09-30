export default class AcessoService {
  constructor(acessoRepository, laboratorioService) {
    this.acessos = acessoRepository;
    this.laboratorios = laboratorioService;
  }

  async create(body, requester, tipo) {
    const labId = await this.laboratorios.resolveId(body);
    return this.acessos.create({ labId, userId: requester.id, tipo });
  }

  list(filters) {
    return this.acessos.findAll(filters);
  }

  findById(id) {
    return this.acessos.findById(id);
  }

  update(id, attributes) {
    return this.acessos.update(id, attributes);
  }

  delete(id) {
    return this.acessos.delete(id);
  }
}
