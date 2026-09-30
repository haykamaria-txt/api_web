import { hashPassword } from "../security.js";
import { createSeedData } from "../seed.js";
import sequelize from "../config/database.js";

export default class SeedService {
  constructor(repositories) {
    this.repositories = repositories;
  }

  async seedIfEmpty() {
    const { usuarios, laboratorios, reservas, problemas, inventario } = this.repositories;
    if ((await usuarios.count()) > 0) return;

    const seed = await createSeedData(hashPassword);
    await sequelize.transaction(async (transaction) => {
      const userIds = new Map();
      const labIds = new Map();

      for (const { id: sourceId, ...attributes } of seed.users) {
        const usuario = await usuarios.create(attributes, { transaction });
        userIds.set(sourceId, usuario.id);
      }

      for (const { id: sourceId, ...attributes } of seed.labs) {
        const laboratorio = await laboratorios.create(attributes, { transaction });
        labIds.set(sourceId, laboratorio.id);
      }

      for (const { id: ignoredId, userId, labId, ...attributes } of seed.reservations) {
        await reservas.create(
          { ...attributes, userId: userIds.get(userId), labId: labIds.get(labId) },
          { transaction },
        );
      }

      for (const { id: ignoredId, userId, labId, ...attributes } of seed.problems) {
        await problemas.create(
          { ...attributes, userId: userIds.get(userId), labId: labIds.get(labId) },
          { transaction },
        );
      }

      for (const { id: ignoredId, labId, ...attributes } of seed.inventory) {
        await inventario.create({ ...attributes, labId: labIds.get(labId) }, { transaction });
      }
    });
  }
}
