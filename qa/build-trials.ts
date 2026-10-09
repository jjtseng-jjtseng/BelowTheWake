import { writeFileSync } from 'node:fs';
import { newSave, bankDive, type Save } from '../src/state';
import { LOOT, UPGRADES } from '../src/data';
import { level, exploreSite } from '../src/progression';
const fixture=(sites:string[],x:number,z:number,heading=0)=>{
  let s=bankDive(newSave(),LOOT.filter(l=>sites.includes(l.site)).map(l=>l.id));
  for(const site of sites)s=exploreSite(s,site);
  s={...s,cargo:[],money:1000,upgrades:UPGRADES.map(v=>v.id),started:true,guideSeen:true,boat:[x,z,heading]};return s;
};
const cases:Record<string,Save>={
  'Fresh voyage':newSave(),
  'Undiscovered Pearl Runner':{...fixture(['finch'],74,-56),collected:['finch-copper','finch-coins','finch-porcelain'],explored:['finch']},
  'Pearl Cay landing':fixture(['finch'],124,-10),
  'Reef Jaw sea trial':fixture(['finch'],132,55),
  'Broadside aiming trial':fixture(['finch'],132,55,Math.PI),
  'Clear helm check':{...fixture(['finch'],0,-105),settings:{...newSave().settings,boatView:'helm'}},
  'Ink Maw sea trial':fixture(['finch','pearl','gull'],-153,189),
  'Old King sea trial':fixture(['finch','pearl','gull','lantern','crown','moth','bell'],189,298),
  'Full chart':fixture([...new Set(LOOT.map(l=>l.site))],-2,-105),
};
writeFileSync('qa/trials.html',`<!doctype html><html><meta charset="utf-8"><title>Below the Wake — isolated QA voyages</title><body style="background:#092e38;color:#eee;font:18px sans-serif;padding:35px"><h1>Isolated QA voyages</h1><p>This server runs on port 5174. It cannot access or change the player's localhost:5173 save.</p>${Object.entries(cases).map(([name,s],i)=>`<button style="display:block;margin:15px;padding:15px" data-case="${i}">${name} · level ${level(s)}</button>`).join('')}<script>const cases=${JSON.stringify(Object.values(cases))};document.addEventListener('click',e=>{const b=e.target.closest('[data-case]');if(!b)return;localStorage.setItem('below-the-wake-v1',JSON.stringify(cases[+b.dataset.case]));location.href='/';});</script></body></html>`);
