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
    // helicopter overhead, the money truck ahead, the city behind. The chase
    // runs WEST, straight into the setting sun: the road leads to a
    // vanishing point right in the sunset glow.
    chase() {
      const car = createVehicle(world.r, city, 'sports', 70, 192, Math.PI, 0xc23b3b, world.random);
      car.speed = 42;
      world.jobCars.push(car);
      player.enterShotCar(car);
      police.setStars(3);
      missions.debugJump(3, 1); // Job 4, "Ram the money truck"
      // Keep the money truck in frame: it starts just ahead of Rico and
      // cruises slower than him, so the chase closes but never catches it
      // during the shot (a ram would stop it and kill the chase framing).
      if (missions.chaseTarget) {
        missions.chaseTarget.x = -3;
        missions.chaseTarget.z = 192;
        missions.chaseTarget.angle = Math.PI;
        missions.chaseTarget.speed = 28;
        missions.chaseTarget.cruise = 28;
      }
      // Fly the helicopter low so it looms big in the frame.
      police.setHeliAlt(13);
      hud.setClock(18 * 60 + 12);
      hud.say('RICO', 'He\u2019s weaving! Stay on him, stay on him!', 30);
      // Extra traffic on the coast road so the chase has something to dodge:
      // both lanes, mixed colours and types, spread along the whole stretch
      // the camera will travel through.
      for (const [tx, tz, tc, tt] of [
        [10, 198, 0x2b6cb0, 'sedan'], [-30, 186, 0xd9a441, 'taxi'], [-55, 194.5, 0xe8e8e8, 'sedan'],
        [-110, 186, 0x3f7a5a, 'van'], [-150, 198, 0x7a4a9e, 'sedan'], [-200, 186, 0x2b6cb0, 'sports'],
        [-85, 198, 0xc75b39, 'sedan'], [-130, 189.5, 0x9fb3c8, 'taxi'],
      ]) {
        const t = createVehicle(world.r, city, tt, tx, tz, Math.PI, tc, world.random);
        t.speed = 14;
        world.jobCars.push(t);
      }
      // Two more SBPD cruisers IN the frame where the shot ends up (the
      // player covers ~140 units in 3.2 s, ending near x=-74): one chasing in
      // the left lane behind him, one head-on in the right lane ahead.
      for (const [bx, bz, ba] of [[-95, 186, Math.PI], [-104, 198, 0]]) {
        const cruiser = createVehicle(world.r, city, 'police', bx, bz, ba, 0xf2f2f2, world.random);
        cruiser.speed = 0;
        world.jobCars.push(cruiser);
      }
      // A roadblock ahead: two SBPD cruisers angled across the road edges, so
      // the police are IN the frame — with the money truck visible between them.
      for (const [bx, bz, ba] of [[-150, 187, -0.35], [-162, 197, 0.3]]) {
        const block = createVehicle(world.r, city, 'police', bx, bz, ba, 0xf2f2f2, world.random);
        block.speed = 0;
        world.jobCars.push(block);
      }
      // People on both sidewalks who scatter as the chase roars past.
      for (const p of world.peds.spawnNear(-80, 182, 5)) p.state = 'flee';
      for (const p of world.peds.spawnNear(-95, 202, 3)) p.state = 'flee';
      camera.snapBehind(Math.PI, car.x, car.z);
      return {
        screen: 'play',
        runSeconds: 3.2,
        input: fakeInput(() => {
          // Stay on the coast road, and hold a believable city-chase speed
          // (about 150-165 km/h): ease off the throttle past 45 units/s
          // instead of winding out to 300 km/h. Westbound, the steering
          // sign flips from the eastbound version.
          const dz = 192 - player.z;
          const forward = player.speed > 45 ? 0 : 1;
          return { forward, strafe: -Math.max(-1, Math.min(1, dz * 0.08)) };
        }),
        // Ramming during the chase can push the heat to 5 stars; the cover
        // reads best at 3, with the helicopter up. Put the helicopter big in
        // frame, ahead and to the left, spotlight on the road.
        finish() {
          police.setStars(3);
          // Keep the helicopter low through the settle step too: police.update
          // re-asserts the altitude every step, so set it here as well.
          // Ahead and well to the side (south, over the beach), so the camera
          // catches the helicopter's 3/4 profile and a diagonal spotlight.
          police.setHeliAlt(11);
          const heli = police.heli;
          if (heli) {
            heli.position.set(player.x - 26, 11, player.z + 14);
            heli.rotation.y = Math.atan2(-(player.z - heli.position.z), player.x - heli.position.x);
          }
          // The near miss genuinely fired during the run (money is $1,500),
          // but its 1.6 s pop can expire before the final frame renders;
          // re-show it so the cover carries the action text.
          hud.actionText('NEAR MISS +$250');
        },
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
    // The marina is busy now: extra people, parked cars, boats at the piers.
    foot() {
      const car = createVehicle(world.r, city, 'sports', 126, 212, Math.PI / 2, 0xd9a441, world.random);
      world.jobCars.push(car);
      const sedan = createVehicle(world.r, city, 'sedan', 112, 200, Math.PI / 2, 0x2b6cb0, world.random);
      world.jobCars.push(sedan);
      const van = createVehicle(world.r, city, 'van', 148, 210, -Math.PI / 2, 0x3f7a5a, world.random);
      world.jobCars.push(van);
      world.peds.spawnNear(128, 208, 8);
      world.peds.spawnNear(140, 214, 6);
      player.teleport(132, 204, -Math.PI / 2);
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
