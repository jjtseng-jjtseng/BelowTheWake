import { Engine, Scene, Vector3, Color3, Color4, HemisphericLight, DirectionalLight, UniversalCamera, MeshBuilder, StandardMaterial, TransformNode, SceneLoader, AssetContainer, ShaderMaterial, Effect, PBRMaterial, SpotLight, Mesh, AnimationGroup, Ray } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { SITES, ISLANDS, BOSSES, LOOT, lootPosition, type UpgradeId } from './data';
import { level } from './progression';
import type { Save } from './state';
import type { Encounter } from './combat';
import { helmCameraPose } from './view';
import { loadWithTimeout } from './loading';
import { ROOM_Z } from './harbor';
import { cabinOrigin, cabinCamera } from './cabins';
export const canvas=document.querySelector<HTMLCanvasElement>('#sea')!;
export const engine=new Engine(canvas,true,{stencil:true,antialias:true,powerPreference:'high-performance'});
export const scene=new Scene(engine);scene.fogMode=Scene.FOGMODE_EXP2;scene.collisionsEnabled=true;
const sky=new HemisphericLight('sky',new Vector3(.2,1,.3),scene);sky.groundColor=new Color3(.24,.43,.4);
const sun=new DirectionalLight('sun',new Vector3(-.6,-1,.4),scene);sun.diffuse=new Color3(1,.94,.8);
export const camera=new UniversalCamera('captain',new Vector3(30,18,-138),scene);camera.minZ=.08;camera.maxZ=800;camera.fov=.9;camera.inputs.clear();scene.activeCamera=camera;
const lamp=new SpotLight('dive lamp',Vector3.Zero(),new Vector3(0,0,1),Math.PI*.6,2,scene);lamp.range=28;lamp.diffuse=new Color3(.9,1,.9);
export const boat=new TransformNode('your boat',scene);
export const swimmer=MeshBuilder.CreateSphere('swimmer collider',{diameter:1,segments:6},scene);swimmer.isVisible=false;swimmer.ellipsoid.set(.38,.55,.38);
const cache=new Map<string,AssetContainer>();
let reportLoading:(name:string,loaded:number)=>void=()=>{};
export const lootRoots=new Map<string,TransformNode>();
const cabins=new Map<string,{door:TransformNode;chain:TransformNode;open:boolean}>();
export function syncCabins(opened:string[]){for(const [id,c]of cabins){c.open=opened.includes(id);c.chain.setEnabled(!c.open);}}
export function cabinPresentation(){return [...cabins].map(([id,c])=>({id,open:c.open,doorAngle:c.door.rotation.y}));}
const fish:{root:TransformNode;center:Vector3;phase:number;radius:number}[]=[];
const buoys:TransformNode[]=[];
const siteGroups=new Map<string,TransformNode>(),islandGroups=new Map<string,TransformNode>();
const discoveryBuoys=new Map<string,{buoy:TransformNode;line:Mesh}>();
const islandCaches=new Map<string,TransformNode>(),bossRoots=new Map<string,TransformNode>();
const bossAnimations=new Map<string,string>(),trophies:TransformNode[]=[];
let harpoon:TransformNode,boltTemplate:TransformNode;
const bolts:{root:TransformNode;from:Vector3;to:Vector3;elapsed:number}[]=[];
export function syncDiscoveries(s:Save){
  const rank=level(s);
  for(const site of SITES){siteGroups.get(site.id)?.setEnabled((site.level||1)<=rank||s.explored.includes(site.id));const b=discoveryBuoys.get(site.id);if(b){b.buoy.setEnabled(s.explored.includes(site.id));b.line.setEnabled(s.explored.includes(site.id));}}
  for(const island of ISLANDS){islandGroups.get(island.id)?.setEnabled(island.level<=rank);islandCaches.get(island.id)?.setEnabled(!s.islands.includes(island.id)&&island.reward>0);}
  for(const boss of BOSSES)bossRoots.get(boss.id)?.setEnabled(boss.level<=rank&&!s.defeated.includes(boss.id));
  trophies.forEach((r,i)=>r.setEnabled(s.defeated.includes(BOSSES[i].id)));
}
export function fireHarpoonVisual(from:Vector3,to:Vector3){
  const root=boltTemplate.clone('fired harpoon',null)!;root.setEnabled(true);root.position.copyFrom(from);root.rotation.y=Math.atan2(to.x-from.x,to.z-from.z);
  bolts.push({root,from:from.clone(),to:to.clone(),elapsed:0});
}
export function aimHarpoon(bearing:number,heading:number){
  harpoon.rotation.y=bearing-heading;
}
export function harpoonMuzzle(){
  // Use the rotated launcher, including the boat's bob and roll, rather than
  // launching every projectile from the old fixed forward point.
  return Vector3.TransformCoordinates(new Vector3(0,1.05,1.55),harpoon.computeWorldMatrix(true));
}
export function updateSeaMonsters(t:number,e:Encounter|null){
  for(const boss of BOSSES){const root=bossRoots.get(boss.id);if(!root)continue;
    const active=e?.id===boss.id;
    const x=active?e.x:boss.x+Math.sin(t*.25)*15,z=active?e.z:boss.z+Math.cos(t*.25)*15;
    root.position.set(x,boss.kind==='shark'?(active&&['charge','exposed'].includes(e.phase)?.5:-1.3):-2,z);
    root.rotation.y=active?Math.atan2(e.targetX-e.x,e.targetZ-e.z):t*.25;
    const phase=active?e.phase:'circle',clip=boss.kind==='shark'?'Swim':phase==='charge'?'Att':phase==='exposed'?'Pok':'Idl';
    if(bossAnimations.get(boss.id)!==clip){for(const child of root.getChildren() as TransformNode[]){const animations=child.metadata?.animations as AnimationGroup[]|undefined;if(animations){animations.forEach(a=>a.stop());(animations.find(a=>a.name.includes(clip))||animations[0])?.start(true,phase==='windup'?1.7:1);}}bossAnimations.set(boss.id,clip);}
  }
}

