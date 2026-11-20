// Police pursuit: two units chase the player when wanted, light bars flash
// red/blue and their glow pools paint the asphalt — the classic GTA look.
import { buildPoliceCar } from './cars.js';
import { clamp, angleLerp } from './random.js';

export function createPolice(scene, rng, count = 2) {
  const units = [];
  for (let i = 0; i < count; i++) {
    const car = buildPoliceCar();
    car.position.set(-120 - i * 40, 0.3, -80 + i * 30);
    car.rotation.y = 0;
    scene.add(car);
    units.push({ mesh: car, speed: 0, maxSpeed: 24 + i * 2, phase: rng.range(0, Math.PI * 2), active: false });
  }
  return {
    units,
    setActive(active) { for (const u of units) u.active = active; },
    update(dt, playerPos, playerAngle, wanted, t) {
      for (const u of units) {
        // flashing light bar, alternating red/blue
        const on = Math.sin(t * 9 + u.phase) > 0;
        u.mesh.userData.redMat.emissiveIntensity = on ? 5 : 0.4;
        u.mesh.userData.blueMat.emissiveIntensity = on ? 0.4 : 5;
        u.mesh.userData.redPool.material.opacity = on ? 0.55 : 0.08;
        u.mesh.userData.bluePool.material.opacity = on ? 0.08 : 0.55;
        if (!u.active || wanted < 1) {
          // idle: park at the roadside
          u.speed = Math.max(0, u.speed - dt * 10);
          continue;
        }
        const dx = playerPos.x - u.mesh.position.x;
        const dz = playerPos.z - u.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        // model faces -x: forward = (-cos θ, sin θ), so θ = atan2(dz, -dx)
        const wantAngle = Math.atan2(dz, -dx);
        u.mesh.rotation.y = angleLerp(u.mesh.rotation.y, wantAngle, Math.min(1, dt * 1.6));
        const target = dist > 10 ? u.maxSpeed : u.maxSpeed * 0.5;
        u.speed += (target - u.speed) * Math.min(1, dt * 1.2);
        const v = u.speed * dt;
        u.mesh.position.x += -Math.cos(u.mesh.rotation.y) * v;
        u.mesh.position.z += Math.sin(u.mesh.rotation.y) * v;
        // keep inside the city
        u.mesh.position.x = clamp(u.mesh.position.x, -350, 350);
        u.mesh.position.z = clamp(u.mesh.position.z, -270, 270);
        for (const w of u.mesh.userData.wheels) w.rotation.z += v * 2.8;
      }
    },
  };
}
