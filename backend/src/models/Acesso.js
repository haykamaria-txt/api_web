import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Acesso = sequelize.define(
  "Acesso",
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
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [["checkin", "checkout"]] },
    },
  },
  {
    tableName: "acessos",
    timestamps: true,
    updatedAt: false,
    underscored: true,
  },
);

export default Acesso;
