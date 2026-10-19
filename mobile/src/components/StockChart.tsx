import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Card, styles } from "./ui";
import { SectionHeading } from "./WorkspaceDesign";

export function StockChart({total, low, empty}: {total:number;low:number;empty:number}) {
  const groups=[{label:"Stock suficiente",value:Math.max(0,total-low),color:"#087F5B",filter:""},{label:"Para reponer",value:Math.max(0,low-empty),color:"#D89B22",filter:"bajo"},{label:"Sin existencias",value:empty,color:"#CF6654",filter:"sin"}];
  const circumference=2*Math.PI*64;
  let offset=0;
  return <Card><SectionHeading title="Tu inventario en equilibrio" subtitle="Distribución de productos según sus existencias" icon="pie-chart-outline"/><View style={{flexDirection:"row",flexWrap:"wrap",alignItems:"center",gap:24}}>
    <View accessible accessibilityLabel={`${total} productos: ${groups.map(g=>`${g.value} ${g.label}`).join(", ")}`} style={{width:170,height:170,alignItems:"center",justifyContent:"center"}}>
      <Svg width={170} height={170} viewBox="0 0 170 170" style={{position:"absolute"}}><Circle cx={85} cy={85} r={64} stroke="#E8EFEB" strokeWidth={20} fill="none"/>{total>0 && groups.map(g=>{const start=offset; const length=g.value/total*circumference;offset+=length;return g.value>0 ? <Circle key={g.label} cx={85} cy={85} r={64} fill="none" stroke={g.color} strokeWidth={20} strokeDasharray={`${length} ${circumference-length}`} strokeDashoffset={-start} transform="rotate(-90 85 85)"/>:null;})}</Svg>
      <Text style={[styles.title,{fontSize:34}]}>{total}</Text><Text style={styles.subtitle}>productos</Text>
    </View><View style={{flexGrow:1,flexBasis:220,gap:8}}>{groups.map(g=><View key={g.label} style={{flexDirection:"row",alignItems:"center",gap:10,padding:12,borderRadius:12,backgroundColor:"#F5F8F6"}}><View style={{width:10,height:10,borderRadius:5,backgroundColor:g.color}}/><Text style={[styles.label,{flex:1}]}>{g.label}</Text><Text style={styles.label}>{g.value}</Text><Text style={styles.subtitle}>{total?Math.round(g.value/total*100):0}%</Text></View>)}</View>
    </View><Text style={styles.subtitle}>{total ? "Para reponer: productos con unidades que alcanzaron su mínimo. Sin existencias se muestra por separado." : "Todavía no hay productos. El gráfico se completará con tu inventario real."}</Text></Card>;
}
