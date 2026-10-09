"""Fit the downloaded Quaternius spear in Blender; build its nautical deck mount."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
base=Path(__file__).parent
game=base.parent
models=game/'public/models'
# Reuse only the helper definitions, without rebuilding any existing game art.
helpers=(base/'build-fitted-assets.py').read_text().split('# An original downloaded')[0]
exec(helpers)
report={}
for name in ['sea-shark','sea-tentacle']:
    reset();bpy.ops.import_scene.gltf(filepath=str(models/(name+'.glb')))
    bpy.context.view_layer.update()
    objects=[o for o in bpy.data.objects if o.type=='MESH']
    pts=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    report[name]={'min':[min(p[i] for p in pts) for i in range(3)],'max':[max(p[i] for p in pts) for i in range(3)],'animations':[a.name for a in bpy.data.actions]}
    render(name,objects)
reset();bpy.ops.import_scene.gltf(filepath=str(base/'harpoon-spear-original.glb'))
bpy.ops.object.select_all(action='DESELECT')
meshes=[o for o in bpy.data.objects if o.type=='MESH']
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join()
spear=bpy.context.object
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
pts=[spear.matrix_world@Vector(c) for c in spear.bound_box]
lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)])
axis=max(range(3),key=lambda i:hi[i]-lo[i]);forward=Vector([1 if i==axis else 0 for i in range(3)])
center=(lo+hi)/2
for v in spear.data.vertices:v.co=(v.co-center)*(2.4/(hi[axis]-lo[axis]))
spear.rotation_mode='QUATERNION';spear.rotation_quaternion=forward.rotation_difference(Vector((0,-1,0)))
bpy.ops.object.transform_apply(rotation=True,scale=True)
spear.name='Quaternius_harpoon_bolt'
export('harpoon-bolt');render('harpoon-bolt',[spear])
P=palette();spear.location=(0,-.35,1.05)
cube('navy_pedestal',(0,.15,.3),(.6,.7,.6),P['navy'])
cyl('brass_swivel',(0,.15,.65),.32,.12,P['brass'])
cube('launcher_bed',(0,-.1,.85),(.3,1.4,.16),P['wood'])
for x in [-.24,.24]:
    cube('brass_rail',(x,-.15,1.02),(.065,1.6,.11),P['brass'])
torus('rope_reel',(.36,.42,.85),.2,.06,P['cream'],(0,math.pi/2,0))
export('harpoon-launcher');render('harpoon-launcher',[o for o in bpy.data.objects if o.type=='MESH'])
(base/'sea-asset-inspection.json').write_text(json.dumps(report,indent=2))
