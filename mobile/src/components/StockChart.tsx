import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Card, useColors } from "./ui";
import { SectionHeading } from "./WorkspaceDesign";


export function StockChart({
  total,
  low,
  empty,
}: {
  total: number;
  low: number;
  empty: number;
}) {
  const c = useColors();


  const groups = [
    {
      label: "Stock suficiente",
      value: Math.max(0, total - low),
      color: c.green,
      filter: "",
    },
    {
      label: "Para reponer",
      value: Math.max(0, low - empty),
      color: c.warning,
      filter: "bajo",
    },
    {
      label: "Sin existencias",
      value: empty,
      color: c.red,
      filter: "sin",
    },
  ];

  const circumference = 2 * Math.PI * 64;
  let offset = 0;

  return (
    <Card>
      <SectionHeading
        title="Tu inventario en equilibrio"
        subtitle="Distribución de productos según sus existencias"
        icon="pie-chart-outline"
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 24,
        }}
      >
        <View
          accessible
          accessibilityLabel={`${total} productos: ${groups.map((g) => `${g.value} ${g.label}`).join(", ")}`}
          style={{
            width: 170,
            height: 170,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg
            width={170}
            height={170}
            viewBox="0 0 170 170"
            style={{ position: "absolute" }}
          >
            <Circle
              cx={85}
              cy={85}
              r={64}
              stroke={c.border}
              strokeWidth={20}
              fill="none"
            />
            {total > 0 &&
              groups.map((g) => {
                const start = offset;
                const length = (g.value / total) * circumference;
                offset += length;
                return g.value > 0 ? (
                  <Circle
                    key={g.label}
                    cx={85}
                    cy={85}
                    r={64}
                    fill="none"
                    stroke={g.color}
                    strokeWidth={20}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 85 85)"
                  />
                ) : null;
              })}
          </Svg>
          <Text style={{ fontSize: 34, fontWeight: "800", color: c.dark }}>
            {total}
          </Text>
          <Text style={{ fontSize: 13, color: c.muted }}>productos</Text>
        </View>

        <View style={{ flexGrow: 1, flexBasis: 220, gap: 8 }}>
          {groups.map((g) => (
            <View
              key={g.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                padding: 12,
                borderRadius: 12,
                backgroundColor: c.card,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: g.color,
                }}
              />
              <Text style={{ flex: 1, color: c.dark, fontWeight: "600", fontSize: 14 }}>
                {g.label}
              </Text>
              <Text style={{ color: c.dark, fontWeight: "700", fontSize: 14 }}>
                {g.value}
              </Text>
              <Text style={{ color: c.muted, fontSize: 13 }}>
                {total ? Math.round((g.value / total) * 100) : 0}%
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={{ color: c.muted, fontSize: 13, lineHeight: 20 }}>
        {total
          ? "Para reponer: productos que alcanzaron la cantidad configurada para alertar poco stock. Sin existencias se muestra por separado."
          : "Todavía no hay productos. El gráfico se completará con tu inventario real."}
      </Text>
    </Card>
  );
}
