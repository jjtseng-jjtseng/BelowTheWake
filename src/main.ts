import { Vector3, Matrix } from '@babylonjs/core';
import { canvas, engine, scene, camera, boat, swimmer, buildWorld, renderWorld, lootRoots, floorHeight, syncEquipment, updatePlayer, visibleEquipment, animateLift, safeDiveCamera, updateFittingView, presentationState, syncDiscoveries, fireHarpoonVisual, aimHarpoon, harpoonMuzzle, updateSeaMonsters, setHarborRoom, updateHarborPlayer } from './world';
import { HARBOR, SITES, ISLANDS, BOSSES, LOOT, UPGRADES, lootPosition, lootFor, type Loot, type UpgradeId } from './data';
import { newSave, parseSave, SAVE_KEY, airCapacity, depthRating, bagCapacity, bagWeight, salvageError, bankDive, sellCargo, buyUpgrade, tradeUpgrade, objective, type Save } from './state';
import { ui, escapeHtml, titleHtml, hudHtml, mapHtml, workshopHtml, pauseHtml, endingHtml, creditsHtml, guideHtml, fittingHtml, cargoCounterHtml, icon, gearIcon } from './visual-ui';
import { level, levelProgress, experience, availableSites, availableIslands, availableBosses, exploreSite, discoverIsland, defeatBoss, destinationAvailable } from './progression';
import { createEncounter, tickEncounter, harpoonAim, hitHarpoon, HARPOON_RELOAD, type Encounter } from './combat';
import { seaRoute, routeTrail, type Point } from './navigation';
import { tickWeather, stormStrength, shelterAt, STORM_LEVEL } from './weather';
import { HARBOR_STATIONS, harborStation, walkHarbor } from './harbor';
import './voyage.css';
import './style.css';
import './visual.css';
let save:Save;try{save=parseSave(localStorage.getItem(SAVE_KEY));}catch{save=newSave();}
let mode:'title'|'boat'|'dive'|'harbor'='title',modal='',heading=save.boat[2],speed=0,t=0,air=150,diveBag:string[]=[],yaw=0,pitch=.25;
let nearestLoot:Loot|undefined,action:{id:string;elapsed:number;duration:number}|null=null,pingTime=-100,pingCooldown=0,hudClock=0,saveClock=0,toastTimer=0,drag=false;
let waypoint='finch',lastDepthWarning=0,returnAuto=false,storageWarning=false,lastTouch:[number,number]|null=null,moving=false;
let fittingUpgrade:UpgradeId='air';
let roomX=0,roomZ=-3.5,roomYaw=0,roomMoving=false,walkTarget:Point|null=null;
let route:Point[]=[],routeClock=0;
function updateRoute(){route=seaRoute(boat.position,target(),availableIslands(save).map(i=>({x:i.x,z:i.z,radius:i.size*3+5})));}
function inHarbor(){return mode==='harbor'||mode==='boat'&&dist(boat.position,HARBOR.x,HARBOR.z)<27;}
function sheltered(){return mode==='harbor'||shelterAt(boat.position,HARBOR,availableIslands(save));}
let swimYaw=0,swimPitch=0;
let encounter:Encounter|null=null,hull=100,reload=0,hitFlash=0;
const keys=new Set<string>();boat.position.set(save.boat[0],.1,save.boat[1]);
const pointerKeys=new Map<number,string>();
const sounds={ctx:null as AudioContext|null,master:null as GainNode|null};
function audioStart(){if(!sounds.ctx){const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=save.settings.sound?.13:0;master.connect(ctx.destination);sounds.ctx=ctx;sounds.master=master;const data=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),arr=data.getChannelData(0);for(let i=0;i<arr.length;i++)arr[i]=(Math.random()*2-1)*.45;const noise=ctx.createBufferSource();noise.buffer=data;noise.loop=true;const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=400;const gain=ctx.createGain();gain.gain.value=.13;noise.connect(filter);filter.connect(gain);gain.connect(master);noise.start();}void sounds.ctx.resume();}
function tone(kind:'ping'|'loot'|'bad'|'win'){if(!sounds.ctx||!sounds.master)return;const ctx=sounds.ctx,notes=kind==='win'?[330,440,550,660]:kind==='loot'?[550,740]:kind==='bad'?[150]:[900];notes.forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),at=ctx.currentTime+i*.12;o.frequency.setValueAtTime(f,at);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.3,at+.015);g.gain.exponentialRampToValueAtTime(.001,at+.6);o.connect(g);g.connect(sounds.master!);o.start(at);o.stop(at+.65);});}
function toast(text:string){const el=document.querySelector('#toast');if(el){const low=text.toLowerCase(),gear=UPGRADES.find(u=>low.includes(u.name.toLowerCase()));const image=/level|charted/.test(low)?'telescope':/guardian|harpoon|kraken/.test(low)?'swords':/island|cache/.test(low)?'palm-tree':gear?gearIcon[gear.id]:/air|safety|return|boat/.test(low)?'ship':/route|letter|fragment/.test(low)?'mail':/full|capacity/.test(low)?'backpack':/depth|suit/.test(low)?'shield':/crown|fund|sell|cargo/.test(low)?'coins':/closer|cancel|unavailable|limit/.test(low)?'circle-alert':'check';el.innerHTML=`${icon(image)}<span class="sr-only">${escapeHtml(text)}</span>`;el.setAttribute('title',text);el.classList.add('show');toastTimer=3;}}
function persist(){save.boat=[boat.position.x,boat.position.z,heading];try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch{if(!storageWarning){storageWarning=true;toast('Saving is unavailable. Keep this tab open to retain your voyage.');}}}
function dist(p:Vector3,x:number,z:number){return Math.hypot(p.x-x,p.z-z);}
function closestSite(){return availableSites(save).reduce((a,b)=>dist(boat.position,a.x,a.z)<dist(boat.position,b.x,b.z)?a:b);}
function target(){return waypoint==='harbor'?HARBOR:[...SITES,...ISLANDS,...BOSSES].find(s=>s.id===waypoint)||HARBOR;}
function refreshLoot(){syncDiscoveries(save);for(const[id,r]of lootRoots)r.setEnabled(!save.collected.includes(id)&&!diveBag.includes(id));}
function commitProgress(next:Save){
  const before=level(save);save=next;refreshLoot();persist();
  if(level(save)>before){tone('win');toast(`Level ${level(save)}. New islands, wrecks and guardians charted. Open M to choose your next adventure.`);}
}
function closestIsland(){return availableIslands(save).find(v=>dist(boat.position,v.x,v.z)<v.size*3+14);}
function fireHarpoon(){
  if(mode!=='boat'||modal||reload>0)return;
  reload=HARPOON_RELOAD;
  const aim=encounter?harpoonAim(boat.position.x,boat.position.z,heading,encounter):null;
  aimHarpoon(aim?.inRange?aim.bearing:heading,heading);const origin=harpoonMuzzle();
  const hit=!!encounter&&!!aim&&aim.aligned&&aim.inRange;
  const dest=hit?new Vector3(encounter!.x,3,encounter!.z):origin.add(new Vector3(Math.sin(heading)*80,0,Math.cos(heading)*80));
  fireHarpoonVisual(origin,dest);tone(hit?'loot':'ping');
  if(hit&&encounter){encounter=hitHarpoon(encounter);hitFlash=.25;if(encounter.hp<=0){const defeated=encounter.id;encounter=null;hull=Math.min(100,hull+35);commitProgress(defeatBoss(save,defeated));tone('win');toast('Guardian defeated. Guarded treasure secured, trophy chest fitted aboard.');}}
  updateHud();
}
function updateCombat(dt:number){
  reload=Math.max(0,reload-dt);hitFlash=Math.max(0,hitFlash-dt);
  if(dist(boat.position,HARBOR.x,HARBOR.z)<27)hull=100;
  if(!encounter){const boss=availableBosses(save).find(b=>!save.defeated.includes(b.id)&&dist(boat.position,b.x,b.z)<65);if(boss){encounter=createEncounter(boss);tone('bad');}}
  if(!encounter)return;
  const boss=BOSSES.find(b=>b.id===encounter!.id)!;
  if(dist(boat.position,boss.x,boss.z)>110){encounter=null;toast('Guardian left behind. Repair at an island or the harbor.');return;}
  const result=tickEncounter(encounter,boss,dt,boat.position.x,boat.position.z);encounter=result.encounter;
  if(result.damage){hull-=result.damage;tone('bad');document.getElementById('sea')?.classList.add('damaged');setTimeout(()=>document.getElementById('sea')?.classList.remove('damaged'),350);}
  if(hull<=0){encounter=null;hull=100;speed=0;heading=0;boat.position.set(0,.1,-105);persist();toast('Safety tow to Marrow Harbor. Secured cargo and equipment are safe.');}
}
function releaseMouse(){if(document.pointerLockElement)void document.exitPointerLock();drag=false;keys.clear();pointerKeys.clear();}
function closeModal(){if(modal==='guide'){save.guideSeen=true;persist();}modal='';ui.classList.remove('fitting-mode');document.querySelector('#modal-root')!.innerHTML='';keys.clear();}
function shell(content:string,wide=false){releaseMouse();ui.classList.remove('fitting-mode');document.querySelector('#modal-root')!.innerHTML=`<div class="scrim"><section class="panel ${wide?'wide':''}" role="dialog" aria-modal="true"><button class="close" data-action="close" aria-label="Close">×</button>${content}</section></div>`;document.querySelector<HTMLButtonElement>('.panel button:not(.close)')?.focus({preventScroll:true});}
function hud(){ui.innerHTML=hudHtml();updateHud();}
function start(){setHarborRoom(false);mode='boat';updateRoute();save.started=true;audioStart();hud();syncEquipment(save.upgrades);persist();if(!save.guideSeen)showGuide();}
function showGuide(){modal='guide';shell(guideHtml(),true);}
function cycleCamera(){if(modal||mode==='title'||mode==='harbor')return;if(mode==='boat'){const views=['chase','helm','orbit'] as const;save.settings.boatView=views[(views.indexOf(save.settings.boatView)+1)%views.length];}else save.settings.diveView=save.settings.diveView==='first'?'third':'first';persist();updateHud();}
function previewGear(id:UpgradeId){if(!inHarbor())return;releaseMouse();speed=0;modal='fitting';fittingUpgrade=id;ui.classList.add('fitting-mode');document.querySelector('#modal-root')!.innerHTML=fittingHtml(save,id);document.querySelector<HTMLButtonElement>('.fitting-choices button.selected')?.focus({preventScroll:true});}
function openMap(){modal='map';shell(mapHtml(save,waypoint,boat.position.x,boat.position.z),true);}
function enterHarbor(){if(!inHarbor())return;closeModal();releaseMouse();speed=0;mode='harbor';roomX=0;roomZ=-3.5;roomYaw=0;walkTarget=null;setHarborRoom(true);hud();persist();}
function leaveHarbor(){closeModal();releaseMouse();mode='boat';setHarborRoom(false);speed=0;walkTarget=null;camera.position.copyFrom(boat.position.add(new Vector3(-Math.sin(heading)*19,12,-Math.cos(heading)*19)));hud();persist();}
function workshop(){if(!inHarbor()){toast('Sail to Marrow Harbor to use the workshop.');return;}if(mode==='boat'){enterHarbor();return;}speed=0;modal='workshop';shell(workshopHtml(save),true);}
function cargoCounter(){modal='counter';shell(cargoCounterHtml(save));}
function useStation(id:string){walkTarget=null;if(id==='exit')leaveHarbor();else if(id==='cargo')cargoCounter();else workshop();}
function nextCourse(){const choices=['harbor',...availableSites(save).map(v=>v.id),...availableIslands(save).filter(v=>v.reward>0).map(v=>v.id),...availableBosses(save).filter(v=>!save.defeated.includes(v.id)).map(v=>v.id)];waypoint=choices[(choices.indexOf(waypoint)+1)%choices.length];updateRoute();updateHud();}
function pause(){modal='pause';shell(pauseHtml(save));}
function endGame(){modal='ending';tone('win');shell(endingHtml(save));}
function dive(){if(mode!=='boat')return;if(encounter){toast('Sail clear of the guardian before diving.');return;}const s=closestSite();if(dist(boat.position,s.x,s.z)>20){toast('Follow the chart to within 20 m of a wreck to dive.');return;}if(depthRating(save)<s.depth){toast(`${s.name} rests at ${s.depth} m. Fit the ${s.id==='lantern'?'reinforced dive suit':'abyssal breathing rig'} first.`);tone('bad');return;}if(dist(boat.position,s.x,s.z)<12){boat.position.x=s.x+Math.cos(s.angle)*13;boat.position.z=s.z-Math.sin(s.angle)*13;heading=s.angle;}commitProgress(exploreSite(save,s.id));mode='dive';speed=0;air=airCapacity(save);diveBag=[];action=null;returnAuto=false;save.dives++;swimmer.position.copyFrom(boat.position.add(new Vector3(Math.cos(heading)*3,0,-Math.sin(heading)*3)));swimmer.position.y=-1.6;yaw=Math.atan2(s.x-swimmer.position.x,s.z-swimmer.position.z);pitch=.5;camera.position.copyFrom(swimmer.position);camera.rotation.set(pitch,yaw,0);hud();toast(`${s.name}. Follow the buoy down. Bottled letters shimmer blue; treasure shimmers gold.`);tone('ping');persist();}
function board(rescued=false){if(mode!=='dive')return;if(!rescued){commitProgress(bankDive(save,diveBag));tone('loot');}const count=diveBag.length;diveBag=[];mode='boat';action=null;returnAuto=false;releaseMouse();refreshLoot();hud();persist();toast(rescued?'Your boat pulled you to safety. Small finds returned to their original spots; banked cargo and upgrades are safe.':count?`${count} finds secured aboard. Air refilled. Set course for Marrow Harbor to sell.`:'Back aboard. Your air is full for the next dive.');}
function interact(){if(modal||mode==='title')return;if(mode==='harbor'){const station=harborStation(roomX,roomZ);if(station)useStation(station.id);return;}if(mode==='boat'){if(dist(boat.position,HARBOR.x,HARBOR.z)<27)workshop();else{const island=closestIsland();if(island&&dist(boat.position,closestSite().x,closestSite().z)>=20){if(encounter){toast('Sail clear of the guardian to land.');return;}speed=0;hull=100;const fresh=!save.islands.includes(island.id);commitProgress(discoverIsland(save,island.id));tone('loot');toast(fresh?`${island.name} explored. Island cache secured. Hull repaired.`:'Island supplies loaded. Hull repaired.');}else dive();}return;}if(swimmer.position.y>-3.5&&dist(swimmer.position,boat.position.x,boat.position.z)<10){board();return;}if(action)return;if(!nearestLoot){toast('Move closer to a glowing find, or press Q to ping the wreck.');return;}const clues=[...save.clues,...diveBag.flatMap(id=>{const c=lootFor(id)?.clue;return c?[c]:[];})];const error=salvageError({...save,clues:[...new Set(clues)]},nearestLoot.id,diveBag);if(error){toast(error);tone('bad');return;}action={id:nearestLoot.id,elapsed:0,duration:nearestLoot.requirement?2.4:1};}
function recover(id:string){const l=lootFor(id)!;if(l.requirement==='lift'){commitProgress(bankDive(save,[id]));animateLift(id);persist();}else diveBag.push(id);refreshLoot();tone('loot');toast(l.flavor);updateHud();}
function ping(){if(modal||mode==='title'||pingCooldown>0)return;pingCooldown=6;pingTime=t;tone('ping');toast(mode==='dive'?'Sonar pulse. Follow the markers through the silt.':`${closestSite().name} · ${Math.round(dist(boat.position,closestSite().x,closestSite().z))} m · ${closestSite().depth} m deep`);}
function automaticReturn(){if(mode!=='dive'||modal)return;returnAuto=!returnAuto;action=null;toast(returnAuto?'Following your guide line to the boat. Press R or move to cancel.':'Return cancelled.');}

