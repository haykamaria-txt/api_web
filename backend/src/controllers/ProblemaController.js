export default class ProblemaController {
  constructor(services) {
    this.services = services;
  }

  async create(req, res) {
    const problema = await this.services.problemas.create(req.body, req.user);
    res.status(201).json({ problema });
  }

  async list(req, res) {
    const filters = {
      labId: req.query.labId || req.query.laboratorioId,
      status: req.query.status,
      userId: req.query.userId,
    };
    res.json({ problemas: await this.services.problemas.list(filters, req.user) });
  }

  async findById(req, res) {
    res.json({ problema: await this.services.problemas.findById(req.params.id, req.user) });
  }

  async update(req, res) {
    res.json({ problema: await this.services.problemas.update(req.params.id, req.body, req.user) });
  }

  async delete(req, res) {
    await this.services.problemas.delete(req.params.id);
    res.status(204).send();
  }

  async report(req, res) {
    res.json(await this.services.problemas.report());
  }
}
