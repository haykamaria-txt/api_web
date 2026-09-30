import Inventario from "../models/Inventario.js";

const plain = (instance) => instance?.get({ plain: true }) ?? null;

export default class InventarioRepository {
  async findAll(filters = {}) {
    const rows = await Inventario.findAll({
      where: filters.labId ? { labId: filters.labId } : {},
      order: [
        ["labId", "ASC"],
        ["item", "ASC"],
      ],
    });
    return rows.map(plain);
  }

  async findById(id) {
    return plain(await Inventario.findByPk(id));
  }

  async create(attributes, options = {}) {
    return plain(await Inventario.create(attributes, options));
  }

  async update(id, attributes, options = {}) {
    const item = await Inventario.findByPk(id, options);
    if (!item) return null;
    await item.update(attributes, options);
    return plain(item);
  }

  async delete(id, options = {}) {
    return (await Inventario.destroy({ where: { id }, ...options })) > 0;
  }
}
