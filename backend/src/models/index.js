import Acesso from "./Acesso.js";
import Inventario from "./Inventario.js";
import Laboratorio from "./Laboratorio.js";
import Problema from "./Problema.js";
import Reserva from "./Reserva.js";
import Usuario from "./Usuario.js";

const foreignKey = (name) => ({
  foreignKey: { name, allowNull: false },
  onDelete: "NO ACTION",
  onUpdate: "NO ACTION",
});

Usuario.hasMany(Reserva, { ...foreignKey("userId"), as: "reservas" });
Reserva.belongsTo(Usuario, { ...foreignKey("userId"), as: "usuario" });
Laboratorio.hasMany(Reserva, { ...foreignKey("labId"), as: "reservas" });
Reserva.belongsTo(Laboratorio, { ...foreignKey("labId"), as: "laboratorio" });

Usuario.hasMany(Problema, { ...foreignKey("userId"), as: "problemas" });
Problema.belongsTo(Usuario, { ...foreignKey("userId"), as: "usuario" });
Laboratorio.hasMany(Problema, { ...foreignKey("labId"), as: "problemas" });
Problema.belongsTo(Laboratorio, { ...foreignKey("labId"), as: "laboratorio" });

Laboratorio.hasMany(Inventario, { ...foreignKey("labId"), as: "inventario" });
Inventario.belongsTo(Laboratorio, { ...foreignKey("labId"), as: "laboratorio" });

Usuario.hasMany(Acesso, { ...foreignKey("userId"), as: "acessos" });
Acesso.belongsTo(Usuario, { ...foreignKey("userId"), as: "usuario" });
Laboratorio.hasMany(Acesso, { ...foreignKey("labId"), as: "acessos" });
Acesso.belongsTo(Laboratorio, { ...foreignKey("labId"), as: "laboratorio" });

export { Acesso as Access, Inventario as InventoryItem, Laboratorio as Lab };
export { Problema as Problem, Reserva as Reservation, Usuario as User };

export default {
  Access: Acesso,
  InventoryItem: Inventario,
  Lab: Laboratorio,
  Problem: Problema,
  Reservation: Reserva,
  User: Usuario,
};
