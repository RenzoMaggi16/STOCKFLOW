import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./ui";

export const roleLabel = (role: string) => ({admin:"Jefe / Administrador",encargado:"Encargado de depósito",empleado:"Empleado de ventas",repartidor:"Repartidor"}[role] || role);
export function IdentityBanner({ title, subtitle, badge, icon = "storefront-outline" }: {title:string;subtitle:string;badge:string;icon?: keyof typeof Ionicons.glyphMap}) {
  return <View style={design.banner}><View style={design.emblem}><Ionicons name={icon} size={32} color="#B8F36B" /></View><View style={{flex:1,minWidth:180,gap:8}}><Text style={design.eyebrow}>{badge}</Text><Text style={design.heading}>{title}</Text><Text style={design.copy}>{subtitle}</Text></View></View>;
}
export function SectionHeading({title, subtitle, icon}:{title:string;subtitle?:string;icon:keyof typeof Ionicons.glyphMap}) {
  return <View style={{flexDirection:"row",gap:12,alignItems:"center",marginBottom:6}}><View style={design.smallIcon}><Ionicons name={icon} size={22} color={colors.green}/></View><View style={{flex:1,gap:3}}><Text style={design.section}>{title}</Text>{subtitle && <Text style={design.muted}>{subtitle}</Text>}</View></View>;
}
export const design=StyleSheet.create({
  banner:{backgroundColor:"#123D32",borderRadius:24,padding:26,flexDirection:"row",flexWrap:"wrap",gap:20,alignItems:"center"},
  emblem:{width:70,height:70,borderRadius:22,backgroundColor:"#285244",alignItems:"center",justifyContent:"center"},
  eyebrow:{fontSize:11,letterSpacing:1.5,fontWeight:"700",color:"#B8F36B"},heading:{fontSize:27,fontWeight:"800",color:"white"},copy:{fontSize:14,lineHeight:22,color:"#C7DFD3"},
  smallIcon:{width:44,height:44,borderRadius:14,backgroundColor:"#E4F3EB",alignItems:"center",justifyContent:"center"},section:{fontSize:19,fontWeight:"700",color:colors.dark},muted:{fontSize:13,lineHeight:21,color:colors.muted},
  grid:{flexDirection:"row",flexWrap:"wrap",gap:18,alignItems:"flex-start"},column:{flexGrow:1,flexBasis:300,gap:18},toolbar:{flexDirection:"row",flexWrap:"wrap",gap:10,justifyContent:"space-between",alignItems:"center"},
  empty:{paddingVertical:24,gap:12,alignItems:"center"},danger:{backgroundColor:"#FFF8F6",padding:22,borderRadius:18,borderWidth:1,borderColor:"#F1DAD3",gap:12},
});
