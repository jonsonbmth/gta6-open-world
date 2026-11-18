// The camera: a chase cam that sits behind the car or over Rico's shoulder,
// steered by the mouse, smoothed so it never snaps, and a slow cinematic
// orbit for the title screen.

import * as THREE from 'three';

export function createCamera(camera) {
  let yaw = Math.PI / 2; // looking north by default
  let pitch = 0.32;
  let distance = 4.7; // low and close: the hero car dominates the frame
  let targetDistance = 4.7;
  const pos = new THREE.Vector3(0, 12, 30);
  const look = new THREE.Vector3(0, 2, 0);
  let titleAngle = 0;

  return {
    get yaw() { return yaw; },
    addMouse(dx, dy) {
      yaw -= dx * 0.0032;
      pitch = Math.max(0.05, Math.min(1.1, pitch + dy * 0.0022));
    },
    setDistance(d) { targetDistance = d; },
    snapBehind(angle, x, z) {
      yaw = angle + Math.PI / 2;
      pos.set(x - Math.cos(angle) * distance, 6, z + Math.sin(angle) * distance);
    },
    // `focus` is the player; `mode` is 'foot' | 'car' | 'title'.
    update(dt, focus, mode, time) {
      distance += (targetDistance - distance) * Math.min(1, 4 * dt);
      if (mode === 'title') {
        titleAngle += dt * 0.05;
        const cx = Math.cos(titleAngle) * 90;
        const cz = 120 + Math.sin(titleAngle) * 60;
        pos.lerp(new THREE.Vector3(cx, 42, cz), Math.min(1, 1.5 * dt));
        look.lerp(new THREE.Vector3(0, 8, 40), Math.min(1, 1.5 * dt));
        camera.position.copy(pos);
        camera.lookAt(look);
        return;
      }
      const back = mode === 'car' ? 1 : 0.85;
      const height = mode === 'car' ? 2.1 + pitch * 1.6 : 3.1 + pitch * 3.4;
      const dist = distance * back;
      const desired = new THREE.Vector3(
        focus.x - Math.cos(yaw - Math.PI / 2) * dist,
        height + (mode === 'car' ? focus.speed * 0.006 : 0),
        focus.z + Math.sin(yaw - Math.PI / 2) * dist,
      );
      // Never go under the street or inside a building's roofline guess.
      desired.y = Math.max(desired.y, 2.0);
      const smooth = mode === 'car' ? Math.min(1, 20 * dt) : Math.min(1, 9 * dt);
      pos.lerp(desired, smooth);
      const lookTarget = new THREE.Vector3(
        focus.x + (focus.vx ?? 0) * 0.25,
        mode === 'car' ? 1.3 : 1.8,
        focus.z + (focus.vz ?? 0) * 0.25,
      );
      look.lerp(lookTarget, Math.min(1, 10 * dt));
      camera.position.copy(pos);
      camera.lookAt(look);
    },
  };
}
