export type WeatherPhase='clear'|'warning'|'storm';
export interface Weather {phase:WeatherPhase;remaining:number;cycle:number;wind:number}
export const STORM_LEVEL=4,WARNING_SECONDS=25,STORM_SECONDS=65;
export function newWeather():Weather{return {phase:'clear',remaining:150,cycle:0,wind:.7};}
export function parseWeather(value:unknown):Weather{
  const x=value as Partial<Weather>|null;
  if(!x||!['clear','warning','storm'].includes(x.phase!)||!Number.isFinite(x.remaining)||!Number.isFinite(x.wind)||!Number.isInteger(x.cycle)||x.cycle!<0)return newWeather();
  const cap=x.phase==='clear'?360:x.phase==='warning'?WARNING_SECONDS:STORM_SECONDS;
  return {phase:x.phase!,remaining:Math.max(0,Math.min(cap,x.remaining!)),cycle:x.cycle!,wind:x.wind!};
}
// Called only while the voyage is running. No timers advance in menus or ashore.
export function tickWeather(weather:Weather,dt:number,rank:number,combat:boolean,random= Math.random):Weather{
  if(rank<STORM_LEVEL)return newWeather();
  let w={...weather,remaining:Math.max(0,weather.remaining-Math.max(0,dt))};
  if(w.remaining>0)return w;
  if(w.phase==='clear'){if(combat)return w;return {...w,phase:'warning',remaining:WARNING_SECONDS,wind:random()*Math.PI*2};}
  if(w.phase==='warning'){if(combat)return w;return {...w,phase:'storm',remaining:STORM_SECONDS};}
  return {...w,phase:'clear',remaining:240+random()*120,cycle:w.cycle+1};
}
export function stormStrength(w:Weather){return w.phase==='storm'?Math.min(1,(STORM_SECONDS-w.remaining)/8,w.remaining/10):w.phase==='warning'?(WARNING_SECONDS-w.remaining)/WARNING_SECONDS*.35:0;}
export function shelterAt(p:{x:number;z:number},harbor:{x:number;z:number},islands:{x:number;z:number;size:number}[]){return Math.hypot(p.x-harbor.x,p.z-harbor.z)<38||islands.some(i=>Math.hypot(p.x-i.x,p.z-i.z)<i.size*3+27);}
