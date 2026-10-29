import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, type Theme } from "../contexts/ThemeContext";

import {palette} from '../theme/palette';
export function getThemeColors(theme: Theme) { return palette(theme); }

export function useColors() {
  const { theme } = useTheme();
  return getThemeColors(theme);
}

export function useStyles() {
  const c = useColors();
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.bg },
    body: {
      padding: 20,
      gap: 16,
      width: "100%",
      maxWidth: 1000,
      alignSelf: "center",
    },
    title: { fontSize: 28, fontWeight: "800", color: c.dark },
    subtitle: { fontSize: 14, color: c.muted, lineHeight: 22 },
    card: {
      backgroundColor: c.card,
      padding: 20,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10,
    },
    input: {
      backgroundColor: c.inputBg,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      minHeight: 50,
      fontSize: 16,
      color: c.dark,
    },
    label: { fontSize: 14, fontWeight: "600", color: c.dark },
    button: {
      backgroundColor: c.green,
      borderRadius: 12,
      minHeight: 48,
      paddingHorizontal: 18,
      paddingVertical: 13,
      alignItems: "center",
      justifyContent: "center",
    },
    error: { color: c.red, lineHeight: 22 },
    pill: {
      backgroundColor: c.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      color: c.pillText,
      fontWeight: "600",
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
  });
}

export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 20,
            gap: 16,
            width: "100%",
            maxWidth: 1000,
            alignSelf: "center",
          }}
        >
          <View style={{ gap: 8, marginBottom: 4 }}>
            <View
              style={{
                height: 4,
                width: 32,
                borderRadius: 4,
                backgroundColor: c.green,
                marginBottom: 4,
              }}
            />
            <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: "800", color: c.dark }}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={{ fontSize: 14, color: c.muted, lineHeight: 22 }}>{subtitle}</Text>
            )}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View
      style={{
        backgroundColor: c.card,
        padding: 20,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.border,
        gap: 10,
      }}
    >
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: secondary
            ? c.secondaryBtn
            : danger
              ? c.red
              : pressed ? c.pressed : c.green,
          borderRadius: 12,
          minHeight: 48,
          paddingHorizontal: 18,
          paddingVertical: 13,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: secondary ? 1 : 0,
          borderColor: secondary ? c.border : "transparent",
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 15,
          color: secondary ? c.secondaryBtnText : danger ? c.bg : c.onPrimary,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Input({
  label,
  value,
  onChange,
  secure = false,
  numeric = false,
  multiline = false,
  onSubmit,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  numeric?: boolean;
  multiline?: boolean;
  onSubmit?: () => void;
  disabled?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.dark }}>{label}</Text>
      <View style={{ position: "relative" }}>
        <TextInput
          accessibilityLabel={label}
          style={[
            {
              backgroundColor: c.inputBg,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              padding: 14,
              minHeight: 50,
              fontSize: 16,
              color: c.dark,
            },
            secure && { paddingRight: 85 },
          ]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secure && !revealed}
          autoCapitalize="none"
          keyboardType={numeric ? "decimal-pad" : "default"}
          multiline={multiline}
          editable={!disabled}
          onSubmitEditing={onSubmit}
          returnKeyType={onSubmit ? "done" : undefined}
          placeholderTextColor={c.muted}
        />
        {secure && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Ocultar contraseña" : "Mostrar contraseña"}
            onPress={() => setRevealed(!revealed)}
            style={{
              position: "absolute",
              right: 8,
              top: 4,
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: 8,
            }}
          >
            <Text style={{ color: c.green, fontWeight: "600" }}>
              {revealed ? "Ocultar" : "Mostrar"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function Status({
  loading = false,
  error = "",
  empty = false,
  retry,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  retry?: () => void;
}) {
  const c = useColors();
  if (loading)
    return (
      <View style={{ padding: 20, alignItems: "center", gap: 10 }}>
        <View accessible={false} style={{height:14,width:"90%",backgroundColor:c.border,borderRadius:7}}/>
        <View accessible={false} style={{height:14,width:"65%",backgroundColor:c.border,borderRadius:7}}/>
        <ActivityIndicator size="small" color={c.green} />
        <Text style={{ color: c.muted, fontSize: 13 }}>Cargando datos…</Text>
      </View>
    );
  if (error)
    return (
      <View
        style={{
          padding: 16,
          backgroundColor: c.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.red,
          gap: 8,
        }}
      >
        <Text style={{ color: c.red, fontWeight: "600", fontSize: 14 }}>{error}</Text>
        {!!retry && (
          <Pressable onPress={retry}>
            <Text style={{ color: c.green, fontWeight: "700", fontSize: 13 }}>Reintentar</Text>
          </Pressable>
        )}
      </View>
    );
  if (empty)
    return (
      <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
        <Ionicons name="file-tray-outline" size={32} color={c.muted} />
        <Text style={{ color: c.muted, fontSize: 14 }}>No hay elementos para mostrar.</Text>
      </View>
    );
  return null;
}

export function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const c = useColors();
  if (!visible) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <Page title={title}>
          <View style={{ alignItems: "flex-start" }}>
            <Button title="Volver" secondary onPress={onClose} />
          </View>
          <View
            style={{
              backgroundColor: c.card,
              padding: 20,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.border,
              gap: 16,
            }}
          >
            {children}
          </View>
        </Page>
      </SafeAreaView>
    </Modal>
  );
}

