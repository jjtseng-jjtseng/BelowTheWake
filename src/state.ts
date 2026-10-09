import { LOOT, SITES, ISLANDS, BOSSES, lootFor, UPGRADES, type UpgradeId } from './data';
import { level, migrateExplored } from './progression';
export interface Save { version:1; money:number; upgrades:UpgradeId[]; collected:string[]; explored:string[]; islands:string[]; defeated:string[]; cargo:string[]; clues:string[]; completed:boolean; dives:number; earnings:number; started:boolean; guideSeen:boolean; boat:[number,number,number]; settings:{ sound:boolean; sensitivity:number; quality:'high'|'low'; boatView:'chase'|'helm'|'orbit'; diveView:'first'|'third' } }
export const SAVE_KEY='below-the-wake-v1';
export function newSave():Save { return {version:1,money:0,upgrades:[],collected:[],explored:[],islands:[],defeated:[],cargo:[],clues:[],completed:false,dives:0,earnings:0,started:false,guideSeen:false,boat:[0,-105,0],settings:{sound:true,sensitivity:1,quality:'high',boatView:'chase',diveView:'third'}}; }
export function parseSave(raw:string|null):Save {
  if(!raw)return newSave();
  try {
    const x=JSON.parse(raw), fresh=newSave();
    if(x.version!==1 || !Number.isFinite(x.money) || x.money<0)return fresh;
    const ids=new Set(LOOT.map(l=>l.id));
    const clean=(a:unknown):string[]=>Array.isArray(a)?[...new Set(a.filter(v=>typeof v==='string' && ids.has(v)))]:[];
    const upgrades=Array.isArray(x.upgrades)?[...new Set<UpgradeId>(x.upgrades.filter((u:UpgradeId)=>UPGRADES.some(v=>v.id===u)))]:[];
    const collected=clean(x.collected), cargo=clean(x.cargo).filter(id=>collected.includes(id));
    return {...fresh,money:Math.floor(x.money),upgrades,collected,cargo,
      explored:[...new Set([...migrateExplored(collected),...(Array.isArray(x.explored)?x.explored.filter((id:string)=>SITES.some(v=>v.id===id)):[])])],
      islands:Array.isArray(x.islands)?[...new Set<string>(x.islands.filter((id:string)=>ISLANDS.some(v=>v.id===id)))]:[],
      defeated:Array.isArray(x.defeated)?[...new Set<string>(x.defeated.filter((id:string)=>BOSSES.some(v=>v.id===id)))]:[],
      clues:Array.isArray(x.clues)?[...new Set<string>(x.clues.filter((v:string)=>['finch','lantern'].includes(v)))]:[],
      completed:x.completed===true,dives:Math.max(0,Math.floor(x.dives||0)),earnings:Math.max(0,Math.floor(x.earnings||0)),started:x.started===true,guideSeen:x.guideSeen===true,
      boat:Array.isArray(x.boat)&&x.boat.length===3&&x.boat.every(Number.isFinite)?x.boat:fresh.boat,
      settings:{sound:x.settings?.sound!==false,sensitivity:Math.max(.3,Math.min(2,x.settings?.sensitivity||1)),quality:x.settings?.quality==='low'?'low':'high',boatView:['chase','helm','orbit'].includes(x.settings?.boatView)?x.settings.boatView:'chase',diveView:x.settings?.diveView==='first'?'first':'third'}};
  }catch{return newSave();}
}
export function airCapacity(s:Save){return s.upgrades.includes('air')?240:150;}
export function depthRating(s:Save){return s.upgrades.includes('deep')?55:s.upgrades.includes('suit')?36:22;}
export function bagCapacity(s:Save){return s.upgrades.includes('bag')?9:5;}
export function bagWeight(ids:string[]){return ids.reduce((n,id)=>n+(lootFor(id)?.weight||0),0);}
export function salvageError(s:Save,id:string,bag:string[]):string|null {
  const l=lootFor(id); if(!l)return 'Unknown salvage.';
  if(s.collected.includes(id)||bag.includes(id))return 'Already recovered.';
  if(l.requirement&&!s.upgrades.includes(l.requirement))return `Needs ${UPGRADES.find(u=>u.id===l.requirement)!.name.toLowerCase()}.`;
  if(l.final&&s.clues.length<2)return 'Find both route fragments to unlock the strongbox.';
  if(bagWeight(bag)+l.weight>bagCapacity(s))return 'Dive bag full. Return aboard to unload.';
  return null;
}
export function bankDive(s:Save,bag:string[]):Save {
  const valid=[...new Set(bag)].filter(id=>lootFor(id)&&!s.collected.includes(id));
  return {...s,collected:[...s.collected,...valid],explored:[...new Set([...s.explored,...migrateExplored(valid)])],cargo:[...s.cargo,...valid.filter(id=>(lootFor(id)?.value||0)>0)],
    clues:[...new Set([...s.clues,...valid.flatMap(id=>{const c=lootFor(id)?.clue;return c?[c]:[];})])]};
}
export function sellCargo(s:Save):{save:Save;earned:number;final:boolean} {
  const earned=s.cargo.reduce((n,id)=>n+(lootFor(id)?.value||0),0), final=s.cargo.includes('bell-strongbox');
  return {save:{...s,money:s.money+earned,earnings:s.earnings+earned,cargo:[],completed:s.completed||final},earned,final};
}
export function buyUpgrade(s:Save,id:UpgradeId):{save:Save;error:string|null} {
  const u=UPGRADES.find(u=>u.id===id);
  if(!u)return {save:s,error:'Unknown upgrade.'};
  if(s.upgrades.includes(id))return {save:s,error:'Already installed.'};
  if(u.requires&&!s.upgrades.includes(u.requires))return {save:s,error:'Install the reinforced dive suit first.'};
  if(s.money<u.price)return {save:s,error:'Not enough crowns. Bring more salvage home.'};
  return {save:{...s,money:s.money-u.price,upgrades:[...s.upgrades,id]},error:null};
}
export function tradeUpgrade(s:Save,id:UpgradeId):{save:Save;error:string|null} {
  const u=UPGRADES.find(u=>u.id===id);
  if(!u||!s.upgrades.includes(id))return {save:s,error:'That equipment is not installed.'};
  if(UPGRADES.some(v=>v.requires===id&&s.upgrades.includes(v.id)))return {save:s,error:'Trade in dependent equipment first.'};
  return {save:{...s,money:s.money+u.price,upgrades:s.upgrades.filter(v=>v!==id)},error:null};
}
export function objective(s:Save):string {
  if(s.completed)return 'Explore every wreck and recover the remaining salvage.';
  if(s.cargo.includes('bell-strongbox'))return 'Bring the Bellwether strongbox home to Marrow Harbor.';
  if(!s.clues.includes('finch'))return 'Explore the Copper Finch. Find the bottled route fragment.';
  if(!s.upgrades.includes('suit'))return 'Sell salvage at the harbor. Buy the reinforced dive suit (280 cr).';
  if(!s.clues.includes('lantern'))return level(s)<4?'Explore newly charted wrecks and islands to reach level 4 and reveal the Lantern.':'Dive the Lantern. Recover the captain’s last letter.';
  if(!s.upgrades.includes('deep'))return 'Fit the abyssal breathing rig (600 cr) for the final expedition.';
  if(!s.upgrades.includes('lift'))return 'Fit the deck salvage crane (180 cr) to raise the Bellwether strongbox.';
  return level(s)<7?'Explore the outer wrecks and islands to reach level 7 and reveal the Bellwether.':'Dive the Bellwether. Recover the islanders’ strongbox.';
}
