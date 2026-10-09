"""Blender-only modelling, rig fitting and previews for Below the Wake.
Original meshes: Kenney tug, Quaternius Henry, Max Hancock crane.
All additional representational meshes are authored here in Blender.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Matrix
base=Path(__file__).parent; game=base.parent; models=game/'public/models'; thumbs=game/'public/thumbnails'; thumbs.mkdir(exist_ok=True)
def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,c,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=.72;return m
def palette():
    return {k:material(k,c) for k,c in {'navy':(.035,.14,.19),'brass':(.7,.42,.12),'cream':(.85,.8,.61),'teal':(.08,.45,.46),'rubber':(.025,.04,.05),'glass':(.13,.62,.67),'orange':(.85,.28,.085),'wood':(.22,.105,.055)}.items()}
def cube(name,p,size,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);be=o.modifiers.new('soft edges','BEVEL');be.width=min(size)*.15;be.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=be.name);return o
def cyl(name,p,r,depth,mat,rotation=(0,0,0),vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=p,rotation=rotation);o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o
def torus(name,p,major,minor,mat,rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,location=p,major_radius=major,minor_radius=minor,rotation=rot);o=bpy.context.object;o.name=name;o.data.materials.append(mat);return o
def pipe(name,points,r,mat):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=r;curve.bevel_resolution=1;sp=curve.splines.new('POLY');sp.points.add(len(points)-1)
    for pt,co in zip(sp.points,points):pt.co=(*co,1)
    o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(mat);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o
def export(name,animations=False):
    bpy.ops.wm.save_as_mainfile(filepath=str(base/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(models/(name+'.glb')),export_format='GLB',export_animations=animations,export_animation_mode='ACTIONS',export_force_sampling=True,export_anim_slide_to_zero=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
def render(name,objects,angle=(1,-2,1),padding=1.45):
    bpy.context.view_layer.update();pts=[o.matrix_world@Vector(c) for o in objects if o.type=='MESH' for c in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in pts) for i in range(3)));hi=Vector(tuple(max(p[i] for p in pts) for i in range(3)));center=(lo+hi)/2;size=(hi-lo).length
    oldhide={o:o.hide_render for o in bpy.context.scene.objects}
    for o in oldhide:
        if o.type=='MESH':o.hide_render=o not in objects
    bpy.ops.object.camera_add(location=center+Vector(angle).normalized()*size*2);cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=max(hi-lo)*padding;bpy.context.scene.camera=cam
    bpy.ops.object.light_add(type='AREA',location=center+Vector((1,-2,3))*size);light=bpy.context.object;light.data.energy=170*size**2;light.data.size=size*2
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.render.resolution_x=384;s.render.resolution_y=384;s.render.resolution_percentage=100;s.render.film_transparent=True;s.world=bpy.data.worlds.new('preview sky');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.6,.65,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.7;s.view_settings.view_transform='Standard';s.render.filepath=str(thumbs/(name+'.png'));bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam,do_unlink=True);bpy.data.objects.remove(light,do_unlink=True)
    for o,h in oldhide.items():o.hide_render=h
# An original downloaded, animated character, with Blender-fitted diving kit.
reset();bpy.ops.import_scene.gltf(filepath=str(base/'henry-original.glb'))
for o in list(bpy.data.objects):
    if o.name in ['Icosphere','Weapon_Lute']:bpy.data.objects.remove(o,do_unlink=True)
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE');body=next(o for o in bpy.data.objects if o.type=='MESH');body.name='Sailor_Henry';P=palette()
if arm.animation_data:
    for tr in list(arm.animation_data.nla_tracks):arm.animation_data.nla_tracks.remove(tr)
idle=next(a for a in bpy.data.actions if '|Idle|' in a.name);walk=next(a for a in bpy.data.actions if '|Walk|' in a.name);recover=next(a for a in bpy.data.actions if '|Punch|' in a.name);wave=next(a for a in bpy.data.actions if '|Wave|' in a.name)
keep=[idle,walk,recover,wave]
for a,n in zip(keep,['Idle','Walk','Recover','Wave']):a.name=n;a.use_fake_user=True
for a in list(bpy.data.actions):
    if a not in keep:bpy.data.actions.remove(a)
arm.animation_data.action=idle;bpy.context.scene.frame_set(0)
rest={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in arm.pose.bones}
def attach(o,bone):
    o.parent=arm;o.matrix_parent_inverse=arm.matrix_world.inverted();mod=o.modifiers.new('follows diver skeleton','ARMATURE');mod.object=arm;vg=o.vertex_groups.new(name=bone);vg.add(list(range(len(o.data.vertices))),1,'REPLACE');return o
gear={k:[] for k in ['base','air','cutter','suit','bag','fins','deep']}
def add(key,o,bone):gear[key].append(attach(o,bone));return o
add('base',cube('base_mask_frame',(0,-.142,1.205),(.38,.095,.155),P['rubber']),'Head')
add('base',cube('base_mask_lens',(0,-.198,1.21),(.31,.025,.11),P['glass']),'Head')
add('base',cyl('base_air_tank',(-.11,.38,.82),.11,.53,P['cream']),'Torso')
add('base',cube('base_harness',(0,.32,.75),(.42,.08,.4),P['navy']),'Torso')
add('base',pipe('base_regulator',[(0,-.16,1.1),(.27,-.05,1.05),(.3,.29,.92),(-.11,.38,1.1)],.025,P['rubber']),'Torso')
add('air',cyl('air_second_tank',(.14,.38,.82),.11,.53,P['orange']),'Torso')
add('air',cyl('air_valve',(.14,.38,1.12),.045,.08,P['brass']),'Torso')
for side,sign in [('L',1),('R',-1)]:
    x=sign*.168
    add('base',cube('base_boot_'+side,(x,.1,.055),(.22,.3,.12),P['rubber']),'Foot.'+side)
    fin=add('fins',cube('fins_blade_'+side,(x,-.13,.02),(.27,.62,.065),P['teal']),'Foot.'+side)
    add('fins',cube('fins_stripe_'+side,(x,-.28,.057),(.22,.08,.015),P['cream']),'Foot.'+side)
    add('suit',cube('suit_shoulder_'+side,(sign*.24,.14,.89),(.18,.28,.13),P['orange']),'UpperArm.'+side)
    add('suit',cube('suit_knee_'+side,(x,.0,.3),(.16,.1,.13),P['navy']),'LowerLeg.'+side)
add('cutter',cube('cutter_handle',(.28,-.005,.58),(.06,.08,.25),P['orange']),'Hips')
add('cutter',cube('cutter_blade',(.28,-.005,.4),(.045,.045,.19),P['cream']),'Hips')
add('bag',cube('bag_canvas_sling',(-.32,.16,.5),(.27,.32,.4),P['cream']),'Hips')
add('bag',cube('bag_flap',(-.32,.0,.64),(.29,.055,.15),P['navy']),'Hips')
add('suit',torus('suit_neck_ring',(0,.12,1.02),.2,.045,P['brass']),'Neck')
add('deep',cyl('deep_reserve_cylinder',(0,.5,.78),.15,.6,P['teal']),'Torso')
add('deep',pipe('deep_hose',[(-.05,-.17,1.1),(-.29,-.02,1.16),(-.38,.3,1.0),(-.1,.5,.99)],.04,P['brass']),'Torso')
add('deep',cube('deep_chest_regulator',(0,-.08,.88),(.24,.12,.2),P['brass']),'Torso')
# A Blender-authored swimming cycle, retaining the artist's online Idle/Walk/
# Recover/Wave clips. These are real skeleton animations, not a bobbing mesh.
swim=bpy.data.actions.new('Swim');swim.use_fake_user=True;arm.animation_data.action=swim
for frame in [0,10,20,30,40]:
    phase=frame/40*math.tau
    for b in arm.pose.bones:
        b.location=rest[b.name][0];b.rotation_mode='QUATERNION';b.rotation_quaternion=rest[b.name][1];b.scale=rest[b.name][2]
        if b.name in ['UpperLeg.L','UpperLeg.R','LowerLeg.L','LowerLeg.R','UpperArm.L','UpperArm.R','LowerArm.L','LowerArm.R']:
            side=1 if b.name.endswith('.L') else -1
            from mathutils import Quaternion
            if 'UpperLeg' in b.name:q=Quaternion((1,0,0),math.sin(phase)*.28*side)
            elif 'LowerLeg' in b.name:q=Quaternion((1,0,0),.18+max(0,math.sin(phase)*side)*.4)
            elif 'UpperArm' in b.name:q=Quaternion((0,0,1),side*(-.65+math.sin(phase)*.15))
            else:q=Quaternion((1,0,0),-.3+math.cos(phase)*.15)
            b.rotation_quaternion=rest[b.name][1]@q
        b.keyframe_insert('location',frame=frame);b.keyframe_insert('rotation_quaternion',frame=frame);b.keyframe_insert('scale',frame=frame)
arm.animation_data.action=idle;bpy.context.scene.frame_set(0);export('diver',True)
allmeshes=[o for o in bpy.data.objects if o.type=='MESH'];render('diver',allmeshes)
for key,objs in gear.items():
    if key!='base':render(key,objs)
# Adapt the downloaded crane's upper works into a deck-mounted salvage davit.
reset();bpy.ops.import_scene.gltf(filepath=str(base/'crane-original.glb'));P=palette()
keepnames=['Shape8','Shape8_1','Form53','Form50_3','Form50_5','Shape9','Form53_2','Shape10','Shape10_1','Shape10_2','Form50_6','Shape10_3','Group5 Shape10','Group5 Form63','Group5 Form66','Group5 Shape10_1','Group5 Shape10_2','Group5 Shape10_3','Shape10_4','Form62_1','Shape10_5','Shape10_6','Form62','Form69']
for o in list(bpy.data.objects):
    if o.type!='MESH' or o.name not in keepnames:bpy.data.objects.remove(o,do_unlink=True);continue
    # Bake source transforms, then scale the original crane to working boat size.
    world=o.matrix_world.copy()
    for v in o.data.vertices:v.co=(world@v.co-Vector((0,0,35)))*.085
    o.matrix_world=Matrix.Identity(4);o.data.materials.clear();o.data.materials.append(P['brass'] if 'Form' in o.name else P['navy'])
    o.name='lift_'+o.name.replace(' ','_')
cyl('lift_mount',(0,0,0),.7,.24,P['navy'])
# Explicit linked metal chain, authored in Blender beside the original cable/hook.
for i in range(15):
    link=torus('lift_chain_%02d'%i,(0,4.42,3.31-i*.17),.105,.027,P['cream'],(math.pi/2,0,0) if i%2 else (math.pi/2,math.pi/2,0));link.scale.y=1.35
export('deck-crane');render('lift',[o for o in bpy.data.objects if o.type=='MESH'],angle=(1,2,1),padding=1.3)
# Fit a warm timber helm inside the original downloaded tug's cabin. Front
# windows are open in the Kenney mesh; this interior uses its exact dimensions.
reset();P=palette()
# Coordinates are authored in Blender (Z up); glTF converts them to Y up.
cube('helm_console',(0,-.23,1.07),(1.06,.35,.52),P['wood'])
cube('helm_top',(0,-.23,1.34),(1.12,.4,.045),P['brass'])
cube('helm_floor',(0,.2,.81),(1.14,1.2,.04),P['wood'])
for i in range(7):cube('helm_plank_%d'%i,(-.48+i*.16,.2,.834),(.145,1.17,.008),P['cream'])
# Steering wheel pivot allows actual steering animation in the game.
bpy.ops.object.empty_add(location=(-.16,-.015,1.33));pivot=bpy.context.object;pivot.name='helm_wheel_pivot'
wheel=[]
wheel.append(torus('helm_wheel',(-.16,.045,1.33),.25,.035,P['wood'],(math.pi/2,0,0)))
wheel.append(cyl('helm_hub',(-.16,.045,1.33),.07,.1,P['brass'],(math.pi/2,0,0)))
for i in range(8):
    a=i*math.tau/8;x=-.16+math.sin(a)*.15;z=1.33+math.cos(a)*.15
    spoke=cube('helm_spoke_%d'%i,(x,.045,z),(.027,.04,.35),P['brass']);spoke.rotation_euler.y=a;wheel.append(spoke)
for o in wheel:mat=o.matrix_world.copy();o.parent=pivot;o.matrix_world=mat
for i in range(2):
    x=.26+i*.2;cyl('helm_gauge_%d'%i,(x,-.015,1.27),.085,.025,P['cream'],(math.pi/2,0,0));needle=cube('helm_needle_%d'%i,(x,.006,1.29),(.012,.01,.08),P['navy']);needle.rotation_euler.y=-.6
cube('helm_throttle_base',(.43,.27,1.17),(.15,.24,.09),P['navy'])
cyl('helm_throttle',(.43,.27,1.34),.018,.3,P['brass'],(.22,0,0));cube('helm_throttle_handle',(.43,.3,1.48),(.14,.055,.055),P['rubber'])
cube('sonar_display',(.36,-.17,1.53),(.34,.12,.25),P['navy']);cube('sonar_screen',(.36,-.101,1.53),(.28,.016,.19),P['teal']);torus('sonar_scope',(.36,-.084,1.53),.065,.006,P['cream'],(math.pi/2,0,0))
export('tug-helm');render('helm',[o for o in bpy.data.objects if o.type=='MESH'])
# A visible roof sonar aerial, and stowed cargo container, also Blender-authored.
reset();P=palette()
cyl('sonar_mast',(0,0,.55),.05,1.1,P['navy']);cube('sonar_radar_bar',(0,0,1.07),(1.15,.15,.14),P['cream']);cyl('sonar_mount',(0,0,.04),.22,.08,P['brass']);export('roof-sonar');render('sonar',[o for o in bpy.data.objects if o.type=='MESH'])
reset();P=palette();cube('bag_deck_locker',(0,0,.4),(1.2,.85,.8),P['cream']);cube('bag_deck_lid',(0,0,.84),(1.25,.9,.09),P['navy']);cube('bag_deck_latch',(0,-.46,.68),(.18,.05,.22),P['brass']);export('deck-locker');render('bag',[o for o in bpy.data.objects if o.type=='MESH'])
print('FITTED ASSETS COMPLETE')
