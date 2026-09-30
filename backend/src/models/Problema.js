import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Problema = sequelize.define(
  "Problema",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    labId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "laboratorio_id",
      references: { model: "laboratorios", key: "id" },
      onUpdate: "NO ACTION",
      onDelete: "NO ACTION",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "usuario_id",
      references: { model: "usuarios", key: "id" },
      onUpdate: "NO ACTION",
      onDelete: "NO ACTION",
    },
    tipo: { type: DataTypes.STRING(120), allowNull: false },
    descricao: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "aberto",
      validate: { isIn: [["aberto", "em_andamento", "resolvido"]] },
    },
  },
  { tableName: "problemas", timestamps: true, underscored: true },
);

export default Problema;
