export default class DashboardController {
  constructor(services) {
    this.services = services;
  }

  async summary(req, res) {
    res.json(await this.services.dashboard.summary(req.user));
  }
}
