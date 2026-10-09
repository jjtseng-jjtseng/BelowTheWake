export interface Point {x:number;z:number}
export interface Obstacle extends Point {radius:number}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export function segmentClear(a:Point,b:Point,obstacles:Obstacle[]){
  const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;
  return obstacles.every(o=>{const u=l?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/l)):0;return Math.hypot(a.x+dx*u-o.x,a.z+dz*u-o.z)>=o.radius-.01;});
}
// A small visibility graph gives the guide a safe route around each charted island.
// The polygon sits outside the collision circle, including its straight chords.
export function seaRoute(start:Point,destination:Point,obstacles:Obstacle[]):Point[]{
  start={x:start.x,z:start.z};
  obstacles=obstacles.map(o=>({...o,radius:Math.min(o.radius,Math.max(.1,distance(start,o)-.1))}));
  let goal={x:destination.x,z:destination.z};
  for(const o of obstacles)if(distance(goal,o)<o.radius+1){const d=distance(start,o)||1;goal={x:o.x+(start.x-o.x)/d*(o.radius+2),z:o.z+(start.z-o.z)/d*(o.radius+2)};}
  if(segmentClear(start,goal,obstacles))return [{...start},goal];
  const nodes:Point[]=[{...start},goal];
  for(const o of obstacles)for(let i=0;i<16;i++){const a=i*Math.PI/8,r=(o.radius+1)/Math.cos(Math.PI/16);const p={x:o.x+Math.sin(a)*r,z:o.z+Math.cos(a)*r};if(obstacles.every(v=>v===o||distance(p,v)>v.radius))nodes.push(p);}
  const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set<number>();costs[0]=0;
  for(let i=0;i<nodes.length;i++){
    let current=-1;for(let j=0;j<nodes.length;j++)if(!visited.has(j)&&(current<0||costs[j]<costs[current]))current=j;
    if(current<0||!Number.isFinite(costs[current]))break;if(current===1)break;visited.add(current);
    for(let j=0;j<nodes.length;j++)if(!visited.has(j)&&segmentClear(nodes[current],nodes[j],obstacles)){const cost=costs[current]+distance(nodes[current],nodes[j]);if(cost<costs[j]){costs[j]=cost;previous[j]=current;}}
  }
  if(!Number.isFinite(costs[1]))return [{...start}]; // Never draw a misleading path through land.
  const route:Point[]=[];for(let at=1;at>=0;at=previous[at])route.unshift(nodes[at]);return route;
}
export function routeTrail(route:Point[],spacing=12,range=110):Point[]{
  const trail:Point[]=[];let total=0,next=spacing;
  for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],length=distance(a,b);while(next<=total+length&&next<=range){const u=(next-total)/length;trail.push({x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u});next+=spacing;}total+=length;}
  return trail;
}
