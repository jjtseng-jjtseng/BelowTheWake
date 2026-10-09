"""Deliberate Blender set dressing using downloaded Kenney CC0 furniture.
Coordinates below are game x, height, forward; Blender conversion is explicit.
No representational meshes are generated at runtime in the game.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector
base=Path(__file__).parent
models=base.parent/'public/models'
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,c,metal=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=.8;p.inputs['Metallic'].default_value=metal
    return m
wood=mat('weathered oak',(.25,.13,.065));lightwood=mat('honey oak',(.42,.25,.11));navy=mat('harbor blue',(.055,.18,.22));ivory=mat('salt ivory',(.8,.77,.61));brass=mat('aged brass',(.6,.37,.1),.5);teal=mat('sea glass',(.12,.38,.37))
def cube(name,p,size,m):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(-p[0],-p[2],p[1]));o=bpy.context.object;o.name=name;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
    b=o.modifiers.new('worn edges','BEVEL');b.width=.035;b.segments=1;bpy.ops.object.modifier_apply(modifier=b.name)
    return o
def prop(name,p,size,angle=0,material=None,source=None):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(source or base/'furniture-originals'/(name+'.glb')))
    imported=set(bpy.data.objects)-before;meshes=[o for o in imported if o.type=='MESH']
    if name=='wheel-original':
        for o in imported:
            if o.parent not in imported:o.rotation_euler.x+=math.pi/2
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box];lo=Vector(tuple(min(v[i] for v in points) for i in range(3)));hi=Vector(tuple(max(v[i] for v in points) for i in range(3)));extent=hi-lo
    bpy.ops.object.empty_add();root=bpy.context.object;root.name='Kenney '+name
    for o in imported:
        if o.parent not in imported:o.parent=root
    root.scale=(size[0]/max(.01,extent.x),size[2]/max(.01,extent.y),size[1]/max(.01,extent.z))
    root.location=(-((lo.x+hi.x)/2)*root.scale.x,-((lo.y+hi.y)/2)*root.scale.y,-lo.z*root.scale.z)
    # Apply normalization before positioning and rotating the furniture set.
    bpy.context.view_layer.update()
    for o in meshes:
        mw=o.matrix_world.copy();o.parent=None;o.matrix_world=mw
        if material:o.data.materials.clear();o.data.materials.append(material)
    for o in imported:
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.objects.remove(root,do_unlink=True)
    bpy.ops.object.empty_add();r=bpy.context.object;r.name=name+' placement'
    for o in meshes:o.parent=r
    r.rotation_euler.z=-angle;r.location=(-p[0],-p[2],p[1]);return meshes
# A three-sided cutaway room keeps the roof and near wall out of the camera.
for i in range(28):cube('oak floor plank %02d'%i,(-6.75+i*.5,-.12,0),(.48,.24,10.8),lightwood if i%3 else wood)
for x in [-7,7]:
    for i in range(13):cube('sidewall oak board',(x,1.4,-4.8+i*.8),(.22,2.8,.77),wood)
    cube('blue side skirting',(x-.03*(1 if x>0 else -1),.35,0),(.25,.65,10.5),navy)
for i in range(18):cube('back wall oak board',(-6.8+i*.8,1.6,5.3),(.77,3.2,.22),wood)
cube('back blue wainscot',(0,.45,5.1),(14,.9,.22),navy)
for x in [-6.8,-2.3,2.3,6.8]:cube('back structural post',(x,1.8,5.05),(.22,3.6,.3),lightwood)
cube('back beam',(0,3.4,5),(14,.25,.35),lightwood)
# Window apertures are framed sea-glass in this cutaway, with brass sill.
for x in [-4.3,0,4.3]:
    cube('sea glass window',(x,2.1,5), (2.2,1.3,.12),teal)
    for xx in [-1.15,0,1.15]:cube('window frame',(x+xx,2.1,4.9),(.09,1.45,.12),ivory)
    for y in [1.4,2.8]:cube('window frame',(x,y,4.9),(2.4,.1,.14),ivory)
prop('table',(-4,0,3.1),(3.9,1.15,1.6),material=lightwood)
prop('table',(4,0,3.1),(3.9,1.15,1.6),material=lightwood)
prop('bookcaseOpen',(-6,0,4.4),(1.6,2.7,.65),material=navy)
prop('bookcaseOpen',(6,0,4.4),(1.6,2.7,.65),material=navy)
prop('bench',(-5.5,0,-2.5),(2.6,.8,.8),angle=math.pi/2,material=lightwood)
prop('chair',(4.2,0,4.6),(.8,1.3,.8),material=lightwood)
prop('lampSquareTable',(-5.4,1.15,3.2),(.55,.85,.55),material=brass)
prop('lampSquareTable',(5.4,1.15,3.2),(.55,.85,.55),material=brass)
prop('rugRectangle',(0,.01,-3.5),(2.2,.03,2),material=teal)
prop('coatRackStanding',(-6,0,-.7),(.8,2.1,.8),material=brass)
for name,p,size in [('crate',(5.8,0,-2.6),(1.1,1.1,1.1)),('barrel',(5.6,0,-.8),(.85,1.2,.85)),('chest',(3.6,1.15,3),(1.15,.7,.8)),('bottle',(-5.9,1.45,4.3),(.25,.7,.25)),('tool-shovel',(-4.3,1.15,3.1),(.3,.25,1.1)),('lift-bag',(-3.3,1.15,3.2),(.8,1,.8))]:
    prop(name,p,size,source=models/(name+'.glb'))
# A deliberately modelled wooden ship wheel matches the boat's Blender helm.
bpy.ops.mesh.primitive_torus_add(major_radius=.55,minor_radius=.055,major_segments=24,minor_segments=6,location=(0,-4.83,2.2),rotation=(math.pi/2,0,0));bpy.context.object.name='workshop wooden helm wheel';bpy.context.object.data.materials.append(lightwood)
for i in range(8):
    a=i*math.tau/8
    spoke=cube('wheel spoke',(math.sin(a)*.32,2.2+math.cos(a)*.32,4.83),(.055,.8,.09),brass);spoke.rotation_euler.y=-a
bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.12,location=(0,-4.8,2.2));bpy.context.object.data.materials.append(brass)
cube('door threshold',(0,.04,-5),(2.3,.08,.65),brass)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'harbor-workshop.blend'))
bpy.ops.export_scene.gltf(filepath=str(models/'harbor-workshop.glb'),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False)
print('HARBOR WORKSHOP BUILT')
