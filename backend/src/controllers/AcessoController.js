export default class AcessoController {
  constructor(services) {
    this.services = services;
  }

  async checkin(req, res) {
    const acesso = await this.services.acessos.create(req.body, req.user, "checkin");
    res.status(201).json({ acesso });
  }

  async checkout(req, res) {
    const acesso = await this.services.acessos.create(req.body, req.user, "checkout");
    res.status(201).json({ acesso });
  }
}
