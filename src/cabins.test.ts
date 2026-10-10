import test from 'node:test';
import assert from 'node:assert/strict';
import { SITES, LOOT, lootPosition, UPGRADES } from './data';
import { cabinPoint, cabinLocal, insideCabin, nearCabinDoor, cabinCamera } from './cabins';
import { newSave, bankDive, parseSave, sellCargo, salvageError } from './state';
import { recommendedCourse, resumeCourse, recoverableWreck, wreckFinished } from './course';

test('every wreck has individually positioned cabin finds inside its physical room',()=>{
  for(const s of SITES){const loot=LOOT.filter(l=>l.site===s.id&&l.cabin);assert.ok(loot.length>=3);for(const l of loot){const [x,y,z]=lootPosition(l);assert.ok(insideCabin(s,{x,y,z}),l.id);}}
});
test('rotated cabin doorway and camera bounds match the Blender room',()=>{
  for(const s of SITES){const p=cabinPoint(s,.3,1.8,4);assert.equal(nearCabinDoor(p)?.id,s.id);assert.equal(insideCabin(s,p),false);const v=cabinLocal(s,cabinPoint(s,1,2,-1));assert.ok(Math.abs(v.x-1)<1e-6&&Math.abs(v.z+1)<1e-6);const inside=cabinPoint(s,0,2,0),clipped=cabinLocal(s,cabinCamera(inside,cabinPoint(s,9,7,-9)));assert.ok(clipped.x<=2.40001&&clipped.y<=3.50001&&clipped.z>=-2.20001);}
});
test('cutters open the room separately from collecting or banking treasure',()=>{
  let s=newSave();const original=structuredClone(s);assert.match(salvageError(s,'finch-locker',[])!,/cutter/);s.upgrades=['cutter'];assert.match(salvageError(s,'finch-locker',[])!,/door/);s.openedCabins=['finch'];assert.equal(salvageError(s,'finch-locker',[]),null);assert.deepEqual(s.collected,original.collected);assert.deepEqual(s.cargo,original.cargo);
  s.upgrades=[];assert.equal(salvageError(s,'finch-locker',[]),null);s=bankDive(s,['finch-locker']);assert.ok(!s.collected.includes('finch-porcelain'));assert.equal(salvageError(s,'finch-locker',[]),'Already recovered.');
});
test('legacy recovered interior salvage opens its cabin without resetting money or progress',()=>{
  const legacy:any=bankDive(newSave(),['finch-porcelain']);delete legacy.openedCabins;delete legacy.course;legacy.money=190;const s=parseSave(JSON.stringify(legacy));assert.deepEqual(s.openedCabins,['finch']);assert.equal(s.money,190);assert.deepEqual(s.collected,legacy.collected);assert.deepEqual(parseSave(JSON.stringify(s)),s);assert.deepEqual(parseSave(JSON.stringify({...s,openedCabins:['fake','finch','finch'],course:'fake'})).openedCabins,['finch']);
});
test('finished wreck courses advance after reload and after selling; cargo guides to harbor',()=>{
  let s=bankDive(newSave(),LOOT.filter(l=>l.site==='finch').map(l=>l.id));s.upgrades=UPGRADES.map(u=>u.id);s.course='finch';assert.equal(wreckFinished(s,'finch'),true);assert.equal(resumeCourse(s,{x:-38,z:-22}),'harbor');s=sellCargo(s).save;const next=recommendedCourse(s,{x:0,z:-110});assert.notEqual(next,'finch');assert.notEqual(next,'harbor');assert.equal(recoverableWreck(s,next),true);assert.equal(resumeCourse(s,{x:-38,z:-22}),next);
});
test('recommended course ignores wrecks that only contain inaccessible equipment-gated finds',()=>{
  let s=bankDive(newSave(),LOOT.filter(l=>l.site==='finch'&&!l.cabin&&l.requirement!=='lift').map(l=>l.id));s=sellCargo(s).save;assert.equal(recoverableWreck(s,'finch'),false);assert.notEqual(recommendedCourse(s,{x:-38,z:-22}),'finch');s.upgrades=['cutter'];assert.equal(recoverableWreck(s,'finch'),true);assert.equal(recommendedCourse(s,{x:-38,z:-22}),'finch');
});
