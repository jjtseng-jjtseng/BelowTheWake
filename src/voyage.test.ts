import test from 'node:test';
import assert from 'node:assert/strict';
import {seaRoute,segmentClear,routeTrail} from './navigation';
import {newWeather,tickWeather,parseWeather,stormStrength,shelterAt} from './weather';
import {newSave,parseSave} from './state';
import {walkHarbor,harborStation} from './harbor';
import {Vector3} from '@babylonjs/core/Maths/math.vector';

test('gold trail takes a clear detour around islands instead of pointing through land',()=>{
  const obstacles=[{x:0,z:0,radius:20},{x:35,z:45,radius:12}];
  const route=seaRoute({x:0,z:-70},{x:0,z:90},obstacles);
  assert.ok(route.length>2);assert.deepEqual(route[0],{x:0,z:-70});assert.deepEqual(route.at(-1),{x:0,z:90});
  for(let i=1;i<route.length;i++)assert.ok(segmentClear(route[i-1],route[i],obstacles));
  const trail=routeTrail(route);assert.ok(trail.length>=8);assert.ok(trail.every(p=>obstacles.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>=o.radius)));
});
test('island course ends at a reachable landing approach and short routes stay finite',()=>{
  const route=seaRoute({x:0,z:-70},{x:0,z:0},[{x:0,z:0,radius:20}]);
  assert.equal(route.at(-1)?.z,-22);assert.deepEqual(routeTrail([{x:0,z:0},{x:0,z:0}]),[]);
});
test('routes accept Babylon vectors and can leave an island clearance margin',()=>{
  const route=seaRoute(new Vector3(0,0,-25),{x:0,z:80},[{x:0,z:0,radius:30}]);
  assert.deepEqual(route[0],{x:0,z:-25});assert.ok(routeTrail(route).length>0);
  assert.ok(routeTrail(route).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
});
test('storms stay locked until level 4, warn first, and allow several clear minutes between events',()=>{
  const w={...newWeather(),remaining:0};assert.deepEqual(tickWeather(w,5,3,false),newWeather());
  const warning=tickWeather(w,1,4,false,()=>.5);assert.equal(warning.phase,'warning');assert.equal(warning.remaining,25);
  const storm=tickWeather(warning,25,4,false);assert.equal(storm.phase,'storm');assert.equal(storm.remaining,65);
  assert.equal(stormStrength({...storm,remaining:40}),1);assert.equal(stormStrength(storm),0);
  const clear=tickWeather(storm,65,4,false,()=>.5);assert.equal(clear.phase,'clear');assert.equal(clear.remaining,300);assert.equal(clear.cycle,1);
});
test('a new storm waits for combat to finish and island/harbor shelter protects the boat',()=>{
  const pending={...newWeather(),remaining:0};assert.equal(tickWeather(pending,1,8,true).phase,'clear');
  const warning={...pending,phase:'warning' as const};assert.equal(tickWeather(warning,1,8,true).phase,'warning');
  assert.equal(shelterAt({x:0,z:-100},{x:0,z:-110},[]),true);
  assert.equal(shelterAt({x:35,z:0},{x:0,z:-110},[{x:0,z:0,size:6}]),true);
  assert.equal(shelterAt({x:100,z:0},{x:0,z:-110},[{x:0,z:0,size:6}]),false);
});
test('old saves gain safe weather defaults; active storm countdown survives reload',()=>{
  const s=newSave();const {weather,...old}=s;assert.deepEqual(parseSave(JSON.stringify(old)).weather,newWeather());
  s.weather={phase:'storm',remaining:24,cycle:2,wind:1};assert.deepEqual(parseSave(JSON.stringify(s)).weather,s.weather);
  assert.deepEqual(parseWeather({phase:'storm',remaining:'bad'}),newWeather());
  assert.equal(parseWeather({...s.weather,remaining:999}).remaining,65);
});
test('workshop walking stays in the aisle and stations only interact from nearby',()=>{
  assert.equal(harborStation(0,-3.5)?.id,'exit');assert.equal(harborStation(-4,1.5)?.id,'equipment');assert.equal(harborStation(3.8,1.5)?.id,'cargo');assert.equal(harborStation(0,0),undefined);
  assert.deepEqual(walkHarbor(0,0,100,100),{x:5.8,z:1.8});
  assert.deepEqual(walkHarbor(0,0,-100,-100),{x:-5.8,z:-4.7});
});
