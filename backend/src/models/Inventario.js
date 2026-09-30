import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Inventario = sequelize.define(
  "Inventario",
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
    item: { type: DataTypes.STRING(160), allowNull: false },
    disponivel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    indisponivel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
  },
  { tableName: "inventario", timestamps: true, underscored: true },
);

export default Inventario;
