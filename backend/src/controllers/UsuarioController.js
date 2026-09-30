import { publicUser } from "../services/UsuarioService.js";

export default class UsuarioController {
  constructor(services) {
    this.services = services;
  }

  async list(req, res) {
    const usuarios = await this.services.usuarios.list();
    res.json({ usuarios: usuarios.map(publicUser) });
  }

  async findById(req, res) {
    const usuario = await this.services.usuarios.findForUser(req.params.id, req.user);
    res.json({ usuario: publicUser(usuario) });
  }

  async update(req, res) {
    const usuario = await this.services.usuarios.updateForUser(req.params.id, req.body, req.user);
    res.json({ usuario: publicUser(usuario) });
  }

  async delete(req, res) {
    await this.services.usuarios.delete(req.params.id);
    res.status(204).send();
  }
}
