export const ROOM_Z=-800;
export const HARBOR_STATIONS=[
  {id:'equipment',x:-4,z:1.5,image:'wrench',name:'Equipment bench'},
  {id:'cargo',x:3.8,z:1.5,image:'coins',name:'Salvage counter'},
  {id:'exit',x:0,z:-4.5,image:'door-open',name:'Return to your boat'},
] as const;
export function harborStation(x:number,z:number){return HARBOR_STATIONS.find(s=>Math.hypot(s.x-x,s.z-z)<2.4);}
export function walkHarbor(x:number,z:number,dx:number,dz:number){
  // Keep the character in the clear aisle, in front of both solid counters.
  const nx=Math.max(-5.8,Math.min(5.8,x+dx)),nz=Math.max(-4.7,Math.min(3.2,z+dz));
  return {x:nx,z:Math.abs(nx)>2.5?Math.min(1.8,nz):nz};
}
