import React, { useState, useEffect, useRef } from "react";
import { SectionHeading } from "./WorkspaceDesign";
import { Text, View } from "react-native";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button, Input, Sheet, Status, styles, Pager } from "./ui";
import { useResource } from "../hooks/useResource";
import { api } from "../services/api";
import { errorMessage } from "../services/session";
export type Field = {
  name: string;
  label: string;
  required?: boolean;
  numeric?: boolean;
  secure?: boolean;
  resource?: string;
  allowCreate?: boolean;
  section?: string;
  hint?: string;
  validate?: (value: string) => string | true;
};
export function ResourceSelect({
  resource,
  label,
  value,
  onChange,
  allowCreate = false,
}: {
  resource: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  allowCreate?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [picked, setPicked] = useState("");
  const [creating,setCreating] = useState(false), [createError,setCreateError] = useState("");
  const creatingRef=useRef(false);
  useEffect(() => {
    if (!value) {
      return;
    }
    let active = true;
    api
      .get(`${resource}/${value}`)
      .then((r) => {
        if (active) setPicked(r.data.data.nombre);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [resource, value]);
  const r = useResource(`${resource}?q=${encodeURIComponent(q)}&page=${page}`);
  async function createOrSelect() {
    const name=q.trim();
    if(!allowCreate || !["/categories","/suppliers"].includes(resource) || !name || creatingRef.current) return;
    creatingRef.current=true; setCreating(true); setCreateError("");
    try {
      // Consulta actual: no confiar en una lista que todavía muestra la búsqueda anterior.
      const response=await api.get(`${resource}?q=${encodeURIComponent(name)}&limit=100`);
      const existing=response.data.data.items.find((item:any)=>item.nombre.localeCompare(name,undefined,{sensitivity:"base"})===0);
      const item=existing || (await api.post(resource,{nombre:name})).data.data;
      onChange(String(item.id));setPicked(item.nombre);setOpen(false);void r.load();
    } catch(e) {setCreateError(errorMessage(e));}
    finally {creatingRef.current=false;setCreating(false);}
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <Button
        title={value ? picked || "Cargando selección…" : "Seleccionar"}
        secondary
        onPress={() => setOpen(true)}
      />
      <Sheet visible={open} title={label} onClose={() => setOpen(false)}>
        <Input
          label="Buscar"
          value={q}
          disabled={creating}
          onSubmit={allowCreate ? ()=>void createOrSelect() : undefined}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
        {allowCreate && <><Text style={styles.subtitle}>Escribí el nombre y presioná Enter para seleccionar o crear el registro. Se guarda en este negocio, incluso si después cancelás el producto.</Text>{!!q.trim() && <Button title={creating ? "Guardando…" : `Usar o crear «${q.trim()}»`} disabled={creating} onPress={()=>void createOrSelect()}/>}<Status error={createError}/></>}
        <Button
          title="Sin selección"
          secondary
          onPress={() => {
            onChange("");
            setPicked("");
            setOpen(false);
          }}
        />
        <Status
          loading={r.loading}
          error={r.error}
          retry={r.load}
          empty={!r.data?.items.length}
        />
        {r.data?.items.map((item: any) => (
          <Button
            key={item.id}
            title={`${item.nombre}${item.stock !== undefined ? ` · Stock ${item.stock}` : ""}`}
            secondary
            onPress={() => {
              onChange(String(item.id));
              setPicked(item.nombre);
              setOpen(false);
            }}
          />
        ))}
        <Pager page={page} total={r.data?.total || 0} onChange={setPage} />
      </Sheet>
    </View>
  );
}
export function EntityForm({
  fields,
  initial = {},
  onSubmit,
  label = "Guardar",
  preview,
}: {
  fields: Field[];
  initial?: Record<string, unknown>;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  label?: string;
  preview?: (values: Record<string,string>) => React.ReactNode;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Record<string, string>>({
    defaultValues: Object.fromEntries(
      fields.map((f) => [f.name, String(initial[f.name] ?? "")]),
    ),
  });
  const [error, setError] = useState("");
  const values=useWatch({control}) as Record<string,string>;
  return (
    <View style={{ gap: 16 }}>
      {fields.map((f) => (
        <View key={f.name} style={{ gap: 5 }}>
          {f.section && <SectionHeading title={f.section} icon="options-outline"/>}
          <Controller
            control={control}
            name={f.name}
            rules={{
              required: f.required ? "Este campo es obligatorio" : false,
              validate: f.validate,
            }}
            render={({ field }) =>
              f.resource ? (
                <ResourceSelect
                  resource={f.resource}
                  label={f.label}
                  value={field.value}
                  onChange={field.onChange}
                  allowCreate={f.allowCreate}
                />
              ) : (
                <Input
                  label={f.label}
                  value={field.value}
                  onChange={field.onChange}
                  secure={f.secure}
                  numeric={f.numeric}
                />
              )
            }
          />
          {f.hint && <Text style={styles.subtitle}>{f.hint}</Text>}
          {errors[f.name] && (
            <Text style={styles.error}>{String(errors[f.name]?.message)}</Text>
          )}
        </View>
      ))}
      {preview?.(values)}
      <Status error={error} />
      <Button
        title={isSubmitting ? "Guardando…" : label}
        disabled={isSubmitting}
        onPress={handleSubmit(async (data) => {
          setError("");
          try {
            await onSubmit(data);
          } catch (e) {
            setError(errorMessage(e));
          }
        })}
      />
    </View>
  );
}
