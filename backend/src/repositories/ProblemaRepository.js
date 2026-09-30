import Problema from "../models/Problema.js";

const plain = (instance) => instance?.get({ plain: true }) ?? null;

export default class ProblemaRepository {
  async findAll(filters = {}) {
    const where = {};
    if (filters.userId) where.userId = filters.userId;
    if (filters.labId) where.labId = filters.labId;
    if (filters.status) where.status = filters.status;

    const rows = await Problema.findAll({ where, order: [["createdAt", "DESC"]] });
    return rows.map(plain);
  }

  async findById(id) {
    return plain(await Problema.findByPk(id));
  }

  async create(attributes, options = {}) {
    return plain(await Problema.create({ ...attributes, status: attributes.status || "aberto" }, options));
  }

  async update(id, attributes, options = {}) {
    const problema = await Problema.findByPk(id, options);
    if (!problema) return null;
    await problema.update(attributes, options);
    return plain(problema);
  }

  async delete(id, options = {}) {
    return (await Problema.destroy({ where: { id }, ...options })) > 0;
  }
}
