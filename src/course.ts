import { HARBOR, LOOT, ISLANDS, BOSSES, SITES, lootFor } from './data';
import { availableSites, availableIslands, availableBosses, destinationAvailable } from './progression';
import { depthRating, salvageError, type Save } from './state';
import type { Point } from './navigation';
export function wreckFinished(s:Save,id:string){const loot=LOOT.filter(l=>l.site===id);return loot.length>0&&loot.every(l=>s.collected.includes(l.id));}
export function destinationFinished(s:Save,id:string){return SITES.some(v=>v.id===id)?wreckFinished(s,id):ISLANDS.some(v=>v.id===id)?s.islands.includes(id):BOSSES.some(v=>v.id===id)?s.defeated.includes(id):false;}
export function recoverableWreck(s:Save,id:string){return availableSites(s).some(v=>v.id===id&&v.depth<=depthRating(s))&&LOOT.some(l=>l.site===id&&!s.collected.includes(l.id)&&(!l.cabin||s.openedCabins.includes(id)||s.upgrades.includes('cutter'))&&salvageError({...s,openedCabins:[...s.openedCabins,id]},l.id,[])===null);}
export function recommendedCourse(s:Save,p:Point):string {
  if(s.cargo.some(id=>(lootFor(id)?.value||0)>0))return 'harbor';
  const distance=(v:Point)=>Math.hypot(p.x-v.x,p.z-v.z);
  const wrecks=availableSites(s).filter(v=>recoverableWreck(s,v.id)).sort((a,b)=>distance(a)-distance(b));
  if(wrecks.length)return wrecks[0].id;
  const islands=availableIslands(s).filter(v=>v.reward>0&&!s.islands.includes(v.id)).sort((a,b)=>distance(a)-distance(b));
  if(islands.length)return islands[0].id;
  const bosses=availableBosses(s).filter(v=>!s.defeated.includes(v.id)).sort((a,b)=>distance(a)-distance(b));
  return bosses[0]?.id||'harbor';
}
export function resumeCourse(s:Save,p:Point){const id=s.course;if(s.cargo.length)return 'harbor';return id&&destinationAvailable(s,id)&&!destinationFinished(s,id)&&(id==='harbor'?Math.hypot(p.x-HARBOR.x,p.z-HARBOR.z)>30:true)?id:recommendedCourse(s,p);}
