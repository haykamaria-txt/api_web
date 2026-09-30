import { publicUser } from "../services/UsuarioService.js";

export default class AutenticacaoController {
  constructor(services) {
    this.services = services;
  }

  async register(req, res) {
    const usuario = await this.services.usuarios.register(req.body, req.user);
    res.status(201).json({ usuario: publicUser(usuario) });
  }

  async login(req, res) {
    res.json(await this.services.usuarios.login(req.body));
  }

  getProfile(req, res) {
    res.json({ usuario: publicUser(req.user) });
  }

  async updateProfile(req, res) {
    const usuario = await this.services.usuarios.updateProfile(req.user, req.body);
    res.json({ usuario: publicUser(usuario) });
  }
}
