export default class InventarioService {
  constructor(inventarioRepository, laboratorioRepository) {
    this.inventario = inventarioRepository;
    this.laboratorios = laboratorioRepository;
  }

  async list(filters = {}) {
    const [items, labs] = await Promise.all([
      this.inventario.findAll(filters),
      this.laboratorios.findAll({ includeInactive: true }),
    ]);
    return items.map((item) => ({
      ...item,
      laboratorio: labs.find((lab) => Number(lab.id) === Number(item.labId)) || null,
    }));
  }

  findById(id) {
    return this.inventario.findById(id);
  }

  create(attributes) {
    return this.inventario.create(attributes);
  }

  update(id, attributes) {
    return this.inventario.update(id, attributes);
  }

  delete(id) {
    return this.inventario.delete(id);
  }
}
