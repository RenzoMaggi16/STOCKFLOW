import React, { useState, useEffect } from "react";
import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
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
  validate?: (value: string) => string | true;
};
export function ResourceSelect({
  resource,
  label,
  value,
  onChange,
}: {
  resource: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [picked, setPicked] = useState("");
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
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
        />
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
}: {
  fields: Field[];
  initial?: Record<string, unknown>;
  onSubmit: (data: Record<string, string>) => Promise<void>;
  label?: string;
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
  return (
    <View style={{ gap: 16 }}>
      {fields.map((f) => (
        <View key={f.name} style={{ gap: 5 }}>
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
          {errors[f.name] && (
            <Text style={styles.error}>{String(errors[f.name]?.message)}</Text>
          )}
        </View>
      ))}
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