export function Confirm({
  title,
  message,
  onConfirm,
  danger = false,
}: {
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const c = useColors();
  return (
    <>
      <Button title={title} danger={danger} onPress={() => setOpen(true)} />
      <Sheet
        title="Confirmar operación"
        visible={open}
        onClose={() => !busy && setOpen(false)}
      >
        <Text style={{ color: c.muted, fontSize: 14, lineHeight: 22 }}>{message}</Text>
        <Status error={error} />
        <Button
          title={busy ? "Procesando…" : "Confirmar"}
          disabled={busy}
          danger={danger}
          onPress={() => {
            setBusy(true);
            setError("");
            onConfirm()
              .then(() => setOpen(false))
              .catch((e) => setError(e.message))
              .finally(() => setBusy(false));
          }}
        />
      </Sheet>
    </>
  );
}

export function Choices({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
      {options.map((o) => (
        <Button
          key={o.value}
          title={o.label}
          secondary={value !== o.value}
          onPress={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

export function Pager({
  page,
  total,
  limit = 20,
  onChange,
}: {
  page: number;
  total: number;
  limit?: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const c = useColors();
  if (totalPages <= 1) return null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
      <Button
        title="Anterior"
        secondary
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
      />
      <Text style={{ color: c.muted, fontSize: 13, fontWeight: "600" }}>
        Página {page} de {totalPages}
      </Text>
      <Button
        title="Siguiente"
        secondary
        disabled={page >= totalPages}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}

export const money = (v: unknown) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    Number(v || 0),
  );

/** Toggle button between light and dark mode in settings/profile */
export function ThemeToggle() {
  const {preference,setTheme}=useTheme();
  return <Choices value={preference} onChange={v=>setTheme(v as 'light'|'dark'|'system')} options={[{value:'light',label:'Claro'},{value:'dark',label:'Oscuro'},{value:'system',label:'Automático'}]}/>;
}

/** Compact theme toggle pill for headers and navigation bars */
export function ThemeToggleButton() {
  const { isDark, toggle } = useTheme();
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      onPress={toggle}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 20,
        paddingHorizontal: 13,
        paddingVertical: 7,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Ionicons
        name={isDark ? "sunny" : "moon"}
        size={15}
        color={c.green}
      />
      <Text style={{ color: c.dark, fontWeight: "700", fontSize: 13 }}>
        {isDark ? "Modo claro" : "Modo oscuro"}
      </Text>
    </Pressable>
  );
}
