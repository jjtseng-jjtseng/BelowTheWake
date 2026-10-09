"""Blender-authored atmospheric rain curtain, kept outside the boat cabin."""
import bpy,random,math
from pathlib import Path
base=Path(__file__).parent
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(41);vertices=[];faces=[]
for i in range(210):
    a=random.random()*math.tau;r=8+random.random()*36;x=math.cos(a)*r;y=math.sin(a)*r;z=random.random()*25
    n=len(vertices);vertices.extend([(x-.025,y,z),(x+.025,y,z),(x+.22,y,z+1),(x+.17,y,z+1)]);faces.append((n,n+1,n+2,n+3))
mesh=bpy.data.meshes.new('rain streaks');mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new('Blender rain curtain',mesh);bpy.context.collection.objects.link(o)
m=bpy.data.materials.new('rain silver');m.use_nodes=True;m.diffuse_color=(.6,.8,.9,.3);p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.6,.8,.9,.3);p.inputs['Alpha'].default_value=.3;p.inputs['Emission Color'].default_value=(.18,.3,.4,1);p.inputs['Emission Strength'].default_value=.5;m.surface_render_method='DITHERED';o.data.materials.append(m)
bpy.ops.wm.save_as_mainfile(filepath=str(base/'storm-rain.blend'))
bpy.ops.export_scene.gltf(filepath=str(base.parent/'public/models/storm-rain.glb'),export_format='GLB',export_animations=False)
