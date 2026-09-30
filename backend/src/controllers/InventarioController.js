export default class InventarioController {
  constructor(services) {
    this.services = services;
  }

  async list(req, res) {
    res.json({ inventario: await this.services.inventario.list(req.query) });
  }
}
