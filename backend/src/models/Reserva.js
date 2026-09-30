import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Reserva = sequelize.define(
  "Reserva",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "usuario_id",
      references: { model: "usuarios", key: "id" },
      onUpdate: "NO ACTION",
      onDelete: "NO ACTION",
    },
    labId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "laboratorio_id",
      references: { model: "laboratorios", key: "id" },
      onUpdate: "NO ACTION",
      onDelete: "NO ACTION",
    },
    data: { type: DataTypes.DATEONLY, allowNull: false },
    inicio: { type: DataTypes.TIME, allowNull: false },
    termino: { type: DataTypes.TIME, allowNull: false },
    quantidadeAlunos: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "quantidade_alunos",
      validate: { min: 1 },
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "aprovada",
      validate: { isIn: [["pendente", "aprovada", "rejeitada", "cancelada"]] },
    },
    observacao: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "reservas",
    timestamps: true,
    underscored: true,
    indexes: [{ name: "idx_reservas_laboratorio_data", fields: ["laboratorio_id", "data", "inicio", "termino"] }],
    validate: {
      horarioValido() {
        if (this.inicio && this.termino && this.inicio >= this.termino) {
          throw new Error("O horário de início deve ser anterior ao horário de término.");
        }
      },
    },
  },
);

export default Reserva;
