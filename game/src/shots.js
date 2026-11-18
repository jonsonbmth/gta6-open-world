// The screenshot scenes behind ?shot=chase|start|map|foot. Each one stages a
// real game state — a chase, the title, the map, a moment on foot — then plays
// it forward from a fixed seed with a simple autopilot, so the frame is what
// the game really looks like and the same seed always gives the same frame.

import { PLACES } from './config.js';
import { createVehicle } from './vehicles.js';

function fakeInput(axesFn) {
  return {
    axes: axesFn,
    isDown: () => false,
    wasPressed: () => false,
    clicked: () => false,
    consumeMouse: () => ({ dx: 0, dy: 0 }),
    endFrame: () => {},
  };
}

export function stageShot(name, world) {
  const { player, police, missions, traffic, city, hud, audio, camera } = world;
  const scenes = {
    // COVER: sunset chase on the coastal highway — Job 4, three stars, the
    // helicopter overhead, the money truck ahead, the city behind.
    chase() {
      const car = createVehicle(world.r, city, 'sports', -70, 192, 0, 0xc23b3b, world.random);
      car.speed = 42;
      world.jobCars.push(car);
      player.enterShotCar(car);
      police.setStars(3);
      missions.debugJump(3, 1); // Job 4, "Ram the money truck"
      if (missions.chaseTarget) missions.chaseTarget.cruise = 38; // truck flees fast: caught at the last moment
      hud.setClock(18 * 60 + 12);
      hud.say('RICO', 'He\u2019s weaving! Stay on him, stay on him!', 30);
      // Extra traffic on the coast road so the chase has something to dodge.
      for (const x of [-10, 30, 150, 200]) {
        const t = createVehicle(world.r, city, 'sedan', x, 192, 0, 0x2b6cb0, world.random);
        t.speed = 14;
        world.jobCars.push(t);
      }
      // A roadblock ahead: two SBPD cruisers angled across the road edges, so
      // the police are IN the frame — with the money truck visible between them.
      for (const [bx, bz, ba] of [[196, 187, Math.PI - 0.35], [208, 197, Math.PI + 0.3]]) {
        const block = createVehicle(world.r, city, 'police', bx, bz, ba, 0xf2f2f2, world.random);
        block.speed = 0;
        world.jobCars.push(block);
      }
      camera.snapBehind(0, car.x, car.z);
      return {
        screen: 'play',
        runSeconds: 3.2,
        input: fakeInput(() => {
          // Stay on the coast road, ease off only for the car ahead.
          const dz = 192 - player.z;
          return { forward: 1, strafe: Math.max(-1, Math.min(1, dz * 0.08)) };
        }),
        // Ramming during the chase can push the heat to 5 stars; the cover
        // reads best at 3, with the helicopter up.
        finish() { police.setStars(3); },
      };
    },
    // TITLE: the title screen over the slow city orbit.
    start() {
      return { screen: 'title', runSeconds: 4, input: fakeInput(() => ({ forward: 0, strafe: 0 })) };
    },
    // MAP: the full city map with Job 2's objective marked.
    map() {
      missions.debugJump(1, 0); // Job 2, "Reach the casino valet row"
      hud.setClock(17 * 60 + 42);
      return { screen: 'map', runSeconds: 1, input: fakeInput(() => ({ forward: 0, strafe: 0 })) };
    },
    // ON FOOT: Rico on the beach at the marina, a parked Cheetah GT beside
    // him, the piers and the ocean ahead — the game on foot, not in a car.
    foot() {
      const car = createVehicle(world.r, city, 'sports', 128, 202, Math.PI / 2, 0xd9a441, world.random);
      world.jobCars.push(car);
      player.teleport(132, 200, -Math.PI / 2);
      missions.debugJump(1, 1); // Job 2, "Steal the Cheetah GT"
      hud.setClock(17 * 60 + 5);
      hud.say('LENA', 'Red Cheetah GT, plates SB-777. The valet is on his break.', 30);
      camera.snapBehind(-Math.PI / 2, player.x, player.z);
      return {
        screen: 'play',
        runSeconds: 2,
        input: fakeInput(() => ({ forward: 0, strafe: 0 })),
      };
    },
  };
  const make = scenes[name] ?? scenes.start;
  return make();
}
