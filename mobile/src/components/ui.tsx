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
export const colors = {
  green: "#087F5B",
  dark: "#103B30",
  bg: "#F3F7F5",
  muted: "#62776E",
  border: "#D8E5DE",
  red: "#B42318",
};
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  body: {
    padding: 20,
    gap: 16,
    width: "100%",
    maxWidth: 1000,
    alignSelf: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.dark },
  subtitle: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 50,
    fontSize: 16,
    color: colors.dark,
  },
  label: { fontSize: 14, fontWeight: "600", color: colors.dark },
  button: {
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: colors.red, lineHeight: 22 },
  pill: {
    backgroundColor: "#E1F3EA",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    color: colors.green,
    fontWeight: "600",
  },
});
export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.body}
        >
          <View style={{gap:8,marginBottom:4}}><View style={{height:4,width:32,borderRadius:4,backgroundColor:colors.green,marginBottom:4}}/><Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export const Card = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.card}>{children}</View>
);
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && { backgroundColor: "#E1F3EA" },
        danger && { backgroundColor: colors.red },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text
        style={{
          fontWeight: "700",
          fontSize: 15,
          color: secondary ? colors.green : "white",
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
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ position: "relative" }}>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, secure && { paddingRight: 85 }]}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure && !revealed}
        autoCapitalize="none"
        keyboardType={numeric ? "decimal-pad" : "default"}
        multiline={multiline}
        editable={!disabled}
        onSubmitEditing={onSubmit}
        returnKeyType={onSubmit ? "done" : undefined}
      />
      {secure && <Pressable accessibilityRole="button" accessibilityLabel={revealed ? "Ocultar contraseña" : "Mostrar contraseña"} onPress={() => setRevealed(!revealed)} style={{ position: "absolute", right: 8, top: 4, minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}><Text style={{color: colors.green, fontWeight: "600"}}>{revealed ? "Ocultar" : "Mostrar"}</Text></Pressable>}
      </View>
    </View>
  );
}
export function Status({
  loading,
  error,
  empty,
  retry,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  retry?: () => void;
}) {
  return (
    <>
      {loading && <ActivityIndicator size="large" color={colors.green} />}
      {!!error && (
        <Card>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          {retry && <Button title="Reintentar" onPress={retry} secondary />}
        </Card>
      )}
      {!loading && !error && empty && (
        <Card>
          <View style={{padding:12,alignItems:"center",gap:10}}><Ionicons name="file-tray-outline" size={34} color={colors.green}/><Text style={styles.label}>Todo listo para empezar</Text>
          <Text style={styles.subtitle}>
            Todavía no hay registros para mostrar.
          </Text>
          </View>
        </Card>
      )}
    </>
  );
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
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <Page title={title}>
          <View style={{alignItems:"flex-start"}}><Button title="Volver" secondary onPress={onClose} /></View>
          <View style={{backgroundColor:"white",padding:20,borderRadius:20,borderWidth:1,borderColor:colors.border,gap:16}}>
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
  return (
    <>
      <Button title={title} danger={danger} onPress={() => setOpen(true)} />
      <Sheet
        title="Confirmar operación"
        visible={open}
        onClose={() => !busy && setOpen(false)}
      >
        <Text style={styles.subtitle}>{message}</Text>
        <Status error={error} />
        <Button
          title={busy ? "Procesando…" : "Confirmar"}
          disabled={busy}
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
    <View style={styles.row}>
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
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  return (
    <View style={styles.row}>
      <Button
        title="Anterior"
        secondary
        disabled={page <= 1}
        onPress={() => onChange(page - 1)}
      />
      <Text>
        Página {page} · {total} registros
      </Text>
      <Button
        title="Siguiente"
        secondary
        disabled={page * 20 >= total}
        onPress={() => onChange(page + 1)}
      />
    </View>
  );
}
export const money = (v: unknown) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
    Number(v || 0),
  );