let ocean:Mesh;
let diver:TransformNode,captain:TransformNode,helm:TransformNode,crane:TransformNode,sonar:TransformNode,locker:TransformNode,liftBag:TransformNode,deckCargo:TransformNode;
let currentAnimation='',liftUntil=0,worldTime=0;
let workshopRoom:TransformNode,walker:TransformNode,merchant:TransformNode;
let walkingAnimation='',harborActive=false;
const rain:TransformNode[]=[];
export function setHarborRoom(active:boolean){harborActive=active;workshopRoom.setEnabled(active);walker.setEnabled(active);merchant.setEnabled(active);camera.maxZ=active?60:800;}
export function updateHarborPlayer(x:number,z:number,yaw:number,moving:boolean){
  walker.position.set(x,.02,ROOM_Z+z);walker.rotation.y=yaw;
  const clip=moving?'Walk':'Idle';
  if(clip!==walkingAnimation){const groups=walker.metadata.animations as AnimationGroup[];groups.forEach(a=>a.stop());groups.find(a=>a.name.endsWith('-'+clip))?.start(true);walkingAnimation=clip;}
  camera.position.set(x*.16,10.8,ROOM_Z-12.8);camera.setTarget(new Vector3(0,.3,ROOM_Z+.5));camera.fov=.85;
}
const risingCargo:{root:TransformNode;from:Vector3;start:number;duration:number}[]=[];
const physicalGear=['air','cutter','suit','bag','fins','deep'];
export function visibleEquipment(upgrades:UpgradeId[]){return upgrades.map(id=>({id,on:id==='lift'?'boat crane and chain':id==='sonar'?'roof aerial and helm display':id==='bag'?'diver sling and deck locker':'diver rig'}));}
export function animateLift(id:string){
  liftUntil=performance.now()+4200;
  const source=lootRoots.get(id);if(!source)return;
  const root=source.clone('rising salvage '+id,null)!;root.setEnabled(true);root.getChildMeshes().forEach(m=>m.checkCollisions=false);
  const bag=liftBag.clone('deployed lift bag',root)!;bag.position.set(0,2.5,0);bag.setEnabled(true);
  risingCargo.push({root,from:root.position.clone(),start:worldTime,duration:Math.max(6,-root.position.y/2.8)});
}
export function presentationState(){return {harborActive,walkingAnimation,walkerPosition:walker?{x:walker.position.x,z:walker.position.z-ROOM_Z}:null,diverVisible:diver?.isEnabled(),animation:currentAnimation,playingAnimations:(diver?.metadata.animations as AnimationGroup[]||[]).filter(a=>a.isPlaying).map(a=>a.name),craneVisible:crane?.isEnabled(),sonarVisible:sonar?.isEnabled(),lockerVisible:locker?.isEnabled(),diverGear:diver?.getChildMeshes().filter(m=>m.isEnabled(false)&&physicalGear.some(id=>m.name.includes('-'+id+'_'))).map(m=>m.name),lifting:risingCargo.length,buoys:[...discoveryBuoys].filter(([,b])=>b.buoy.isEnabled()).map(([id])=>id),visibleIslands:[...islandGroups].filter(([,r])=>r.isEnabled()).map(([id])=>id),visibleWrecks:[...siteGroups].filter(([,r])=>r.isEnabled()).map(([id])=>id),harpoonVisible:harpoon?.isEnabled(),monsterAnimations:[...bossRoots].filter(([,r])=>r.isEnabled()).map(([id,r])=>({id,animations:r.getChildren().flatMap(n=>(n.metadata?.animations as AnimationGroup[]||[]).filter(a=>a.isPlaying).map(a=>a.name))}))};}
export function safeDiveCamera(desired:Vector3){
  const adjusted=cabinCamera(swimmer.position,desired);desired=new Vector3(adjusted.x,adjusted.y,adjusted.z);
  const delta=desired.subtract(swimmer.position),length=delta.length();
  const hit=scene.pickWithRay(new Ray(swimmer.position,delta.normalize(),length),m=>m.checkCollisions&&m.isEnabled()&&m.isVisible);
  const position=hit?.hit?swimmer.position.add(delta.scale(Math.max(.65,hit.distance-.3))):desired;
  position.y=Math.min(-.15,Math.max(floorHeight(position.x,position.z)+.55,position.y));return position;
}
export function updateFittingView(t:number,heading:number,id:UpgradeId){
  const boatPart=['lift','sonar'].includes(id);
  const local=new Vector3(0,2.03,-3.75),c=Math.cos(heading),s=Math.sin(heading);
  diver.setEnabled(true);captain.setEnabled(false);
  if(boatPart)diver.position.copyFrom(boat.position.add(new Vector3(local.x*c+local.z*s,local.y,-local.x*s+local.z*c)));
  else diver.position.set(-2,.99,-121); // Kenney pier's planked deck: -2 + .9 * 3.3 = .97 m.
  diver.rotation.set(0,boatPart?heading+Math.PI:(['air','deep'].includes(id)?Math.PI:0),0);
  const groups=diver.metadata.animations as AnimationGroup[];if(currentAnimation!=='Idle'){groups.forEach(a=>a.stop());groups.find(a=>a.name.endsWith('-Idle'))?.start(true);currentAnimation='Idle';}
  const angle=(boatPart?heading+1.9:.25)+Math.sin(t*.18)*.3,distance=boatPart?13:4.4;
  const target=boatPart?boat.position.add(new Vector3(0,2.8,-.5)):diver.position.add(new Vector3(0,.35,0));
  camera.position.copyFrom(target.add(new Vector3(Math.sin(angle)*distance,boatPart?5:.65,Math.cos(angle)*distance)));camera.setTarget(target);camera.fov=.85;
}
export function floorHeight(x:number,z:number){return Math.max(-56,...SITES.map(s=>-s.depth-3*Math.pow(Math.hypot(x-s.x,z-s.z)/32,2)));}
async function model(name:string,p:Vector3,scale:number,parent?:TransformNode){
  let container=cache.get(name);if(!container){reportLoading(name,cache.size);container=await loadWithTimeout(name,()=>SceneLoader.LoadAssetContainerAsync('/models/',name+'.glb',scene));cache.set(name,container);}
  const r=container.instantiateModelsToScene(n=>`${name}-${n}`,false,{doNotInstantiate:true});
  const root=new TransformNode(name,scene);for(const n of r.rootNodes)n.parent=root;
  root.scaling.setAll(scale);root.position.copyFrom(p);if(parent)root.parent=parent;
  for(const m of root.getChildMeshes()){m.isPickable=false;if(m.material instanceof PBRMaterial){m.material.metallic=0;m.material.roughness=.85;}}
  for(const a of r.animationGroups)a.stop();root.metadata={animations:r.animationGroups};return root;
}
export function syncEquipment(upgrades:UpgradeId[],cargo:string[]=[]){
  if(!diver)return;
  for(const m of diver.getChildMeshes())for(const id of physicalGear)if(m.name.includes('-'+id+'_'))m.setEnabled(upgrades.includes(id as UpgradeId));
  crane.setEnabled(upgrades.includes('lift'));sonar.setEnabled(upgrades.includes('sonar'));locker.setEnabled(upgrades.includes('bag'));
  for(const n of helm.getDescendants())if(n.name.includes('sonar_'))n.setEnabled(upgrades.includes('sonar'));
  deckCargo.setEnabled(cargo.some(id=>LOOT.find(l=>l.id===id)?.requirement==='lift'));
}
export function updatePlayer(diving:boolean,thirdPerson:boolean,helmView:boolean,yaw:number,pitch:number,moving:boolean,recovering:boolean,t:number){
  if(!diver)return;
  // Hide the rig when wreck geometry pushes the camera inside its silhouette.
  // The near camera then gives a clear view rather than a screen-filling head.
  diver.setEnabled(diving&&thirdPerson&&Vector3.Distance(camera.position,swimmer.position)>2.6);captain.setEnabled(!diving&&!helmView&&!harborActive);
  diver.position.copyFrom(swimmer.position);diver.position.y-=moving?.25:.85;
  diver.rotation.set(moving?Math.PI/2+pitch:0,yaw,0);
  const animation=recovering?'Recover':moving?'Swim':'Idle';
  if(animation!==currentAnimation){const groups=diver.metadata.animations as AnimationGroup[];groups.forEach(a=>a.stop());groups.find(a=>a.name.endsWith('-'+animation))?.start(true,animation==='Swim'?1.25:1);currentAnimation=animation;}
  const wheel=helm.getDescendants().find(n=>n.name.includes('helm_wheel_pivot')) as TransformNode|undefined;if(wheel){wheel.rotationQuaternion=null;wheel.rotation.z=Math.sin(boat.rotation.y)*.35;}
  const raised=performance.now()<liftUntil?Math.sin((1-(liftUntil-performance.now())/4200)*Math.PI)*1.5:0;
  for(const n of crane.getChildMeshes())if(n.name.includes('chain_')||n.name.endsWith('lift_Form69')||n.name.endsWith('lift_Form62')){
    const home=n.metadata?.homeY??n.position.y;n.metadata={...n.metadata,homeY:home};n.position.y=home+raised;
    if(n.name.includes('chain_'))n.setEnabled(home+raised<3.45);
  }
  sonar.rotation.y=t*.5;
}
function waterSetup(){
  Effect.ShadersStore['oceanVertexShader']=`precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;uniform float time;uniform float storm;varying vec3 pos;void main(){vec3 p=position;p.y+=(sin(p.x*.065+p.z*.035+time*.8)*.17+sin(p.x*.04-p.z*.09-time*.65)*.12)*(1.+storm*2.5);pos=p;gl_Position=worldViewProjection*vec4(p,1.);}`;
  Effect.ShadersStore['oceanFragmentShader']=`precision highp float;varying vec3 pos;uniform float time;uniform float storm;uniform vec3 eye;float waves(vec2 p){return sin(p.x*.22+p.y*.12+time*.7)*.45+sin(p.x*.09-p.y*.18-time*.8)*.3+sin(p.x*.47+p.y*.31+time*.6)*.12;}void main(){float w=waves(pos.xz);vec3 n=normalize(vec3(-cos(pos.x*.22+pos.z*.12+time*.7)*.13,1.,-cos(pos.x*.09-pos.z*.18-time*.8)*.1));vec3 v=normalize(eye-pos);float f=pow(1.-max(0.,dot(n,v)),3.);float s=pow(max(0.,dot(reflect(normalize(vec3(-.6,-1.,.4)),n),v)),100.);vec3 c=mix(vec3(.035,.44,.51),vec3(.18,.65,.66),w*.3+.35);c=mix(c,vec3(.56,.79,.86),f*.65);c+=vec3(1.,.91,.7)*s*.5;c=mix(c,c*vec3(.4,.52,.62),storm*.8);gl_FragColor=vec4(c,.94);}`;
  ocean=MeshBuilder.CreateGround('living ocean',{width:1000,height:1000,subdivisions:150},scene);
  ocean.material=new ShaderMaterial('ocean',scene,{vertex:'ocean',fragment:'ocean'},{attributes:['position'],uniforms:['worldViewProjection','time','eye','storm'],needAlphaBlending:true});ocean.alphaIndex=5;
  const sand=MeshBuilder.CreateGround('rolling seabed',{width:1000,height:1200,subdivisions:150,updatable:true},scene);
  const verts=sand.getVerticesData('position')!;for(let i=0;i<verts.length;i+=3)verts[i+1]=floorHeight(verts[i],verts[i+2]);sand.updateVerticesData('position',verts);sand.createNormals(true);
  const mat=new StandardMaterial('sand',scene);mat.diffuseColor=new Color3(.61,.63,.43);mat.specularColor=Color3.Black();sand.material=mat;sand.checkCollisions=false;
}
export async function buildWorld(onProgress:(name:string,loaded:number)=>void=()=>{}){
  reportLoading=onProgress;
  waterSetup();await model('boat-player',Vector3.Zero(),2.4,boat);
  harpoon=await model('harpoon-launcher',new Vector3(-1.05,4.99,2.5),1,boat);
  boltTemplate=await model('harpoon-bolt',Vector3.Zero(),1);boltTemplate.setEnabled(false);
  for(let i=0;i<BOSSES.length;i++){const r=await model('chest',new Vector3(-.8+i*.8,2.5,-3.15),.55,boat);r.setEnabled(false);trophies.push(r);}
  helm=await model('tug-helm',Vector3.Zero(),2.4,boat);
  crane=await model('deck-crane',new Vector3(1.05,2.05,-2.1),.65,boat);
  sonar=await model('roof-sonar',new Vector3(-.55,4.99,-.3),1,boat);
  locker=await model('deck-locker',new Vector3(-1,2.02,-2.4),.9,boat);
  deckCargo=await model('cannon',new Vector3(-.9,2.05,-2.55),.65,boat);deckCargo.setEnabled(false);
  liftBag=await model('lift-bag',Vector3.Zero(),.8);liftBag.setEnabled(false);
  diver=await model('diver',Vector3.Zero(),1.15);
  captain=await model('diver',new Vector3(0,1.96,2.1),.8,boat);
  for(const m of captain.getChildMeshes())if(m.name.includes('-base_')||physicalGear.some(id=>m.name.includes('-'+id+'_')))m.setEnabled(false);
  (captain.metadata.animations as AnimationGroup[]).find(a=>a.name.endsWith('-Idle'))?.start(true);
  diver.setEnabled(false);
  workshopRoom=await model('harbor-workshop',new Vector3(0,0,ROOM_Z),1);workshopRoom.setEnabled(false);
  walker=await model('diver',new Vector3(0,0,ROOM_Z-3),1.15);
  merchant=await model('diver',new Vector3(4.1,0,ROOM_Z+4.3),1.15);merchant.rotation.y=Math.PI;
  for(const person of [walker,merchant]){for(const m of person.getChildMeshes())if(m.name.includes('-base_')||physicalGear.some(id=>m.name.includes('-'+id+'_')))m.setEnabled(false);person.setEnabled(false);}
  (merchant.metadata.animations as AnimationGroup[]).find(a=>a.name.endsWith('-Idle'))?.start(true);
  for(let i=0;i<2;i++){const r=await model('storm-rain',Vector3.Zero(),1);r.setEnabled(false);rain.push(r);}
  for(const s of SITES){
    const group=new TransformNode('charted wreck '+s.id,scene);siteGroups.set(s.id,group);
    const wreck=await model('ship-wreck-cabined',new Vector3(s.x,-s.depth,s.z),s.scale);wreck.rotation.y=s.angle;wreck.parent=group;
    for(const m of wreck.getChildMeshes())m.checkCollisions=!m.name.includes('sail')&&!m.name.includes('grass');
    const origin=cabinOrigin(s),room=await model('wreck-cabin',new Vector3(origin.x,origin.y,origin.z),1,group);room.rotation.y=s.angle;
    for(const m of room.getChildMeshes())m.checkCollisions=m.name.includes('collision_');
    const door=await model('wreck-cabin-door',new Vector3(-1.2,0,2.7),1,room);for(const m of door.getChildMeshes())m.checkCollisions=true;
    const chain=await model('wreck-cabin-chain',Vector3.Zero(),1,room);cabins.set(s.id,{door,chain,open:false});
    const buoy=await model('buoy-flag',new Vector3(s.x,0,s.z),1.6);buoys.push(buoy);buoy.setEnabled(false);
    const line=MeshBuilder.CreateLines('buoy descent line',{points:[new Vector3(s.x,-.3,s.z),new Vector3(s.x,-s.depth+1,s.z)]},scene);line.color=new Color3(.57,.69,.58);line.setEnabled(false);discoveryBuoys.set(s.id,{buoy,line});
    for(let i=0;i<9;i++){const a=i*2.399,x=s.x+Math.cos(a)*(17+i),z=s.z+Math.sin(a)*(17+i);const rock=await model(i%2?'rocks-a':'rocks-b',new Vector3(x,floorHeight(x,z)-.3,z),1.1+(i%3)*.4);rock.rotation.y=a;rock.parent=group;}
    for(let i=0;i<6;i++){const f=await model('angelfish',Vector3.Zero(),.12+(i%3)*.015);f.parent=group;fish.push({root:f,center:new Vector3(s.x,-s.depth+7+(i%3)*2,s.z),phase:i*1.047+SITES.indexOf(s),radius:14+(i%3)*3});}
  }
  for(const l of LOOT){const r=await model(l.model,new Vector3(...lootPosition(l)),l.cabin?(l.model==='bottle'?.65:.8):l.model==='bottle'?2.3:l.model==='cannon'?1.1:1);r.rotation.y=SITES.find(s=>s.id===l.site)!.angle+.3;r.parent=siteGroups.get(l.site)!;lootRoots.set(l.id,r);}
  // All representational scenery comes from the original matching nautical kits.
  for(const island of ISLANDS){
    const {x:cx,z:cz,size}=island,group=new TransformNode('charted island '+island.id,scene);islandGroups.set(island.id,group);
    await model('patch-sand',new Vector3(cx,-.3,cz),size,group);
    for(let i=0;i<3;i++){const a=i*2.399;const r=await model(i%2?'rocks-a':'rocks-c',new Vector3(cx+Math.cos(a)*8,.3,cz+Math.sin(a)*7),1.6+i*.35,group);r.rotation.y=a;}
    for(let i=0;i<4;i++){const a=i*1.7;const p=await model('palm-detailed-bend',new Vector3(cx+Math.cos(a)*11,1,cz+Math.sin(a)*10),2+i*.2,group);p.rotation.y=a;}
    const cache=await model('chest',new Vector3(cx,.8,cz-15),1.5,group);islandCaches.set(island.id,cache);
    await model('flag-pennant',new Vector3(cx+3,1,cz-13),2,group);
  }
  for(const boss of BOSSES){
    const root=new TransformNode('sea guardian '+boss.id,scene);bossRoots.set(boss.id,root);
    if(boss.kind==='shark')await model('sea-shark',Vector3.Zero(),.9,root);
    else for(let i=0;i<4;i++){const a=i*Math.PI/2,r=await model('sea-tentacle',new Vector3(Math.sin(a)*7,-1,Math.cos(a)*7),boss.id==='old-king'?1.05:.8,root);r.rotation.y=a;}
    root.setEnabled(false);
  }
  for(let i=0;i<3;i++)await model('structure-platform-dock',new Vector3(i*7-1,-2,-121),3.3);
  await model('structure',new Vector3(13,.8,-127),2.5);await model('structure-roof',new Vector3(13,.8,-127),2.5);
  await model('barrel',new Vector3(10,.9,-120),1.2);await model('crate',new Vector3(7,.9,-120),1.2);
  const flag=await model('flag-pennant',new Vector3(2,.9,-122),2.2);flag.rotation.y=.5;
}
export function renderWorld(t:number,heading:number,diving:boolean,helmView=false,storm=0){
  const elapsed=Math.min(.05,Math.max(0,t-worldTime));worldTime=t;
  for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.elapsed+=elapsed;const u=Math.min(1,b.elapsed/.32);b.root.position.copyFrom(Vector3.Lerp(b.from,b.to,u));if(u>=1){b.root.dispose();bolts.splice(i,1);}}

  for(let i=risingCargo.length-1;i>=0;i--){const cargo=risingCargo[i],progress=(t-cargo.start)/cargo.duration;if(progress>=1){cargo.root.dispose();risingCargo.splice(i,1);}else{cargo.root.position.copyFrom(cargo.from);cargo.root.position.y=cargo.from.y+(1-cargo.from.y)*progress;cargo.root.rotation.y+=.002;}}
  boat.position.y=.1+Math.sin(t*1.25)*(.12+storm*.25);boat.rotation.set(Math.sin(t*.8)*(.015+storm*.015),heading,Math.sin(t)*(.025+storm*.015));
  if(helmView){
    const pose=helmCameraPose(boat.computeWorldMatrix(true));
    camera.position.copyFrom(pose.position);camera.upVector.copyFrom(pose.up);
    camera.setTarget(pose.target);camera.fov=1.05;
  }
  buoys.forEach((b,i)=>{b.position.y=Math.sin(t*1.1+i)*.12;b.rotation.z=Math.sin(t+i)*.04;});
  fish.forEach(f=>{const a=t*.17+f.phase;f.root.position.set(f.center.x+Math.cos(a)*f.radius,f.center.y+Math.sin(t*.6+f.phase)*.6,f.center.z+Math.sin(a)*f.radius*.7);f.root.rotation.set(0,-a+Math.PI*.5,Math.sin(t*4+f.phase)*.05);});
  ocean.setEnabled(!diving&&!harborActive);rain.forEach((r,i)=>{r.setEnabled(!diving&&!harborActive&&storm>.4);r.position.set(boat.position.x,2-((t*18)%25)+i*25,boat.position.z);});lamp.intensity=diving?.12:0;lamp.position.copyFrom(camera.position);lamp.direction.copyFrom(camera.getForwardRay().direction);
  for(const c of cabins.values())c.door.rotation.y+=( (c.open?-Math.PI/2:0)-c.door.rotation.y)*.12;
  const deep=diving?Math.min(1,-swimmer.position.y/55):0;
  scene.fogColor=diving?Color3.Lerp(new Color3(.03,.36,.39),new Color3(.025,.12,.22),deep):harborActive?new Color3(.06,.15,.18):Color3.Lerp(new Color3(.58,.81,.88),new Color3(.13,.21,.27),storm);
  scene.fogDensity=harborActive?0:diving?.021+deep*.01:.0018+storm*.004;scene.clearColor=new Color4(scene.fogColor.r,scene.fogColor.g,scene.fogColor.b,1);
  sky.intensity=diving?.72-deep*.25:harborActive?1.55:1.8-storm*.8;sun.intensity=diving?.32:harborActive?1.6:2.3-storm*1.9;
  (ocean.material as ShaderMaterial).setFloat('time',t).setFloat('storm',storm).setVector3('eye',camera.position);scene.render();
}
