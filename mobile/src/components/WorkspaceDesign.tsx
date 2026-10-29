import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "./ui";


export const roleLabel = (role: string) =>
  ({
    admin: "Jefe / Administrador",
    encargado: "Encargado de depósito",
    empleado: "Empleado de ventas",
    repartidor: "Repartidor",
  }[role] || role);

export function IdentityBanner({
  title,
  subtitle,
  badge,
  icon = "storefront-outline",
}: {
  title: string;
  subtitle: string;
  badge: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const c = useColors();
  return (
    <View
      style={[
        design.banner,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          borderWidth: 1,
        },
      ]}
    >
      <View
        style={[
          design.emblem,
          {
            backgroundColor: c.pill,
          },
        ]}
      >
        <Ionicons name={icon} size={32} color={c.green} />
      </View>
      <View style={{ flex: 1, minWidth: 180, gap: 8 }}>
        <Text style={[design.eyebrow,{color:c.green}]}>{badge}</Text>
        <Text style={[design.heading,{color:c.dark}]}>{title}</Text>
        <Text style={[design.copy, { color: c.muted }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

export function SectionHeading({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  const c = useColors();

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        marginBottom: 6,
      }}
    >
      <View
        style={[
          design.smallIcon,
          {
            backgroundColor: c.pill,
            borderColor: c.border,
            borderWidth: 1,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={c.green} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[design.section, { color: c.dark }]}>{title}</Text>
        {subtitle && (
          <Text style={[design.muted, { color: c.muted }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

export const design = StyleSheet.create({
  banner: {
    borderRadius: 24,
    padding: 26,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    alignItems: "center",
  },
  emblem: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  heading: {
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  copy: {
    fontSize: 14,
    lineHeight: 22,
  },
  smallIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  muted: {
    fontSize: 13,
    lineHeight: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
    alignItems: "flex-start",
  },
  column: {
    flexGrow: 1,
    flexBasis: 300,
    gap: 18,
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  empty: {
    paddingVertical: 24,
    gap: 12,
    alignItems: "center",
  },
  danger: {
    padding: 22,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
});
