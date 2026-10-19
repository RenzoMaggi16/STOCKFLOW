import { pool } from "../config/db";
// Solo perfil propio, invocado desde /auth/me. Los administradores de negocios
// no pueden editar identidades, desactivar cuentas ni revocar sesiones globales.
export async function edit(id: number, nombre: string) {
  await pool.execute("UPDATE usuarios SET nombre=? WHERE id=?", [nombre, id]);
}
