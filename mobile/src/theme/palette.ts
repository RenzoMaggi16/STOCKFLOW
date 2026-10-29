export type Theme = 'light' | 'dark';
export type Preference = Theme | 'system';
export const resolveTheme = (preference: Preference, system: string | null | undefined): Theme => preference === 'system' ? system === 'dark' ? 'dark' : 'light' : preference;
export function palette(theme: Theme) {
  const dark = theme === 'dark';
  const bg=dark?'#111A15':'#F7F9F7', card=dark?'#1C2921':'#FFFFFF', text=dark?'#F0F5F1':'#17251D', muted=dark?'#A5B7AA':'#65766B', green=dark?'#50B783':'#247A52', border=dark?'#34463A':'#E3EAE5';
  return {bg,card,dark:text,muted,green,border,pressed:dark?'#3D9C6D':'#1B6040',onPrimary:dark?'#111A15':'#FFFFFF',red:dark?'#FF9E94':'#B42318',warning:dark?'#F5C66A':'#895A08',warningBg:dark?'#3A3020':'#FFF4D8',pill:dark?'#273B30':'#EDF4EF',pillText:green,inputBg:card,headerBg:bg,headerText:text,secondaryBtn:card,secondaryBtnText:text,tabBarBg:card,tabBarActive:green,tabBarInactive:muted,overlay:'#00000080',shadow:'#000000'};
}
