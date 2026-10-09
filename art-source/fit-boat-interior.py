import bpy,bmesh,math
from pathlib import Path
from mathutils import Matrix,Vector
base=Path(__file__).parent;models=base.parent/'public/models'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(models/'boat-tug-a.glb'))
o=next(o for o in bpy.data.objects if o.type=='MESH')
# Face the original bow along the game's forward axis, then open the cabin
# windows. Original hull, rails, roof, funnel and palette UVs are preserved.
for v in o.data.vertices:v.co=Matrix.Rotation(math.pi,4,'Z')@v.co
bm=bmesh.new();bm.from_mesh(o.data);remove=[]
for f in bm.faces:
    c=f.calc_center_median();zs=[v.co.z for v in f.verts]
    if abs(c.x)<.63 and -1.49<c.y<-.44 and .81<c.z<1.495 and max(zs)-min(zs)>.07:remove.append(f)
bmesh.ops.delete(bm,geom=remove,context='FACES');bm.to_mesh(o.data);bm.free();o.name='Kenney_tug_fitted_windows'
def mat(name,c):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;return m
cream=mat('cabin ivory',(.78,.8,.7));wood=mat('cabin frame',(.16,.22,.21))
def cube(n,loc,dim,m):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);a=bpy.context.object;a.name=n;a.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);a.data.materials.append(m)
for x in [-.59,.59]:
    cube('cabin_lower_side',(x,-.99,.96),(.045,.96,.28),cream)
    for y in [-1.43,-.52]:cube('cabin_window_post',(x,y,1.25),(.055,.055,.5),cream)
    cube('cabin_window_sill',(x,-.98,1.105),(.06,.98,.035),wood)
cube('cabin_front_lower',(0,-1.44,.96),(1.18,.04,.28),cream)
cube('cabin_front_sill',(0,-1.44,1.105),(1.18,.055,.035),wood)
cube('cabin_front_mullion',(0,-1.44,1.3),(.035,.045,.4),cream)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'boat-player.blend'))
bpy.ops.export_scene.gltf(filepath=str(models/'boat-player.glb'),export_format='GLB',export_animations=False)
# Refine the earlier Blender interior to the cabin, instead of a generic
# full-size cockpit. Its steering wheel pivot stays independently animatable.
bpy.ops.wm.open_mainfile(filepath=str(base/'tug-helm.blend'))
tops=[o for o in bpy.context.scene.objects if o.parent is None]
bpy.ops.object.empty_add();root=bpy.context.object;root.name='fitted_helm_root';root.scale=(.75,.75,.75);root.location=(0,-1.1,.15)
for o in tops:o.parent=root
bpy.ops.wm.save_as_mainfile(filepath=str(base/'tug-helm-fitted.blend'))
bpy.ops.export_scene.gltf(filepath=str(models/'tug-helm.glb'),export_format='GLB',export_animations=False)
print('BOAT AND HELM FITTED')
