export default class LaboratorioController {
  constructor(services) {
    this.services = services;
  }

  async list(req, res) {
    res.json({ laboratorios: await this.services.laboratorios.list(req.query) });
  }

  async create(req, res) {
    const laboratorio = await this.services.laboratorios.create(req.body);
    res.status(201).json({ laboratorio });
  }

  async findById(req, res) {
    res.json({ laboratorio: await this.services.laboratorios.findById(req.params.id) });
  }

  async update(req, res) {
    res.json({ laboratorio: await this.services.laboratorios.update(req.params.id, req.body) });
  }

  async delete(req, res) {
    await this.services.laboratorios.delete(req.params.id);
    res.status(204).send();
  }
}
