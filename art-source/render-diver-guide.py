import bpy
from pathlib import Path
from mathutils import Vector

base=Path(__file__).parent
bpy.ops.wm.open_mainfile(filepath=str(base/'diver.blend'))
arm=next(o for o in bpy.data.objects if o.type=='ARMATURE')
idle=bpy.data.actions['Idle']
arm.animation_data.action=idle
arm.animation_data.action_slot=idle.slots[0]
bpy.context.scene.frame_set(10)
bpy.context.view_layer.update()
center=Vector((0,.08,.8))
bpy.ops.object.camera_add(location=(2,-4,2.05))
cam=bpy.context.object
cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=2.0
bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(2,-3,4))
light=bpy.context.object;light.data.energy=800;light.data.size=4
s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=32
s.render.resolution_x=384;s.render.resolution_y=384;s.render.resolution_percentage=100
s.render.film_transparent=True
s.world=bpy.data.worlds.new('guide light');s.world.use_nodes=True
s.world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.6,.65,1)
s.world.node_tree.nodes['Background'].inputs[1].default_value=.7
s.view_settings.view_transform='Standard'
s.render.filepath=str(base.parent/'public/thumbnails/diver.png')
bpy.ops.render.render(write_still=True)