ui.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-action],[data-buy],[data-trade],[data-waypoint],[data-preview],[data-station]');if(!b)return;const act=b.dataset.action;
  if(b.dataset.station&&mode==='harbor'){const station=HARBOR_STATIONS.find(s=>s.id===b.dataset.station);if(station)walkTarget={x:station.x,z:station.z};return;}
  if(b.dataset.preview){previewGear(b.dataset.preview as UpgradeId);return;}
  if(b.dataset.waypoint){if(!destinationAvailable(save,b.dataset.waypoint))return;waypoint=b.dataset.waypoint;updateRoute();closeModal();toast(`Course set for ${target().name}.`);updateHud();return;}
  if(b.dataset.buy){const r=buyUpgrade(save,b.dataset.buy as UpgradeId);if(r.error){toast(r.error);return;}save=r.save;syncEquipment(save.upgrades);persist();tone('loot');workshop();toast(`${UPGRADES.find(u=>u.id===b.dataset.buy)!.name} installed.`);return;}
  if(b.dataset.trade){const r=tradeUpgrade(save,b.dataset.trade as UpgradeId);if(r.error){toast(r.error);return;}save=r.save;syncEquipment(save.upgrades);persist();tone('loot');workshop();toast('Equipment traded in at full value.');return;}
  if(act==='start')start();if(act==='close')closeModal();if(act==='map')openMap();if(act==='pause')pause();if(act==='credits'){modal='credits';shell(creditsHtml);}
  if(act==='cargo-counter'&&mode==='harbor'){closeModal();walkTarget={x:3.8,z:1.5};}
  if(act==='next-course')nextCourse();if(act==='leave-harbor'&&mode==='harbor')leaveHarbor();
  if(act==='fire')fireHarpoon();if(act==='interact')interact();if(act==='ping')ping();if(act==='return')automaticReturn();
  if(act==='camera')cycleCamera();if(act==='guide')showGuide();if(act==='guide-done')closeModal();if(act==='inspect'){if(mode==='harbor')leaveHarbor();else closeModal();save.settings.boatView='orbit';persist();}
  if(act==='workshop')workshop();
  if(act==='sell'){const result=sellCargo(save);save=result.save;persist();tone('loot');if(result.final)endGame();else{if(mode==='harbor')cargoCounter();else workshop();toast(`Sold cargo for ${result.earned} crowns.`);}updateHud();}
  if(act==='reset-prompt'){modal='reset';shell('<small>A FRESH START</small><h2>Start a new voyage?</h2><p>This replaces the current save on this device, including money, equipment, and recovered finds.</p><div class="pause-actions"><button class="danger-button" data-action="reset">Start new voyage</button><button class="secondary" data-action="close">Keep this voyage</button></div>');}
  if(act==='reset'){save=newSave();encounter=null;hull=100;reload=0;waypoint='finch';diveBag=[];heading=0;speed=0;boat.position.set(0,.1,-105);refreshLoot();closeModal();persist();start();}
});
ui.addEventListener('change',e=>{const el=e.target as HTMLInputElement;if(el.id==='sound'){save.settings.sound=el.checked;if(sounds.master)sounds.master.gain.value=el.checked?.13:0;}if(el.id==='sensitivity')save.settings.sensitivity=Number(el.value);if(el.id==='quality'){save.settings.quality=el.value as 'high'|'low';engine.setHardwareScalingLevel(el.value==='low'?1.75:Math.max(1,window.devicePixelRatio/1.5));}persist();});
ui.addEventListener('pointerdown',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-hold]');if(b){const key=b.dataset.hold!;keys.add(key);pointerKeys.set(e.pointerId,key);b.setPointerCapture(e.pointerId);}});
function releasePointer(e:PointerEvent){const key=pointerKeys.get(e.pointerId);if(key)keys.delete(key);pointerKeys.delete(e.pointerId);drag=false;}
window.addEventListener('pointerup',releasePointer);window.addEventListener('pointercancel',releasePointer);
window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&mode!=='title'&&!modal)e.preventDefault();keys.add(e.code);if(e.repeat)return;if(e.code==='Escape'){if(modal)closeModal();else if(mode!=='title')pause();}if(e.code==='KeyM'&&mode!=='title'){if(modal==='map')closeModal();else openMap();}if(e.code==='KeyV')cycleCamera();if(e.code==='KeyF')fireHarpoon();if(e.code==='KeyE')interact();if(e.code==='KeyQ')ping();if(e.code==='KeyR')automaticReturn();});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();drag=false;if(mode!=='title'&&!modal)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode!=='title'&&!modal)pause();});
canvas.addEventListener('pointerdown',e=>{if(modal)return;if(mode==='boat'&&e.button===0){keys.add('MouseFire');pointerKeys.set(e.pointerId,'MouseFire');canvas.setPointerCapture(e.pointerId);fireHarpoon();}else if(mode==='dive'){drag=true;try{const r=canvas.requestPointerLock();if(r)void r.catch(()=>{});}catch{}}});
window.addEventListener('mousemove',e=>{if(mode==='dive'&&!modal&&(document.pointerLockElement===canvas||drag)){yaw+=e.movementX*.0025*save.settings.sensitivity;pitch=Math.max(-1.48,Math.min(1.48,pitch+e.movementY*.0025*save.settings.sensitivity));}});
canvas.addEventListener('touchmove',e=>{if(mode==='dive'&&!modal&&e.touches.length===1){const touch=e.touches[0];if(lastTouch){yaw+=(touch.clientX-lastTouch[0])*.006;pitch=Math.max(-1.48,Math.min(1.48,pitch+(touch.clientY-lastTouch[1])*.006));}lastTouch=[touch.clientX,touch.clientY];}},{passive:true});canvas.addEventListener('touchend',()=>lastTouch=null);
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement)keys.clear();});

