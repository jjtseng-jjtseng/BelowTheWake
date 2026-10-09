import { SITES, ISLANDS, BOSSES, lootFor } from './data';
import type { Save } from './state';
export const LEVEL_XP=[0,80,200,360,560,800,1080,1400,1760,2160];
// Derive XP from unique permanent achievements, never repeatable visits/sales.
export function experience(s:Save){return new Set(s.collected).size*45+new Set(s.explored).size*60+new Set(s.islands.filter(id=>id!=='marrow')).size*70+new Set(s.defeated).size*240;}
export function level(s:Save){const xp=experience(s);return LEVEL_XP.filter(n=>xp>=n).length;}
export function levelProgress(s:Save){const n=level(s),xp=experience(s);return n===LEVEL_XP.length?1:(xp-LEVEL_XP[n-1])/(LEVEL_XP[n]-LEVEL_XP[n-1]);}
export function availableSites(s:Save){return SITES.filter(v=>(v.level||1)<=level(s)||s.explored.includes(v.id));}
export function availableIslands(s:Save){return ISLANDS.filter(v=>v.level<=level(s));}
export function availableBosses(s:Save){return BOSSES.filter(v=>v.level<=level(s));}
export function exploreSite(s:Save,id:string):Save {if(s.explored.includes(id)||!availableSites(s).some(v=>v.id===id))return s;return {...s,explored:[...s.explored,id]};}
export function discoverIsland(s:Save,id:string):Save {const island=availableIslands(s).find(v=>v.id===id);if(!island||s.islands.includes(id))return s;return {...s,islands:[...s.islands,id],money:s.money+island.reward,earnings:s.earnings+island.reward};}
export function defeatBoss(s:Save,id:string):Save {const boss=availableBosses(s).find(v=>v.id===id);if(!boss||s.defeated.includes(id))return s;return {...s,defeated:[...s.defeated,id],money:s.money+boss.reward,earnings:s.earnings+boss.reward};}
export function destinationAvailable(s:Save,id:string){return id==='harbor'||[...availableSites(s),...availableIslands(s),...availableBosses(s)].some(v=>v.id===id);}
export function migrateExplored(collected:string[]){return [...new Set(collected.map(id=>lootFor(id)?.site).filter((id):id is string=>!!id))];}
