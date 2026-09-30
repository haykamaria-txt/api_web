import Laboratorio from "../models/Laboratorio.js";

const plain = (instance) => instance?.get({ plain: true }) ?? null;

export default class LaboratorioRepository {
  async findAll({ includeInactive = false } = {}) {
    const rows = await Laboratorio.findAll({
      where: includeInactive ? {} : { ativo: true },
      order: [["nome", "ASC"]],
    });
    return rows.map(plain);
  }

  async findById(id) {
    return plain(await Laboratorio.findByPk(id));
  }

  async create(attributes, options = {}) {
    return plain(await Laboratorio.create(attributes, options));
  }

  async update(id, attributes) {
    const laboratorio = await Laboratorio.findByPk(id);
    if (!laboratorio) return null;
    await laboratorio.update(attributes);
    return plain(laboratorio);
  }

  async delete(id) {
    return this.update(id, { ativo: false });
  }
}
