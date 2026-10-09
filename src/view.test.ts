import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { HELM_EYE, helmCameraPose } from './view';

test('helm eye stays inside the window and below the raised roof',()=>{
  // Bounds of the fitted cabin after Blender export and the 2.4 boat scale.
  const sill=1.12*2.4,ceiling=1.85*2.4,front=1.44*2.4;
  assert.ok(HELM_EYE.y>sill+.5&&HELM_EYE.y<ceiling-.5);
  assert.ok(HELM_EYE.z<front-.5&&HELM_EYE.z>.52*2.4);
  assert.ok(HELM_EYE.x>.15&&HELM_EYE.x<.59*2.4-.5);
});
test('helm position and viewing axes follow the same bob, pitch, roll and yaw as the cabin',()=>{
  for(let i=0;i<100;i++){
    const rotation=Quaternion.FromEulerAngles(Math.sin(i*.8)*.015,i*.21,Math.sin(i)*.025);
    const world=Matrix.Compose(Vector3.One(),rotation,new Vector3(150,.1+Math.sin(i*1.25)*.12,-80));
    const pose=helmCameraPose(world),inverse=world.clone().invert();
    assert.ok(Vector3.Distance(Vector3.TransformCoordinates(pose.position,inverse),HELM_EYE)<.0001);
    const forward=pose.target.subtract(pose.position).normalize();
    assert.ok(Vector3.Distance(forward,Vector3.TransformNormal(Vector3.Forward(),world))<.0001);
    assert.ok(Math.abs(Vector3.Dot(forward,pose.up))<.0001);
  }
});
