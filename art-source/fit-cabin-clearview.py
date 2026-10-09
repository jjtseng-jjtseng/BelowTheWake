"""Refit the existing Kenney tug in Blender for a readable first-person helm."""
import bpy, bmesh
from pathlib import Path

base = Path(__file__).parent
models = base.parent/'public/models'
bpy.ops.wm.open_mainfile(filepath=str(base/'boat-player.blend'))
boat = bpy.data.objects['Kenney_tug_fitted_windows']
bm = bmesh.new()
bm.from_mesh(boat.data)
# The original cabin top and roof underside occupy the same plane with
# different triangulation. Remove the redundant upward cabin cap, retaining
# the actual solid roof. Double-sided glTF rendering otherwise z-fights here.
caps = [f for f in bm.faces if f.normal.z > .99
        and all(abs(v.co.z-1.5) < .0001 for v in f.verts)
        and all(abs(v.co.x) < .61 for v in f.verts)]
assert len(caps) == 6, len(caps)
bmesh.ops.delete(bm, geom=caps, context='FACES_ONLY')
for v in bm.verts:
    if v.co.z >= 1.4999:
        v.co.z += .35
bm.normal_update()
bm.to_mesh(boat.data)
bm.free()
# Lengthen the existing Blender window posts and mullion to the raised roof.
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH' and ('cabin_window_post' in obj.name
                              or 'cabin_front_mullion' in obj.name):
        bpy.context.view_layer.update()
        inv = obj.matrix_world.inverted()
        for v in obj.data.vertices:
            p = obj.matrix_world @ v.co
            p.z += max(0, min(1, (p.z-1.1)/.4))*.35
            v.co = inv @ p
        obj.data.update()
bpy.ops.wm.save_as_mainfile(filepath=str(base/'boat-player-clearview.blend'))
bpy.ops.export_scene.gltf(filepath=str(models/'boat-player.glb'),
                         export_format='GLB', export_animations=False)
print('CABIN_CLEARVIEW: six overlapping cap faces removed; roof raised .35m')
