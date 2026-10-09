import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';

// Inside the Blender-fitted cabin, above the wheel and behind the windscreen.
export const HELM_EYE = new Vector3(.32, 3.6, 2);
export function helmCameraPose(boatWorld: Matrix) {
  return {
    position: Vector3.TransformCoordinates(HELM_EYE, boatWorld),
    target: Vector3.TransformCoordinates(HELM_EYE.add(new Vector3(0, 0, 10)), boatWorld),
    up: Vector3.TransformNormal(Vector3.Up(), boatWorld).normalize(),
  };
}
