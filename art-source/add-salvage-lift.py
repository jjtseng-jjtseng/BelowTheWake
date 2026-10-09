import bpy,math
from pathlib import Path
base=Path(__file__).parent;models=base.parent/'public/models'
bpy.ops.wm.open_mainfile(filepath=str(base/'deck-crane.blend'))
mat=bpy.data.materials.get('cream')
for i in range(15,26):
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,location=(0,4.42,3.31-i*.17),major_radius=.105,minor_radius=.027,rotation=(math.pi/2,0,0) if i%2 else (math.pi/2,math.pi/2,0));o=bpy.context.object;o.name='lift_chain_%02d'%i;o.scale.y=1.35;o.data.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'deck-crane.blend'))
bpy.ops.export_scene.gltf(filepath=str(models/'deck-crane.glb'),export_format='GLB',export_animations=False)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,c):
    m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85;return m
canvas=mat('mustard lift canvas',(.8,.42,.1));rope=mat('navy lifting straps',(.025,.12,.17))
bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=.65,location=(0,0,0));o=bpy.context.object;o.name='inflated_salvage_lift_bag';o.scale=(.9,.9,1.4);o.data.materials.append(canvas)
for x in [-.3,.3]:
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,location=(x,0,-.65),major_radius=.12,minor_radius=.025,rotation=(math.pi/2,0,0));bpy.context.object.name='lift_bag_eye';bpy.context.object.data.materials.append(rope)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.025,depth=1.4,location=(x,0,-1.32));bpy.context.object.name='lift_bag_sling';bpy.context.object.data.materials.append(rope)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'lift-bag.blend'))
bpy.ops.export_scene.gltf(filepath=str(models/'lift-bag.glb'),export_format='GLB',export_animations=False)
