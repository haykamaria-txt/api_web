import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Usuario = sequelize.define(
  "Usuario",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING(160), allowNull: false },
    matricula: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    curso: { type: DataTypes.STRING(120), allowNull: false },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "perfil",
      validate: { isIn: [["admin", "professor"]] },
    },
    passwordHash: { type: DataTypes.TEXT, allowNull: false, field: "senha_hash" },
    ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "usuarios", timestamps: true, underscored: true },
);

export default Usuario;
