import { SITES, type Site } from './data';
export interface SwimPoint {x:number;y:number;z:number}
// Matches the Blender cabin: a roomy entrance above the original stern deck.
export function cabinOrigin(s:Site):SwimPoint {
  const z=-3.4*s.scale;
  return {x:s.x+z*Math.sin(s.angle),y:-s.depth+3.6*s.scale+.2,z:s.z+z*Math.cos(s.angle)};
}
export function cabinPoint(s:Site,x:number,y:number,z:number):SwimPoint {
  const p=cabinOrigin(s),c=Math.cos(s.angle),a=Math.sin(s.angle);
  return {x:p.x+x*c+z*a,y:p.y+y,z:p.z+z*c-x*a};
}
export function cabinLocal(s:Site,p:SwimPoint):SwimPoint {
  const o=cabinOrigin(s),x=p.x-o.x,z=p.z-o.z,c=Math.cos(s.angle),a=Math.sin(s.angle);
  return {x:x*c-z*a,y:p.y-o.y,z:z*c+x*a};
}
export function insideCabin(s:Site,p:SwimPoint){const v=cabinLocal(s,p);return Math.abs(v.x)<2.8&&v.z> -2.55&&v.z<2.55&&v.y>.3&&v.y<3.9;}
export function cabinDoor(s:Site){return cabinPoint(s,0,1.8,2.75);}
export function nearCabinDoor(p:SwimPoint,sites:Site[]=SITES){return sites.find(s=>{const v=cabinLocal(s,p);return Math.abs(v.x)<1.6&&v.z>2.3&&v.z<5.3&&v.y>.4&&v.y<3.7;});}
// Never allow the swim camera to go through the cabin roof or walls.
export function cabinCamera(p:SwimPoint,desired:SwimPoint,sites:Site[]=SITES):SwimPoint {
  const s=sites.find(s=>insideCabin(s,p));if(!s)return desired;
  const v=cabinLocal(s,desired);
  return cabinPoint(s,Math.max(-2.4,Math.min(2.4,v.x)),Math.max(.65,Math.min(3.5,v.y)),Math.max(-2.2,Math.min(2.2,v.z)));
}
