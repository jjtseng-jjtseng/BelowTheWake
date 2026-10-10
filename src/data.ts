import { cabinPoint } from './cabins';
export type UpgradeId = 'air' | 'cutter' | 'suit' | 'bag' | 'fins' | 'sonar' | 'lift' | 'deep';
export interface Upgrade { id: UpgradeId; name: string; price: number; description: string; effect: string; requires?: UpgradeId }
export const UPGRADES: Upgrade[] = [
  { id:'cutter', name:'Salvage cutter', price:120, description:'Cut chained cabin doors and swim inside for individual finds.', effect:'Open wreck cabins' },
  { id:'air', name:'Twin air tanks', price:160, description:'More time to explore, less time watching the gauge.', effect:'Air: 150 → 240 seconds' },
  { id:'suit', name:'Reinforced dive suit', price:280, description:'Reach the Lantern and her cargo of lost keepsakes.', effect:'Depth rating: 22 → 36 m' },
  { id:'lift', name:'Deck salvage crane', price:180, description:'Fit a working deck davit and chain. Lift bags send heavy cargo straight aboard.', effect:'Recover cannons and heavy chests' },
  { id:'fins', name:'Current-cutting fins', price:140, description:'Glide faster and hold your course through the channel.', effect:'Swim speed +45%' },
  { id:'bag', name:'Expanded cargo sling', price:220, description:'Bring more finds home in one dive.', effect:'Dive bag: 5 → 9 slots' },
  { id:'sonar', name:'Salvage sonar', price:100, description:'A ping reveals salvage farther through the silt.', effect:'Underwater detection: 12 → 28 m' },
  { id:'deep', name:'Abyssal breathing rig', price:600, description:'The Bellwether lies beyond the channel, waiting for you.', effect:'Depth rating: 36 → 55 m', requires:'suit' },
];
export interface Site { id:string; name:string; subtitle:string; x:number; z:number; depth:number; angle:number; scale:number; story:string; current:number; color:string; level?:number }
export const HARBOR = { x:0, z:-110, name:'Marrow Harbor' };
export const SITES:Site[] = [
  { id:'finch',name:'The Copper Finch',subtitle:'A merchant lost in the shallows',x:-38,z:-22,depth:18,angle:.5,scale:1.65,current:0,color:'#8cddd2',story:'A coastal merchant that ran aground carrying copper, porcelain, and a letter that was never delivered. Her splintered middle is an easy way in.' },
  { id:'lantern',name:'The Lantern',subtitle:'Keepsakes beneath the current',x:67,z:67,depth:30,angle:-.9,scale:2.2,current:.65,color:'#69b5ca',story:'The Lantern followed the Bellwether into a storm. A captain’s bottle still holds the second half of the route. The current sweeps east; shelter beside the hull.' },
  { id:'bell',name:'The Bellwether',subtitle:'The last light of the Marrow Isles',x:-78,z:150,depth:46,angle:1.1,scale:2.7,current:.25,color:'#ab9ed4',story:'A relief ship, carrying the islanders’ savings. Both surviving logs point here. Find her strongbox and bring their story back to the harbor.' },
];
// The original story wrecks remain, surrounded by optional expeditions.
SITES.find(s=>s.id==='lantern')!.level=4;
SITES.find(s=>s.id==='bell')!.level=7;
SITES.push(
  {id:'pearl',name:'The Pearl Runner',subtitle:'A smuggler on the reef',x:74,z:-43,depth:20,angle:-.6,scale:1.4,current:.1,color:'#a2dcc4',level:2,story:'Her hold hid pearls behind ordinary barrels. An easy expedition before the deeper channel.'},
  {id:'gull',name:'The Wandering Gull',subtitle:'The western shoals',x:-137,z:98,depth:21,angle:1.8,scale:1.8,current:.25,color:'#a2dcc4',level:3,story:'A shallow wreck on the far side of the islands. Small cargo, a heavy cannon, and plenty of room to explore.'},
  {id:'crown',name:'The Salt Crown',subtitle:'The broken convoy',x:161,z:164,depth:32,angle:.7,scale:2.4,current:.7,color:'#69b5ca',level:5,story:'A convoy ship swept into the eastern current. Her richest cargo is sealed beneath a fallen beam.'},
  {id:'moth',name:'The Moon Moth',subtitle:'Below the quiet inlet',x:-202,z:260,depth:34,angle:-1.2,scale:1.9,current:0,color:'#69b5ca',level:6,story:'A sheltered dive with delicate glass and a ship bell. The nearby kraken guards a separate cache.'},
  {id:'aurora',name:'The Aurora',subtitle:'The northward crossing',x:43,z:299,depth:44,angle:2.1,scale:2.6,current:.5,color:'#ab9ed4',level:8,story:'Only the abyssal rig can reach this northern wreck. A rich detour beyond the Bellwether.'},
  {id:'sovereign',name:'The Sunken Sovereign',subtitle:'At the edge of the chart',x:195,z:416,depth:50,angle:-.5,scale:3,current:.8,color:'#d5b978',level:10,story:'The last wreck on the chart, loaded with ceremonial gold. A final expedition for an accomplished salvager.'},
);
export interface Island {id:string;name:string;x:number;z:number;size:number;level:number;reward:number}
export const ISLANDS:Island[]=[
  {id:'marrow',name:'Marrow Island',x:22,z:-133,size:6,level:1,reward:0},
  {id:'palm',name:'Pearl Cay',x:124,z:15,size:7,level:2,reward:70},
  {id:'gull-isle',name:'Gull Island',x:-137,z:43,size:6,level:3,reward:90},
  {id:'lantern-rock',name:'Lantern Rock',x:40,z:181,size:5,level:4,reward:110},
  {id:'amber',name:'Amber Key',x:222,z:212,size:7,level:5,reward:130},
  {id:'moon',name:'Moonlit Isle',x:-248,z:320,size:6,level:6,reward:150},
  {id:'north',name:'Northwatch',x:-34,z:357,size:8,level:8,reward:190},
  {id:'crown-isle',name:'Crown Island',x:248,z:456,size:6,level:10,reward:250},
];
export interface SeaBoss {id:string;name:string;kind:'shark'|'kraken';x:number;z:number;level:number;hp:number;damage:number;reward:number}
export const BOSSES:SeaBoss[]=[
  {id:'reef-jaw',name:'Reef Jaw',kind:'shark',x:132,z:97,level:3,hp:120,damage:25,reward:350},
  {id:'ink-maw',name:'Ink Maw',kind:'kraken',x:-153,z:229,level:6,hp:180,damage:30,reward:650},
  {id:'old-king',name:'The Old King',kind:'kraken',x:189,z:338,level:9,hp:240,damage:35,reward:1000},
];
export interface Loot { id:string; site:string; name:string; model:string; offset:[number,number,number]; value:number; weight:number; requirement?:UpgradeId; cabin?:boolean; clue?:'finch'|'lantern'; final?:boolean; flavor:string }
export const LOOT:Loot[] = [
  { id:'finch-copper',site:'finch',name:'Copper trade bars',model:'crate',offset:[-6,.5,-2],value:110,weight:1,flavor:'Salt-green copper. The workshop will polish it up.' },
  { id:'finch-coins',site:'finch',name:'A sailor’s savings',model:'chest',offset:[5,.5,5],value:140,weight:2,flavor:'A handful of foreign coins, tucked away for home.' },
  { id:'finch-porcelain',site:'finch',name:'Porcelain cargo',model:'crate-bottles',offset:[-5,.5,8],value:90,weight:1,flavor:'Amazingly, some cups survived the wreck.' },
  { id:'finch-log',site:'finch',name:'The first route fragment',model:'bottle',offset:[0,4,5],value:0,weight:0,clue:'finch',flavor:'“The Bellwether turned north at Lantern Rock. She was carrying the island’s relief fund.”' },
  { id:'finch-locker',site:'finch',name:'Encrusted strongbox',model:'chest',offset:[2,3,-6],value:220,weight:2,requirement:'cutter',flavor:'The cutter makes short work of a century of rust.' },
  { id:'finch-cannon',site:'finch',name:'Bronze deck cannon',model:'cannon',offset:[8,.3,-8],value:260,weight:0,requirement:'lift',flavor:'Lift bag deployed. The cannon is on its way to the boat.' },
  { id:'lantern-silver',site:'lantern',name:'Silver tableware',model:'chest',offset:[-8,.5,4],value:220,weight:2,flavor:'Every piece bears the same family crest.' },
  { id:'lantern-spice',site:'lantern',name:'Sealed spice barrels',model:'barrel',offset:[8,.5,-4],value:180,weight:1,flavor:'The wax seals held. A fortune in cinnamon.' },
  { id:'lantern-glass',site:'lantern',name:'Sea-glass collection',model:'crate-bottles',offset:[5,.5,11],value:250,weight:1,flavor:'Beautiful bottles in colors you have never seen.' },
  { id:'lantern-log',site:'lantern',name:'The captain’s last letter',model:'bottle',offset:[12,2,0],value:0,weight:0,clue:'lantern',flavor:'“Northwest, past the teeth of the reef. We saw her lantern go dark. The savings are still aboard.”' },
  { id:'lantern-locker',site:'lantern',name:'Netted jewelry case',model:'chest',offset:[-2,4,6],value:320,weight:2,requirement:'cutter',flavor:'The net falls away. Inside, a little silver locket.' },
  { id:'lantern-heavy',site:'lantern',name:'Cargo hold safe',model:'chest',offset:[-10,.5,-10],value:430,weight:0,requirement:'lift',flavor:'A lift bag pulls the safe clear of the sand.' },
  { id:'bell-gold',site:'bell',name:'Gold trade chest',model:'chest',offset:[10,.5,4],value:380,weight:2,flavor:'The warm glint of gold in the coldest water.' },
  { id:'bell-china',site:'bell',name:'Painted maritime tiles',model:'crate',offset:[-10,.5,-5],value:240,weight:1,flavor:'A mural of the harbor, packed for an unfinished home.' },
  { id:'bell-keepsakes',site:'bell',name:'Islanders’ keepsakes',model:'crate-bottles',offset:[8,.5,13],value:300,weight:1,flavor:'Letters, photographs, and a small carved bird.' },
  { id:'bell-locker',site:'bell',name:'Officer’s sealed locker',model:'chest',offset:[0,5,8],value:400,weight:2,requirement:'cutter',flavor:'One last locker. One more story saved from the sea.' },
  { id:'bell-strongbox',site:'bell',name:'The Bellwether strongbox',model:'chest',offset:[-14,1,-10],value:1200,weight:0,requirement:'lift',final:true,flavor:'You found it. The islanders’ savings — and the reason these ships sailed into the storm.' },
];
for(const [site,prefix] of [['pearl','Smuggler'],['gull','Voyager'],['crown','Convoy'],['moth','Moonlit'],['aurora','Northern'],['sovereign','Royal']]){
  const tier=SITES.find(s=>s.id===site)!.level!;
  LOOT.push(
    {id:site+'-trade',site,name:prefix+' trade cargo',model:'crate',offset:[-7,.5,5],value:90+tier*35,weight:1,flavor:'A new piece of the ocean brought home.'},
    {id:site+'-coins',site,name:prefix+' coin chest',model:'chest',offset:[7,.5,-5],value:110+tier*45,weight:2,flavor:'The chest opens to reveal a glint of gold.'},
    {id:site+'-sealed',site,name:prefix+' sealed keepsakes',model:'crate-bottles',offset:[-3,3,-7],value:150+tier*45,weight:2,requirement:'cutter',flavor:'The seal gives way beneath your cutter.'},
    {id:site+'-heavy',site,name:prefix+' bronze cannon',model:'cannon',offset:[10,.5,8],value:180+tier*55,weight:0,requirement:'lift',flavor:'Lift bag away. Another heavy find secured aboard.'},
  );
}
// Keep established IDs and values. Their cabin positions replace the old instant
// cutter pickup; existing recovered treasure stays recovered during migration.
for(const s of SITES){
  const sealed=LOOT.find(l=>l.site===s.id&&l.requirement==='cutter')!;
  sealed.cabin=true;delete sealed.requirement;sealed.offset=[-1.7,.55,-1.4];
  const delicate=LOOT.find(l=>l.site===s.id&&/porcelain|glass|keepsakes|trade$/.test(l.id)&&l!==sealed&&!l.final);
  if(delicate){delicate.cabin=true;delicate.offset=[1.65,.55,-1.35];}
  const personal=(LOOT.find(l=>l.site===s.id&&l.clue)||LOOT.find(l=>l.site===s.id&&!l.cabin&&(l.id.endsWith('-coins')||l.id.endsWith('-china'))))!;
  personal.cabin=true;personal.offset=[0,.8,-1.9];
}
export function siteFor(id:string) { return SITES.find(s=>s.id===id)!; }
export function lootFor(id:string) { return LOOT.find(l=>l.id===id); }
export function lootPosition(l:Loot):[number,number,number] {
  const s=siteFor(l.site), [x,y,z]=l.offset;
  if(l.cabin){const p=cabinPoint(s,x,y,z);return [p.x,p.y,p.z];}
  return [s.x+x*Math.cos(s.angle)+z*Math.sin(s.angle),-s.depth+y,s.z+z*Math.cos(s.angle)-x*Math.sin(s.angle)];
}
