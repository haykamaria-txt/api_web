import Usuario from "../models/Usuario.js";

const plain = (instance) => instance?.get({ plain: true }) ?? null;

export default class UsuarioRepository {
  async count() {
    return Usuario.count();
  }

  async findAll({ includeInactive = false } = {}) {
    const rows = await Usuario.findAll({
      where: includeInactive ? {} : { ativo: true },
      order: [["nome", "ASC"]],
    });
    return rows.map(plain);
  }

  async findById(id) {
    return plain(await Usuario.findByPk(id));
  }

  async findByMatricula(matricula) {
    return plain(await Usuario.findOne({ where: { matricula, ativo: true } }));
  }

  async create(attributes, options = {}) {
    return plain(await Usuario.create(attributes, options));
  }

  async update(id, attributes) {
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return null;
    await usuario.update(attributes);
    return plain(usuario);
  }

  async delete(id) {
    return this.update(id, { ativo: false });
  }
}
