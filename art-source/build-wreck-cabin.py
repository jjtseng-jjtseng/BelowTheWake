"""Blender-fitted stern cabin for the licensed Kenney wreck.
Room coordinates are game x,height,z. The hull, loose treasure and furniture
remain the existing online Kenney assets; this fitted shell is authored here.
"""
import bpy, math
from pathlib import Path
base=Path(__file__).parent
models=base.parent/'public/models'
bpy.ops.wm.read_factory_settings(use_empty=True)
# Clear the original stern's raised decorations in Blender so the room has a
# real interior. Keep the online hull, mast, sails and the rest of the wreck.
bpy.ops.import_scene.gltf(filepath=str(models/'ship-wreck.glb'))
bpy.context.view_layer.update()
import bmesh
from mathutils import Vector
for o in list(bpy.context.scene.objects):
    if o.type!='MESH':continue
    points=[o.matrix_world@Vector(c) for c in o.bound_box]
    if o.name!='ship-wreck' and sum(p.y for p in points)/8>1.5:
        bpy.data.objects.remove(o,do_unlink=True);continue
    if o.name=='ship-wreck':
        bm=bmesh.new();bm.from_mesh(o.data)
        faces=[f for f in bm.faces if sum((o.matrix_world@v.co).y for v in f.verts)/len(f.verts)>1.5 and any((o.matrix_world@v.co).z>3.58 for v in f.verts)]
        bmesh.ops.delete(bm,geom=faces,context='FACES');bm.to_mesh(o.data);bm.free()
bpy.ops.export_scene.gltf(filepath=str(models/'ship-wreck-cabined.glb'),export_format='GLB',export_yup=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'ship-wreck-cabined.blend'))
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,c,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.85;p.inputs['Metallic'].default_value=metal
    return m
oak=mat('waterlogged oak',(.19,.125,.07));plank=mat('salt worn timber',(.31,.23,.13));teal=mat('faded captain blue',(.045,.19,.20));rust=mat('rusted iron',(.25,.16,.09),.4);brass=mat('tarnished brass',(.53,.37,.13),.45)
glass=mat('clouded sea glass',(.12,.34,.32));glass.diffuse_color=(.12,.34,.32,.24);glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.24;glass.surface_render_method='DITHERED'
shell=[];door=[];chains=[]
def cube(name,p,size,m,bucket):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(-p[0],-p[2],p[1]));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    b=o.modifiers.new('soft worn edge','BEVEL');b.width=.025;b.segments=1;bpy.ops.object.modifier_apply(modifier=b.name);bucket.append(o);return o
# Planked floor and roof; collision names form actual swimmable boundaries.
cube('collision_floor',(0,-.13,0),(6,.26,5.6),oak,shell)
cube('collision_roof',(0,4.15,0),(6.3,.3,5.9),oak,shell)
for i in range(12):cube('floor plank %02d'%i,(-2.75+i*.5,.015,0),(.47,.04,5.5),plank if i%3 else oak,shell)
for x in [-2.9,2.9]:
    cube('collision_side lower',(x,.7,0),(.24,1.4,5.6),teal,shell)
    cube('collision_side upper',(x,3.6,0),(.24,.8,5.6),teal,shell)
    for z in [-2.6,0,2.6]:cube('collision_window upright',(x,2.3,z),(.24,1.8,.36),teal,shell)
    for z in [-1.3,1.3]:cube('collision_sealed window',(x,2.3,z),(.04,1.8,2.24),glass,shell)
    for y in [1.4,3.2]:cube('oak window sill',(x,y,0),(.32,.12,5.6),oak,shell)
    for z in [-2.7,0,2.7]:cube('oak frame',(x,2,z),(.32,4.2,.2),oak,shell)
cube('collision_back',(0,2,-2.7),(6,4,.24),teal,shell)
for x in [-2.05,2.05]:cube('collision_door jamb',(x,2,2.7),(1.7,4,.24),teal,shell)
cube('collision_lintel',(0,3.85,2.7),(2.5,.3,.25),oak,shell)
for x in [-1.3,1.3]:cube('door frame',(x,1.85,2.76),(.14,3.7,.3),oak,shell)
# A broad doorway (2.4 m) allows both swimmer and third-person camera through.
# Door local origin is its left hinge; game animates the exported pivot.
for i in range(6):cube('collision_door plank',(i*.4+.2,1.8,0),(.38,3.55,.16),plank,door)
for y in [.6,3]:cube('iron door strap',(1.2,y,.12),(2.35,.13,.08),rust,door)
cube('brass pull',(2.1,1.8,.19),(.1,.42,.13),brass,door)
for i in range(13):
    x=-1.1+i*.18;y=1.5+i*.055
    bpy.ops.mesh.primitive_torus_add(major_radius=.12,minor_radius=.027,major_segments=10,minor_segments=5,location=(-x,-2.91,y),rotation=(math.pi/2 if i%2 else math.pi/3,0,0));o=bpy.context.object;o.name='rusted chain link';o.data.materials.append(rust);chains.append(o)
cube('padlock',(0,1.75,2.98),(.25,.34,.1),rust,chains)
# Original Kenney desk as set dressing at the back; clear central swim aisle.
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(base/'furniture-originals/table.glb'))
imported=set(bpy.data.objects)-before
from mathutils import Vector
bpy.context.view_layer.update();meshes=[o for o in imported if o.type=='MESH'];points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];lo=Vector(tuple(min(v[i] for v in points) for i in range(3)));hi=Vector(tuple(max(v[i] for v in points) for i in range(3)))
for o in meshes:
    mw=o.matrix_world.copy();o.parent=None;o.matrix_world=mw;bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);o.select_set(False)
    for v in o.data.vertices:
        q=o.matrix_world@v.co;v.co=((q.x-(lo.x+hi.x)/2)*1.7/(hi.x-lo.x), (q.y-(lo.y+hi.y)/2)*.7/(hi.y-lo.y)+2, (q.z-lo.z)*.75/(hi.z-lo.z))
    o.location=(0,0,0);o.data.materials.clear();o.data.materials.append(oak);o.name='Kenney captain desk';shell.append(o)
for o in imported:
    if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
def export(name,objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(models/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_animations=False)
export('wreck-cabin',shell);export('wreck-cabin-door',door);export('wreck-cabin-chain',chains)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'wreck-cabin.blend'))
