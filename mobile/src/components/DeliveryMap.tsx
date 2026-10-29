import {useMemo} from 'react';
import {Linking} from 'react-native';
import {WebView} from 'react-native-webview';
import {useTheme} from '../contexts/ThemeContext';
import {mapDocument,selectMapDelivery,type DeliveryMapProps} from './mapDocument';
export type {DeliveryPin} from './mapDocument';
export default function DeliveryMap({deliveries,location,onSelect}:DeliveryMapProps){
  const {theme}=useTheme();
  const html=useMemo(()=>mapDocument(deliveries,location,theme==='dark'),[deliveries,location,theme]);
  return <WebView style={{height:360,flex:0,borderRadius:16}} originWhitelist={['*']}
    source={{html,baseUrl:'https://stockflow-api-renzo.onrender.com/'}}
    applicationNameForUserAgent="StockFlow/1.0 (com.estanga.stockflow)"
    mixedContentMode="never" setSupportMultipleWindows={false}
    onMessage={event=>selectMapDelivery(event.nativeEvent.data,deliveries,onSelect)}
    onShouldStartLoadWithRequest={request=>{
      if(request.url==='about:blank'||request.url==='https://stockflow-api-renzo.onrender.com/')return true;
      if(request.url.startsWith('https://www.openstreetmap.org/'))void Linking.openURL(request.url);
      return false;
    }}/>;
}
