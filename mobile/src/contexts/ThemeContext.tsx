import React, {createContext,useContext,useState,useEffect} from 'react';
import {useColorScheme,Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {resolveTheme,type Theme,type Preference} from '../theme/palette';
export type {Theme} from '../theme/palette';
const key='stockflow.theme';
const Context=createContext({theme:'light' as Theme,preference:'system' as Preference,isDark:false,setTheme:(_v:Preference)=>{},toggle:()=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}) {
  const system=useColorScheme();
  const [preference,setPreference]=useState<Preference>('system');
  const theme=resolveTheme(preference,system);
  useEffect(()=>{let active=true;void (async()=>{try {const saved=Platform.OS==='web'?localStorage.getItem(key):await SecureStore.getItemAsync(key);if(active&&(saved==='light'||saved==='dark'||saved==='system'))setPreference(saved);}catch{ /* System fallback. */ }})();return()=>{active=false;};},[]);
  function setTheme(value:Preference){setPreference(value);try {if(Platform.OS==='web')localStorage.setItem(key,value);else void SecureStore.setItemAsync(key,value).catch(()=>{});}catch{/* Session preference remains. */}}
  return <Context.Provider value={{theme,preference,isDark:theme==='dark',setTheme,toggle:()=>setTheme(theme==='dark'?'light':'dark')}}>{children}</Context.Provider>;
}
export const useTheme=()=>useContext(Context);
