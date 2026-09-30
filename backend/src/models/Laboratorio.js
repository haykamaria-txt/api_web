import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Laboratorio = sequelize.define(
  "Laboratorio",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(160), allowNull: false },
    tipo: { type: DataTypes.STRING(120), allowNull: false },
    capacidade: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },
    localizacao: { type: DataTypes.STRING(160), allowNull: false },
    recursos: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "laboratorios", timestamps: true, underscored: true },
);

export default Laboratorio;