const htmlCache=new WeakMap<Element,string>();
function setHtml(id:string,html:string){const el=document.getElementById(id)!;if(htmlCache.get(el)!==html){el.innerHTML=html;htmlCache.set(el,html);}}
function updateHud(){
  if(mode==='title')return;
  ui.classList.toggle('ashore',mode==='harbor');
  const q=(id:string)=>document.getElementById(id)!;
  const weather=q('weather-status'),w=save.weather;weather.className=`weather-status ${level(save)>=STORM_LEVEL&&w.phase!=='clear'?'active':''} ${w.phase} ${sheltered()?'sheltered':''}`;weather.innerHTML=`${icon(sheltered()?'shield':w.phase==='warning'?'cloud-lightning':'cloud-rain')}<b>${Math.ceil(w.remaining)}</b>${icon('wind')}`;weather.title=sheltered()?'Sheltered from the storm':w.phase==='warning'?'Storm approaching. Islands and harbor provide shelter.':'Storm crossing. Follow the gold trail or seek shelter.';weather.setAttribute('aria-label',weather.title);
  q('money').textContent=String(save.money);
  q('rank-number').textContent=String(level(save));q('rank').style.setProperty('--xp',`${levelProgress(save)*100}%`);q('rank').title=`Level ${level(save)}. ${experience(save)} exploration XP. Chart new places by exploring and securing salvage.`;
  const combat=q('combat-status');combat.classList.toggle('active',mode==='boat'&&(!!encounter||hull<100));combat.classList.toggle('repair-only',!encounter);
  q('hull-bar').style.width=hull+'%';q('hull-meter').setAttribute('aria-valuenow',String(hull));
  if(encounter){const boss=BOSSES.find(b=>b.id===encounter!.id)!;q('monster-image').setAttribute('src',`/thumbnails/sea-${boss.kind==='shark'?'shark':'tentacle'}.png`);q('monster-bar').style.width=encounter.hp/boss.hp*100+'%';q('monster-meter').setAttribute('aria-label',boss.name);q('monster-meter').setAttribute('aria-valuenow',String(Math.round(encounter.hp/boss.hp*100)));q('attack-cue').innerHTML=icon(encounter.phase==='windup'||encounter.phase==='charge'?'triangle-alert':encounter.phase==='exposed'?'crosshair':'swords');combat.classList.toggle('warning',['windup','charge'].includes(encounter.phase));combat.classList.toggle('exposed',encounter.phase==='exposed');}else{q('monster-bar').style.width='0';q('monster-meter').setAttribute('aria-valuenow','0');combat.classList.remove('warning','exposed');}

  const dest=target(),p=mode==='boat'?boat.position:swimmer.position;
  const nav=route[1]||dest;
  const dx=(mode==='dive'?boat.position.x:encounter?.x??nav.x)-p.x,dz=(mode==='dive'?boat.position.z:encounter?.z??nav.z)-p.z;
  let diff=Math.atan2(dx,dz)-(mode==='dive'?yaw:heading);diff=Math.atan2(Math.sin(diff),Math.cos(diff));
  q('bearing').style.transform=`rotate(${diff*180/Math.PI}deg)`;
  setHtml('destination',icon(mode==='dive'?'ship':encounter?'swords':waypoint==='harbor'?'anchor':ISLANDS.some(i=>i.id===waypoint)?'palm-tree':BOSSES.some(b=>b.id===waypoint)?'swords':'ship'));
  const bearingTarget=mode==='dive'?'Your boat':encounter?BOSSES.find(b=>b.id===encounter!.id)!.name:dest.name;
  q('course').setAttribute('aria-label',`Course to ${bearingTarget}`);q('course').title=bearingTarget;
  q('distance').textContent=`${Math.round(mode==='dive'?Math.hypot(dx,dz):dist(boat.position,dest.x,dest.z))} m`;
  q('dive-status').classList.toggle('active',mode==='dive');
  q('crosshair').style.display=mode==='dive'&&save.settings.diveView==='first'?'block':'none';
  q('mask').classList.toggle('active',mode==='dive'&&save.settings.diveView==='first');
  const view=mode==='boat'?save.settings.boatView:save.settings.diveView;
  document.querySelector('[data-action="camera"]')?.setAttribute('aria-label',`Change camera view (V), currently ${view}`);
  const items=mode==='dive'?diveBag:save.cargo,capacity=mode==='dive'?bagCapacity(save):Math.max(5,save.cargo.length);
  setHtml('bag',Array.from({length:capacity},(_,i)=>`<i class="cargo-slot ${i<(mode==='dive'?bagWeight(items):items.length)?'filled':''}">${i<(mode==='dive'?bagWeight(items):items.length)?icon('gem'):''}</i>`).join(''));
  q('bag').setAttribute('aria-label',`${mode==='dive'?bagWeight(items):items.length} of ${capacity} cargo slots`);
  if(mode==='dive'){
    q('air-text').textContent=String(Math.ceil(air));const pct=Math.max(0,air/airCapacity(save)*100);
    q('air-dial').style.setProperty('--air',pct+'%');q('air-dial').classList.toggle('low',air<40);q('air-dial').setAttribute('aria-valuenow',String(Math.round(pct)));
    q('depth').textContent=`${Math.round(-swimmer.position.y)} m`;q('depth-limit').textContent=`/ ${depthRating(save)}`;
    const estimate=Math.ceil(Vector3.Distance(swimmer.position,boat.position)/5.2)+5;
    q('return-time').textContent=`${estimate}s`;q('return-estimate').classList.toggle('warning',air<estimate+15);q('return-estimate').classList.toggle('following',returnAuto);
  }
  // Keep controls mounted while held. Replacing their HTML on every reload
  // tick used to break pointer capture and lose the release event.
  setHtml('controls',`<button data-action="ping" class="visual-button sonar-button" aria-label="Sonar (Q)" title="Sonar (Q)">${icon('scan')}<kbd>Q</kbd></button>${mode==='harbor'?`<button data-action="leave-harbor" class="visual-button" aria-label="Return to your boat" title="Return to boat">${icon('door-open')}</button>`:''}${mode==='boat'?`<button data-action="fire" data-hold="KeyF" class="visual-button harpoon-button" aria-label="Hold F or left mouse to fire; harpoon tracks the guardian" title="Hold F or left mouse to fire; harpoon tracks the guardian">${icon('crosshair')}<kbd>F</kbd></button>`:''}${mode==='dive'?`<button data-action="return" class="visual-button" aria-label="Return to boat (R)" title="Return to boat (R)">${icon('ship')}<kbd>R</kbd></button>`:''}`);
  const sonarButton=document.querySelector<HTMLElement>('.sonar-button')!;
  sonarButton.classList.toggle('pulsing',t-pingTime<4);sonarButton.style.setProperty('--cooldown',`${Math.max(0,pingCooldown/6)*100}%`);
  const fireButton=document.querySelector<HTMLElement>('.harpoon-button');
  if(fireButton){fireButton.style.setProperty('--cooldown',`${reload/HARPOON_RELOAD*100}%`);fireButton.classList.toggle('locked',!!encounter&&harpoonAim(boat.position.x,boat.position.z,heading,encounter).inRange);fireButton.classList.toggle('exposed',encounter?.phase==='exposed');}
  document.querySelector('[data-action="return"]')?.classList.toggle('selected',returnAuto);
  const progress=q('action-progress');progress.classList.toggle('active',!!action);if(action)(progress.firstElementChild as HTMLElement).style.width=`${action.elapsed/action.duration*100}%`;
  let prompt='';const button=(image:string,label:string,extra='')=>`<button data-action="interact" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><kbd>E</kbd>${icon(image)}${extra}${icon('arrow-up-right','prompt-arrow')}</button>`;
  if(mode==='harbor'){const station=harborStation(roomX,roomZ);if(station)prompt=button(station.image,station.name);}
  else if(mode==='boat'){
    if(dist(boat.position,HARBOR.x,HARBOR.z)<27)prompt=button('anchor','Dock at the workshop',icon('wrench'));
    else if(!encounter&&dist(boat.position,closestSite().x,closestSite().z)<20){const ready=depthRating(save)>=closestSite().depth;prompt=button(ready?'waves':'lock-keyhole',`Dive ${closestSite().name}, ${closestSite().depth} meters${ready?'':', better suit required'}`,`<span>${closestSite().depth} m</span>${!ready?icon('shield'):''}`);}
    else if(!encounter&&closestIsland())prompt=button('palm-tree',`Explore ${closestIsland()!.name} and repair`,icon(save.islands.includes(closestIsland()!.id)?'wrench':'gem'));
  }else if(swimmer.position.y>-3.5&&dist(swimmer.position,boat.position.x,boat.position.z)<10)prompt=button('ship','Climb aboard and secure finds',icon('chevrons-up'));
  else if(action)prompt=`<div class="recovering">${icon(lootFor(action.id)?.requirement==='cutter'?'scissors':lootFor(action.id)?.requirement==='lift'?'construction':'hand')}</div>`;
  else if(nearestLoot){const l=nearestLoot,locked=l.requirement&&!save.upgrades.includes(l.requirement);prompt=button(l.clue?'mail':l.final?'lock-keyhole':'gem',l.name,`${locked?icon('lock-keyhole'):''}${l.requirement?`<img class="required-gear" src="/thumbnails/${l.requirement}.png" alt="${UPGRADES.find(u=>u.id===l.requirement)!.name}">`:''}${l.value?`<span>${l.value}</span>${icon('coins')}`:''}`);}
  setHtml('action-prompt',prompt);
}
function updatePins(){document.querySelector<HTMLElement>('#route-edge')!.hidden=modal!==''||mode!=='boat'||!!encounter;if(modal||mode==='title'){document.querySelector('#pins')!.innerHTML='';return;}
  if(mode==='harbor'){
    const w=engine.getRenderWidth(),h=engine.getRenderHeight(),vp=camera.viewport.toGlobal(w,h);
    document.querySelector('#pins')!.innerHTML=HARBOR_STATIONS.map(s=>{const v=Vector3.Project(new Vector3(s.id==='exit'?1.8:s.x,s.id==='exit'?.5:1.6,-800+s.z),Matrix.Identity(),scene.getTransformMatrix(),vp);return `<button class="station-pin ${harborStation(roomX,roomZ)?.id===s.id?'near':''}" data-station="${s.id}" style="left:${v.x/w*100}%;top:${v.y/h*100}%" aria-label="Walk to ${s.name}" title="${s.name}">${icon(s.image)}${icon('footprints','station-walk')}</button>`;}).join('');return;
  }
  if(mode==='boat'){
    const w=engine.getRenderWidth(),h=engine.getRenderHeight(),vp=camera.viewport.toGlobal(w,h);let html='';
    const pin=(x:number,y:number,z:number,image:string,cls='',distance?:number)=>{const p=new Vector3(x,y,z);if(Vector3.Dot(p.subtract(camera.position),camera.getForwardRay().direction)<=0)return;const v=Vector3.Project(p,Matrix.Identity(),scene.getTransformMatrix(),vp);if(v.z<0||v.z>1)return;html+=`<div class="loot-pin surface-pin ${cls}" style="left:${Math.max(6,Math.min(94,v.x/w*100))}%;top:${Math.max(20,Math.min(75,v.y/h*100))}%"><i>${icon(image)}</i>${distance===undefined?'':`<span>${Math.round(distance)} m</span>`}</div>`;};
    if(encounter){const aim=harpoonAim(boat.position.x,boat.position.z,heading,encounter);pin(encounter.x,4,encounter.z,'crosshair',`${aim.inRange?'locked':''} ${encounter.phase==='exposed'?'exposed':''} ${hitFlash?'hit':''}`,aim.distance);if(['windup','charge'].includes(encounter.phase))pin(encounter.targetX,1,encounter.targetZ,'triangle-alert','danger');}
    else {const dest=target();pin(dest.x,3,dest.z,waypoint==='harbor'?'anchor':ISLANDS.some(i=>i.id===waypoint)?'palm-tree':BOSSES.some(b=>b.id===waypoint)?'swords':save.explored.includes(waypoint)?'flag':'ship','destination-pin',dist(boat.position,dest.x,dest.z));
      for(const p of routeTrail(route)){const v=Vector3.Project(new Vector3(p.x,.65,p.z),Matrix.Identity(),scene.getTransformMatrix(),vp);if(Vector3.Dot(new Vector3(p.x,.65,p.z).subtract(camera.position),camera.getForwardRay().direction)>0&&v.z>0&&v.z<1&&v.x>30&&v.x<w-30&&v.y>100&&v.y<h-90)html+=`<div class="water-trail" style="left:${v.x/w*100}%;top:${v.y/h*100}%">${icon('chevrons-up')}</div>`;}
      const next=route[1]||dest,diff=Math.atan2(Math.sin(Math.atan2(next.x-boat.position.x,next.z-boat.position.z)-heading),Math.cos(Math.atan2(next.x-boat.position.x,next.z-boat.position.z)-heading));
      const edge=document.querySelector<HTMLElement>('#route-edge')!;edge.className=`route-edge ${Math.abs(diff)>1.1?'show':''} ${diff<0?'left':'right'}`;edge.innerHTML=`${icon(diff<0?'chevron-left':'chevron-right')}${icon('compass')}`;edge.setAttribute('aria-label',`Turn ${diff<0?'left':'right'} to follow your course`);
    }
    document.querySelector('#pins')!.innerHTML=html;return;
  }
const w=engine.getRenderWidth(),h=engine.getRenderHeight(),vp=camera.viewport.toGlobal(w,h),range=save.upgrades.includes('sonar')?28:12;let html='';nearestLoot=undefined;let nearest=4.2;
  for(const l of LOOT){if(!availableSites(save).some(s=>s.id===l.site)||save.collected.includes(l.id)||diveBag.includes(l.id))continue;const p=new Vector3(...lootPosition(l)).add(new Vector3(0,.9,0)),d=Vector3.Distance(swimmer.position,p);if(d<nearest){nearest=d;nearestLoot=l;}if(Vector3.Dot(p.subtract(camera.position),camera.getForwardRay().direction)<=0||d>(t-pingTime<4?range*1.7:range))continue;const v=Vector3.Project(p,Matrix.Identity(),scene.getTransformMatrix(),vp);if(v.z<0||v.z>1||v.x<15||v.x>w-15||v.y<80||v.y>h-80)continue;html+=`<div class="loot-pin ${l.clue?'clue':''} ${l.final?'final':''}" style="left:${v.x/w*100}%;top:${v.y/h*100}%"><i>${icon(l.clue?'mail':l.final?'lock-keyhole':'gem')}</i><span>${Math.round(d)} m</span></div>`;}
  const line=boat.position.add(new Vector3(0,-Math.min(8,-swimmer.position.y*.3),0)),v=Vector3.Project(line,Matrix.Identity(),scene.getTransformMatrix(),vp);if(Vector3.Dot(line.subtract(camera.position),camera.getForwardRay().direction)>0&&v.z>0&&v.z<1)html+=`<div class="loot-pin boat-pin" style="left:${Math.max(4,Math.min(96,v.x/w*100))}%;top:${Math.max(15,Math.min(80,v.y/h*100))}%"><i>${icon('ship')}</i></div>`;document.querySelector('#pins')!.innerHTML=html;
}
function simulate(dt:number){
  if(mode==='boat'||mode==='dive'){
    const phase=save.weather.phase;save.weather=tickWeather(save.weather,dt,level(save),!!encounter);
    if(phase!==save.weather.phase){tone(save.weather.phase==='clear'?'loot':'bad');toast(save.weather.phase==='warning'?'Storm approaching. Islands and Marrow Harbor offer shelter.':save.weather.phase==='storm'?'Storm crossing. The gold trail stays visible. Shelter beside an island to avoid the wind.':'The storm has passed. Clear skies ahead.');persist();}
  }
  if(mode==='harbor'){
    let dx=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dz=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    if(dx||dz)walkTarget=null;
    if(walkTarget){const deltaX=walkTarget.x-roomX,deltaZ=walkTarget.z-roomZ,length=Math.hypot(deltaX,deltaZ);if(length<.15){const station=harborStation(roomX,roomZ);walkTarget=null;if(station)useStation(station.id);}else{dx=deltaX/length;dz=deltaZ/length;}}
    roomMoving=!!(dx||dz);if(roomMoving){const length=Math.hypot(dx,dz),p=walkHarbor(roomX,roomZ,dx/length*dt*3.5,dz/length*dt*3.5);roomX=p.x;roomZ=p.z;roomYaw=Math.atan2(dx,dz);}return;
  }
  if(mode==='boat'){
    heading+=((keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0))*dt*(.55+Math.min(1,Math.abs(speed)/10)*.4);
    speed+=((keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0))*dt*12;speed*=Math.exp(-dt*.6);speed=Math.max(-6,Math.min(17,speed));
    boat.position.x+=Math.sin(heading)*speed*dt;boat.position.z+=Math.cos(heading)*speed*dt;
    const wind=save.weather.phase==='storm'&&!sheltered()&&!encounter?stormStrength(save.weather)*1.6:0;boat.position.x+=Math.sin(save.weather.wind)*wind*dt;boat.position.z+=Math.cos(save.weather.wind)*wind*dt;
    if(Math.abs(boat.position.x)>310||boat.position.z>495||boat.position.z< -180){boat.position.x=Math.max(-310,Math.min(310,boat.position.x));boat.position.z=Math.max(-180,Math.min(495,boat.position.z));speed*=-.3;toast('The open ocean can wait. Your chart covers the Marrow Isles.');}
    for(const island of availableIslands(save)){const {x,z}=island,r=island.size*3;const d=dist(boat.position,x,z);if(d<r){boat.position.addInPlace(boat.position.subtract(new Vector3(x,boat.position.y,z)).normalize().scale(r-d+.1));speed*=.5;}}
    updateCombat(dt);const aim=encounter?harpoonAim(boat.position.x,boat.position.z,heading,encounter):null;aimHarpoon(aim?.inRange?aim.bearing:heading,heading);
    if(keys.has('KeyF')||keys.has('MouseFire'))fireHarpoon();
    if(save.settings.boatView!=='helm'){
      const angle=heading+(save.settings.boatView==='orbit'?.9:0),distance=save.settings.boatView==='orbit'?14:19;
      const desired=boat.position.add(new Vector3(-Math.sin(angle)*distance,save.settings.boatView==='orbit'?8:12,-Math.cos(angle)*distance));camera.position=Vector3.Lerp(camera.position,desired,1-Math.exp(-dt*5));camera.setTarget(boat.position.add(new Vector3(Math.sin(heading)*3,1.8,Math.cos(heading)*3)));camera.fov=.9;
    }
  }else if(mode==='dive'){
    yaw+=((keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0))*dt*1.6;
    pitch=Math.max(-1.48,Math.min(1.48,pitch+((keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0))*dt*1.3));camera.rotation.set(pitch,yaw,0);
    const forward=new Vector3(Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)),right=new Vector3(Math.cos(yaw),0,-Math.sin(yaw));
    const move=forward.scale((keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0)).add(right.scale((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)));
    move.y+=(keys.has('Space')?1:0)-(keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('KeyC')?1:0);moving=move.lengthSquared()>.01;if(moving)returnAuto=false;
    if(returnAuto){const dest=new Vector3(boat.position.x,-1.8,boat.position.z),delta=dest.subtract(swimmer.position);if(delta.length()<3){board();return;}move.copyFrom(delta.normalize());swimmer.position.addInPlace(move.scale(dt*5.2));}
    else{if(move.length()>1)move.normalize();const swimSpeed=save.upgrades.includes('fins')?6.5:4.5,near=SITES.find(s=>dist(swimmer.position,s.x,s.z)<36);if(near&&swimmer.position.y< -8)move.x+=near.current*(dist(swimmer.position,near.x,near.z)<7?.2:1)*.12;swimmer.moveWithCollisions(move.scale(dt*swimSpeed));}
    if(move.lengthSquared()>.001){swimYaw=Math.atan2(move.x,move.z);swimPitch=Math.atan2(-move.y,Math.hypot(move.x,move.z));}
    swimmer.position.y=Math.max(floorHeight(swimmer.position.x,swimmer.position.z)+.8,Math.min(-.8,swimmer.position.y));
    if(-swimmer.position.y>depthRating(save)){swimmer.position.y=-depthRating(save);if(t-lastDepthWarning>7){toast('Depth limit reached. Reinforce your equipment at the harbor.');lastDepthWarning=t;}}
    if(save.settings.diveView==='third'){
      const offset=forward.scale(-4.8).add(new Vector3(0,1.5,0));camera.position.copyFrom(safeDiveCamera(swimmer.position.add(offset)));camera.setTarget(swimmer.position.add(forward.scale(4)));camera.fov=1;
    }else{camera.position.copyFrom(swimmer.position);camera.rotation.set(pitch,yaw,0);camera.fov=.95;}
    air-=dt;if(air<=0){board(true);return;}
    if(action){const l=lootFor(action.id)!;if(Vector3.Distance(swimmer.position,new Vector3(...lootPosition(l)))>5.5){action=null;toast('Recovery cancelled. Stay close to the find.');}else{action.elapsed+=dt;if(action.elapsed>=action.duration){const id=action.id;action=null;recover(id);}}}
    if(air<25&&Math.floor(t)%8===0&&Math.floor(t-dt)%8!==0)tone('bad');
  }
}
function render(dt:number){
  t+=dt;routeClock+=dt;if(routeClock>1){updateRoute();routeClock=0;}pingCooldown=Math.max(0,pingCooldown-dt);
  const helmView=mode==='boat'&&save.settings.boatView==='helm'&&modal!=='fitting';
  if(!helmView)camera.upVector.set(0,1,0);
  if(mode==='title'){camera.position.set(boat.position.x-24+Math.sin(t*.07)*4,13,boat.position.z-20);camera.setTarget(boat.position.add(new Vector3(0,1,0)));}
  if(!modal&&mode!=='title')simulate(dt);
  syncEquipment(modal==='fitting'?[...new Set([...save.upgrades,fittingUpgrade])]:save.upgrades,save.cargo);const swimming=mode==='dive'&&(moving||returnAuto);updatePlayer(mode==='dive',save.settings.diveView==='third',save.settings.boatView==='helm',swimming?swimYaw:yaw,swimming?swimPitch:pitch,swimming,!!action,t);
  setHarborRoom(mode==='harbor'&&modal!=='fitting');if(mode==='harbor'&&modal!=='fitting')updateHarborPlayer(roomX,roomZ,roomYaw,roomMoving&&!modal);
  if(modal==='fitting')updateFittingView(t,heading,fittingUpgrade);
  updateSeaMonsters(t,encounter);renderWorld(t,heading,mode==='dive',helmView,mode==='title'?0:stormStrength(save.weather));
  if(mode!=='title'){hudClock+=dt;if(hudClock>.1){hudClock=0;updatePins();updateHud();}if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)document.querySelector('#toast')?.classList.remove('show');}saveClock+=dt;if(saveClock>8&&mode==='boat'){persist();saveClock=0;}}
}
function voyageState(){return {mode,paused:!!modal,weather:{...save.weather,sheltered:sheltered()},navigation:{destination:waypoint,route},harbor:mode==='harbor'?{x:roomX,z:roomZ,near:harborStation(roomX,roomZ)?.id||null}:null,level:level(save),xp:experience(save),explored:save.explored,islands:save.islands,defeated:save.defeated,hull,reload,encounter,availableWrecks:availableSites(save).map(s=>s.id),money:save.money,upgrades:save.upgrades,cargo:save.cargo,clues:save.clues,collected:save.collected,diveBag,objective:objective(save),air:mode==='dive'?Math.round(air):null,boat:{x:Math.round(boat.position.x),z:Math.round(boat.position.z),heading},diver:mode==='dive'?{x:Math.round(swimmer.position.x),y:Math.round(swimmer.position.y),z:Math.round(swimmer.position.z),yaw,pitch}:null,cameraView:mode==='dive'?save.settings.diveView:save.settings.boatView,guideSeen:save.guideSeen,physicalEquipment:visibleEquipment(save.upgrades),previewUpgrade:modal==='fitting'?fittingUpgrade:null,presentation:presentationState(),depthRating:depthRating(save),nearbyFind:nearestLoot?.id||null,completed:save.completed};}
function registerTools(){
  const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options?:unknown)=>Promise<void>|void}}).modelContext;if(!context)return;
  const life=new AbortController();window.addEventListener('pagehide',()=>life.abort(),{once:true});
  const register=(name:string,description:string,schema:object,execute:(input:any)=>unknown,readOnlyHint=false)=>{try{void Promise.resolve(context.registerTool({name,description,inputSchema:schema,annotations:{readOnlyHint,untrustedContentHint:false},execute},{signal:life.signal})).catch(()=>{});}catch{}};
  register('change_camera_view','Cycle the same camera views as the visible camera button (V).',{type:'object',properties:{},additionalProperties:false},()=>{cycleCamera();return voyageState();});
  register('read_voyage','Read the current voyage, weather, route, workshop position, equipment, cargo and nearby salvage.',{type:'object',properties:{},additionalProperties:false},voyageState,true);
  register('set_course','Set the gold trail and visible bearing to an unlocked wreck, island, guardian or Marrow Harbor.',{type:'object',properties:{destination:{type:'string',enum:['harbor',...SITES.map(v=>v.id),...ISLANDS.map(v=>v.id),...BOSSES.map(v=>v.id)]}},required:['destination'],additionalProperties:false},input=>{if(!destinationAvailable(save,input.destination))throw Error('That destination has not been charted at your level.');waypoint=input.destination;updateRoute();if(modal==='map')closeModal();if(mode!=='title')updateHud();return {destination:target().name};});
  register('fire_harpoon','Fire the same guardian-tracking harpoon as F or left mouse. Unlimited bolts; respects range and reload.',{type:'object',properties:{},additionalProperties:false},()=>{fireHarpoon();return voyageState();});
  register('interact_nearby','Use the visible E action: dock, use a nearby workshop station, explore an island, dive, recover a find or climb aboard.',{type:'object',properties:{},additionalProperties:false},()=>{interact();return voyageState();});
  register('return_to_boat','Use the visible R action to follow the dive line back aboard.',{type:'object',properties:{},additionalProperties:false},()=>{automaticReturn();return voyageState();});
  register('open_workshop','Open the harbor workshop when your boat is docked. Does not buy or sell.',{type:'object',properties:{},additionalProperties:false},()=>{if(!inHarbor())throw Error('Boat must be at Marrow Harbor.');workshop();return {opened:true,money:save.money,cargo:save.cargo};});
  register('sell_recovered_cargo','Sell all secured cargo at Marrow Harbor and add its value to your purse.',{type:'object',properties:{},additionalProperties:false},()=>{if(!inHarbor())throw Error('Boat must be at Marrow Harbor.');const r=sellCargo(save);save=r.save;persist();if(r.final)endGame();else workshop();return {earned:r.earned,money:save.money,completed:save.completed};});
  register('buy_diving_upgrade','Buy and install one equipment upgrade at Marrow Harbor with earned game currency.',{type:'object',properties:{upgrade:{type:'string',enum:UPGRADES.map(u=>u.id)}},required:['upgrade'],additionalProperties:false},input=>{if(!inHarbor())throw Error('Boat must be at Marrow Harbor.');const r=buyUpgrade(save,input.upgrade);if(r.error)throw Error(r.error);save=r.save;syncEquipment(save.upgrades);persist();workshop();return {installed:input.upgrade,money:save.money};});
  register('hold_navigation_controls','Hold ordinary game controls for a bounded interval, then release them. The voyage must be running. forward/reverse/left/right steer the boat, swim, or walk in the workshop; up/down ascend or descend underwater; look_left/right/up/down turn the diver’s view; fire holds the visible F harpoon control.',{type:'object',properties:{controls:{type:'array',items:{type:'string',enum:['forward','reverse','left','right','up','down','look_left','look_right','look_up','look_down','fire']},minItems:1,maxItems:3},seconds:{type:'number',minimum:.1,maximum:5}},required:['controls','seconds'],additionalProperties:false},async input=>{
    const mapping:Record<string,string>={forward:'KeyW',reverse:'KeyS',left:'KeyA',right:'KeyD',up:'Space',down:'ShiftLeft',look_left:'ArrowLeft',look_right:'ArrowRight',look_up:'ArrowUp',look_down:'ArrowDown',fire:'KeyF'};
    if(mode==='title'||modal)throw Error('Start or resume the voyage first.');if(!Array.isArray(input.controls)||input.controls.length<1||input.controls.length>3||input.controls.some((c:string)=>!mapping[c])||!Number.isFinite(input.seconds)||input.seconds<.1||input.seconds>5)throw Error('Invalid controls or duration.');
    const pressed=input.controls.map((c:string)=>mapping[c]);pressed.forEach((k:string)=>keys.add(k));try{await new Promise(resolve=>setTimeout(resolve,input.seconds*1000));}finally{pressed.forEach((k:string)=>keys.delete(k));}updateHud();return voyageState();
  });
}
// Let the entry module finish evaluating before Babylon's lazy material chunks
// import it. Top-level await here deadlocks those chunks in the production build.
async function boot(){
ui.innerHTML='<div class="loading"><span>BELOW THE WAKE</span><p>Loading the Marrow Isles…</p><div class="loading-line"></div></div>';
try{await buildWorld((name,loaded)=>{ui.querySelector('p')!.textContent=`Loading artwork ${loaded+1}: ${name.replaceAll('-',' ')}…`;});refreshLoot();ui.innerHTML=titleHtml(save);registerTools();engine.setHardwareScalingLevel(save.settings.quality==='low'?1.75:Math.max(1,window.devicePixelRatio/1.5));engine.runRenderLoop(()=>render(Math.min(engine.getDeltaTime()/1000,.05)));}
catch(error){console.error(error);ui.innerHTML=`<div class="loading"><h1>The harbor could not load.</h1><p>${escapeHtml(error instanceof Error?error.message:'Reload to try again. All artwork is bundled with the game.')}</p><button onclick="location.reload()">Reload game</button></div>`;}
}
void boot();
window.addEventListener('resize',()=>engine.resize());window.addEventListener('pagehide',persist);

import './expeditions.css';
