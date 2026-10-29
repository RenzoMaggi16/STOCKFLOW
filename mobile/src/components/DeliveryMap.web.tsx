import {useEffect,useMemo,useRef} from 'react';
import {useTheme} from '../contexts/ThemeContext';
import {mapDocument,selectMapDelivery,type DeliveryMapProps} from './mapDocument';
export default function DeliveryMap({deliveries,location,onSelect}:DeliveryMapProps){
  const ref=useRef<HTMLIFrameElement>(null),{theme}=useTheme();
  const html=useMemo(()=>mapDocument(deliveries,location,theme==='dark'),[deliveries,location,theme]);
  useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.source===ref.current?.contentWindow)selectMapDelivery(event.data,deliveries,onSelect);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[deliveries,onSelect]);
  return <iframe ref={ref} title="Mapa de entregas OpenStreetMap" srcDoc={html} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style={{height:360,width:'100%',border:0,borderRadius:16}}/>;
}
