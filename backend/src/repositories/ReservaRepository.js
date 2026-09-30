import { Op } from "sequelize";
import sequelize from "../config/database.js";
import Laboratorio from "../models/Laboratorio.js";
import Reserva from "../models/Reserva.js";

const plain = (instance) => instance?.get({ plain: true }) ?? null;

function normalizeDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function normalizeTime(value) {
  return String(value).slice(0, 5);
}

function mapReserva(instance) {
  const row = plain(instance);
  return (
    row && {
      ...row,
      data: normalizeDate(row.data),
      inicio: normalizeTime(row.inicio),
      termino: normalizeTime(row.termino),
      observacao: row.observacao || "",
    }
  );
}

function whereFromFilters(filters = {}) {
  const where = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.labId) where.labId = filters.labId;
  if (filters.data) where.data = filters.data;
  if (filters.status) where.status = filters.status;
  return where;
}

export default class ReservaRepository {
  async findAll(filters = {}) {
    const rows = await Reserva.findAll({
      where: whereFromFilters(filters),
      order: [
        ["data", "ASC"],
        ["inicio", "ASC"],
      ],
    });
    return rows.map(mapReserva);
  }

  async findById(id) {
    return mapReserva(await Reserva.findByPk(id));
  }

  async create(attributes, options = {}) {
    const createWithTransaction = async (transaction) => {
      const lab = await Laboratorio.findByPk(attributes.labId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!lab) {
        const error = new Error("Laboratório não encontrado.");
        error.status = 404;
        throw error;
      }

      const conflict = await Reserva.findOne({
        where: {
          labId: attributes.labId,
          data: attributes.data,
          status: { [Op.in]: ["pendente", "aprovada"] },
          inicio: { [Op.lt]: attributes.termino },
          termino: { [Op.gt]: attributes.inicio },
        },
        transaction,
      });

      if (conflict) {
        const error = new Error("Já existe reserva para este laboratório no horário informado.");
        error.status = 409;
        throw error;
      }

      const reservation = await Reserva.create(
        { ...attributes, status: attributes.status || "aprovada", observacao: attributes.observacao || "" },
        { ...options, transaction },
      );
      return mapReserva(reservation);
    };

    if (options.transaction) return createWithTransaction(options.transaction);
    return sequelize.transaction(createWithTransaction);
  }

  async update(id, attributes, options = {}) {
    const reservation = await Reserva.findByPk(id, options);
    if (!reservation) return null;
    await reservation.update(attributes, options);
    return mapReserva(reservation);
  }

  async delete(id, options = {}) {
    return (await Reserva.destroy({ where: { id }, ...options })) > 0;
  }
}
