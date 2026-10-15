import { useState } from "react";
import { Text } from "react-native";
import { Guard } from "../components/Guard";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { errorMessage } from "../services/session";
import {
  Page,
  Card,
  Input,
  Button,
  Choices,
  Confirm,
  Sheet,
  Status,
  Pager,
  styles,
} from "../components/ui";
import { EntityForm } from "../components/EntityForm";
export default function Users() {
  const [q, setQ] = useState(""),
    [rol, setRol] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<any>(null),
    [newRole, setNewRole] = useState("empleado");
  const r = useResource(
    `/users?q=${encodeURIComponent(q)}&page=${page}${rol ? `&rol=${rol}` : ""}`,
  );
  const roles = ["admin", "encargado", "empleado"].map((v) => ({
    value: v,
    label: v,
  }));
  async function change(path: string, body: any) {
    try {
      await api.patch(`/users/${selected.id}/${path}`, body);
      setSelected(null);
      await r.load();
    } catch (e) {
      throw new Error(errorMessage(e));
    }
  }
  return (
    <Guard roles={["admin"]}>
      <Page title="Equipo" subtitle="Usuarios, roles y acceso al comercio">
        <Input
          label="Buscar por nombre o email"
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
        <Choices
          value={rol}
          options={[{ value: "", label: "Todos" }, ...roles]}
          onChange={(v) => {
            setRol(v);
            setPage(1);
          }}
        />
        <Status
          loading={r.loading}
          error={r.error}
          retry={r.load}
          empty={!r.data?.items.length}
        />
        {r.data?.items.map((u: any) => (
          <Card key={u.id}>
            <Text style={styles.label}>{u.nombre}</Text>
            <Text style={styles.subtitle}>
              {u.email} · {u.rol} · {u.activo ? "Activo" : "Inactivo"}
            </Text>
            <Button
              title="Administrar"
              secondary
              onPress={() => {
                setSelected(u);
                setNewRole(u.rol);
              }}
            />
          </Card>
        ))}
        <Pager page={page} total={r.data?.total || 0} onChange={setPage} />
        <Sheet
          visible={!!selected}
          title="Detalle del usuario"
          onClose={() => setSelected(null)}
        >
          {selected && (
            <>
              <Text style={styles.subtitle}>
                {selected.email} · Verificado:{" "}
                {selected.email_verificado ? "Sí" : "No"}
              </Text>
              <EntityForm
                initial={selected}
                fields={[{ name: "nombre", label: "Nombre", required: true }]}
                onSubmit={async (v) => {
                  await api.patch(`/users/${selected.id}`, v);
                  setSelected(null);
                  await r.load();
                }}
              />
              <Choices value={newRole} options={roles} onChange={setNewRole} />
              <Confirm
                title="Cambiar rol"
                message={`Cambiar el rol de ${selected.nombre} a ${newRole} revocará sus sesiones.`}
                onConfirm={() => change("role", { rol: newRole })}
              />
              <Confirm
                title={
                  selected.activo ? "Desactivar usuario" : "Activar usuario"
                }
                danger={!!selected.activo}
                message="Se actualizará el acceso y se revocarán las sesiones del usuario."
                onConfirm={() => change("status", { activo: !selected.activo })}
              />
            </>
          )}
        </Sheet>
      </Page>
    </Guard>
  );
}
