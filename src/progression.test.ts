import test from 'node:test';
import assert from 'node:assert/strict';
import { newSave, parseSave, bankDive, sellCargo, buyUpgrade, depthRating, salvageError } from './state';
import { SITES, ISLANDS, BOSSES, LOOT } from './data';
import { experience, level, availableSites, availableIslands, availableBosses, exploreSite, discoverIsland, defeatBoss, destinationAvailable } from './progression';
import { createEncounter, tickEncounter, harpoonAim, hitHarpoon } from './combat';
test('new voyage starts with one wreck, one island, no bosses',()=>{const s=newSave();assert.equal(level(s),1);assert.deepEqual(availableSites(s).map(v=>v.id),['finch']);assert.equal(availableIslands(s).length,1);assert.equal(availableBosses(s).length,0);assert.equal(destinationAvailable(s,'sovereign'),false);});
test('discoveries and secured salvage unlock actual areas, repeated visits never farm XP',()=>{let s=exploreSite(newSave(),'finch');assert.equal(experience(s),60);assert.equal(exploreSite(s,'finch'),s);s=bankDive(s,['finch-copper']);assert.equal(level(s),2);assert.ok(availableSites(s).some(v=>v.id==='pearl'));const xp=experience(s);s=sellCargo(s).save;assert.equal(experience(s),xp);assert.equal(experience(bankDive(s,['finch-copper'])),xp);assert.equal(exploreSite(s,'sovereign'),s);});
test('island and boss rewards bank once and respect level gates',()=>{let s=newSave();assert.equal(discoverIsland(s,'palm'),s);assert.equal(defeatBoss(s,'reef-jaw'),s);s=bankDive(s,['finch-copper','finch-coins','finch-porcelain','finch-log','finch-locker']);s=discoverIsland(s,'palm');const money=s.money;assert.equal(discoverIsland(s,'palm').money,money);s=defeatBoss(s,'reef-jaw');assert.equal(s.money,money+350);assert.equal(defeatBoss(s,'reef-jaw'),s);});
test('every level and the ending are reachable with earned upgrades and no mandatory combat',()=>{
  let s=newSave();
  for(let i=0;i<20;i++){
    for(const island of availableIslands(s))s=discoverIsland(s,island.id);
    for(const site of availableSites(s)){
      if(site.depth>depthRating(s))continue;
      s=exploreSite(s,site.id);
      // Return and sell each valid find; never grant locked cargo or equipment.
      for(const find of LOOT.filter(l=>l.site===site.id)){
        if(salvageError(s,find.id,[])===null)s=sellCargo(bankDive(s,[find.id])).save;
      }
    }
    for(const id of ['cutter','lift','suit','deep'] as const){const r=buyUpgrade(s,id);if(!r.error)s=r.save;}
  }
  assert.equal(level(s),10);assert.equal(availableSites(s).length,9);assert.equal(availableIslands(s).length,8);
  assert.equal(s.defeated.length,0);assert.equal(s.completed,true);assert.equal(s.collected.length,LOOT.length);
});
test('legacy saves acquire buoys and new achievements are validated and persisted',()=>{const old={...newSave(),collected:['finch-copper'],explored:undefined,islands:['palm','palm','fake'],defeated:['reef-jaw','fake']};const s=parseSave(JSON.stringify(old));assert.deepEqual(s.explored,['finch']);assert.deepEqual(s.islands,['palm']);assert.deepEqual(s.defeated,['reef-jaw']);assert.deepEqual(parseSave(JSON.stringify(s)),s);});
test('chart contents and milestones are unique and inside the expanded ocean',()=>{const ids=[...SITES,...ISLANDS,...BOSSES].map(v=>v.id);assert.equal(new Set(ids).size,ids.length);assert.deepEqual(BOSSES.map(v=>v.level),[3,6,9]);for(const p of [...SITES,...ISLANDS,...BOSSES])assert.ok(Math.abs(p.x)<300&&p.z<490&&p.z> -180);});
test('harpoon locks beside and behind a steering boat but still respects range and damage windows',()=>{
  const e=createEncounter(BOSSES[0]);
  for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI*6]){
    for(const [x,z] of [[0,40],[40,0],[0,-40],[-40,0]]){
      const aim=harpoonAim(0,0,heading,{...e,x,z});assert.equal(aim.aligned,true);assert.equal(aim.inRange,true);
      assert.ok(Math.abs(Math.sin(aim.bearing)*40-x)<.001);assert.ok(Math.abs(Math.cos(aim.bearing)*40-z)<.001);
    }
  }
  assert.equal(harpoonAim(0,0,0,{...e,x:0,z:90}).inRange,true);
  assert.equal(harpoonAim(0,0,0,{...e,x:0,z:90.01}).aligned,false);
  assert.equal(harpoonAim(0,0,1.2,{...e,x:0,z:0}).bearing,1.2);
  assert.equal(hitHarpoon(e).hp,e.hp-15);assert.equal(hitHarpoon({...e,phase:'exposed'}).hp,e.hp-30);
});
test('telegraphed kraken slam locks its target, can be dodged, and hits at most once',()=>{const boss=BOSSES[1];let e=createEncounter(boss);e.phase='windup';e.clock=2.59;e.targetX=0;e.targetZ=0;let r=tickEncounter(e,boss,.02,0,0);assert.equal(r.encounter.phase,'charge');e=r.encounter;let total=0;for(let i=0;i<100;i++){r=tickEncounter(e,boss,.01,0,0);total+=r.damage;e=r.encounter;}assert.equal(total,boss.damage);assert.equal(e.phase,'exposed');e={...createEncounter(boss),phase:'charge',targetX:0,targetZ:0};total=0;for(let i=0;i<100;i++){r=tickEncounter(e,boss,.01,30,30);total+=r.damage;e=r.encounter;}assert.equal(total,0);});
