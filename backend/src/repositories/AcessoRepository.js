import Acesso from "../models/Acesso.js";

const plain = (instance) => instance?.get({ plain: true }) ?? null;

export default class AcessoRepository {
  async findAll(filters = {}) {
    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.labId) where.labId = filters.labId;
    if (filters.tipo) where.tipo = filters.tipo;
    const rows = await Acesso.findAll({ where, order: [["createdAt", "DESC"]] });
    return rows.map(plain);
  }

  async findById(id) {
    return plain(await Acesso.findByPk(id));
  }

  async create(attributes, options = {}) {
    return plain(await Acesso.create(attributes, options));
  }

  async update(id, attributes, options = {}) {
    const acesso = await Acesso.findByPk(id, options);
    if (!acesso) return null;
    await acesso.update(attributes, options);
    return plain(acesso);
  }

  async delete(id, options = {}) {
    return (await Acesso.destroy({ where: { id }, ...options })) > 0;
  }
}
