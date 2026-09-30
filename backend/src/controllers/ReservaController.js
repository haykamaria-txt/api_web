export default class ReservaController {
  constructor(services) {
    this.services = services;
  }

  async create(req, res) {
    const reserva = await this.services.reservas.create(req.body, req.user);
    res.status(201).json({ reserva });
  }

  async list(req, res) {
    const filters = {
      labId: req.query.labId || req.query.laboratorioId,
      data: req.query.data,
      status: req.query.status,
      userId: req.query.userId,
    };
    res.json({ reservas: await this.services.reservas.list(filters, req.user) });
  }

  async recommendation(req, res) {
    res.json({ recomendacao: await this.services.reservas.recommendation(req.user) });
  }

  async findById(req, res) {
    res.json({ reserva: await this.services.reservas.findById(req.params.id, req.user) });
  }

  async update(req, res) {
    res.json({ reserva: await this.services.reservas.update(req.params.id, req.body, req.user) });
  }

  async cancel(req, res) {
    await this.services.reservas.cancel(req.params.id, req.user);
    res.status(204).send();
  }

  async approve(req, res) {
    res.json({ reserva: await this.services.reservas.approve(req.params.id) });
  }

  async reject(req, res) {
    res.json({ reserva: await this.services.reservas.reject(req.params.id) });
  }

  async calendar(req, res) {
    res.json(await this.services.reservas.calendar(req.query.data));
  }

  async calendarByLab(req, res) {
    res.json(await this.services.reservas.calendarByLab(req.query.data, req.params.id));
  }

  async availableLabs(req, res) {
    res.json({ laboratorios: await this.services.reservas.availableLabs(req.query) });
  }

  async reserved(req, res) {
    res.json({ reservas: await this.services.reservas.reserved(req.query.data) });
  }

  async utilizationReport(req, res) {
    res.json({ utilizacao: await this.services.reservas.utilizationReport() });
  }

  async history(req, res) {
    res.json({ historico: await this.services.reservas.history() });
  }

  async mostUsedLabs(req, res) {
    res.json({ laboratorios: await this.services.reservas.mostUsedLabs() });
  }
}
