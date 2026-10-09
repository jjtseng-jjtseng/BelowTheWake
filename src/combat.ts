import type { SeaBoss } from './data';
export type AttackPhase='circle'|'windup'|'charge'|'exposed';
export interface Encounter {id:string;hp:number;phase:AttackPhase;clock:number;x:number;z:number;angle:number;targetX:number;targetZ:number;fromX:number;fromZ:number;hit:boolean}
export const HARPOON_RELOAD=1.1, HARPOON_RANGE=90;
export function createEncounter(b:SeaBoss):Encounter {return {id:b.id,hp:b.hp,phase:'circle',clock:0,x:b.x,z:b.z,angle:0,targetX:b.x,targetZ:b.z,fromX:b.x,fromZ:b.z,hit:false};}
function segmentDistance(px:number,pz:number,ax:number,az:number,bx:number,bz:number){const dx=bx-ax,dz=bz-az,u=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(px-ax-u*dx,pz-az-u*dz);}
export function tickEncounter(previous:Encounter,b:SeaBoss,dt:number,boatX:number,boatZ:number):{encounter:Encounter;damage:number}{
  const e={...previous};e.clock+=dt;let damage=0;
  if(e.phase==='circle'){
    e.angle+=dt*.65;e.x=boatX+Math.sin(e.angle)*32;e.z=boatZ+Math.cos(e.angle)*32;
    if(e.clock>=4){e.phase='windup';e.clock=0;e.targetX=boatX;e.targetZ=boatZ;e.fromX=e.x;e.fromZ=e.z;e.hit=false;}
  }else if(e.phase==='windup'){
    // The target locks now: the player has more than two seconds to steer away.
    if(e.clock>=2.6){e.phase='charge';e.clock=0;}
  }else if(e.phase==='charge'){
    const oldX=e.x,oldZ=e.z,u=Math.min(1,e.clock/.85);
    e.x=e.fromX+(e.targetX-e.fromX)*u;e.z=e.fromZ+(e.targetZ-e.fromZ)*u;
    const hit=b.kind==='shark'?segmentDistance(boatX,boatZ,oldX,oldZ,e.x,e.z)<8:e.clock>=.7&&Math.hypot(boatX-e.targetX,boatZ-e.targetZ)<15;
    if(hit&&!e.hit){damage=b.damage;e.hit=true;}
    if(u>=1){e.phase='exposed';e.clock=0;}
  }else if(e.clock>=4){e.phase='circle';e.clock=0;}
  return {encounter:e,damage};
}
export function harpoonAim(x:number,z:number,heading:number,e:Encounter){
  const dx=e.x-x,dz=e.z-z,distance=Math.hypot(dx,dz),angle=Math.atan2(Math.sin(Math.atan2(dx,dz)-heading),Math.cos(Math.atan2(dx,dz)-heading));
  // The swivel tracks the one active guardian independently of boat steering.
  // A valid lock works beside/behind the boat as well as directly at the bow.
  const inRange=distance<=HARPOON_RANGE;
  return {distance,angle,inRange,aligned:inRange,bearing:distance<.001?heading:Math.atan2(dx,dz)};
}
export function hitHarpoon(e:Encounter){return {...e,hp:Math.max(0,e.hp-(e.phase==='exposed'?30:15))};}
