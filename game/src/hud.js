// The HUD: mission card, wanted stars, money, REP, the round minimap, the
// speedometer, radio readout, dialogue subtitles, hints, banners and the
// SBPD unit list — plus the full-screen city map.

import { CITY, PLACES, RADIO } from './config.js';

const $ = (id) => document.getElementById(id);

export function createHud() {
  const els = {
    mission: $('mission'), job: $('mission-job'), title: $('mission-title'),
    obj: $('mission-obj'), dist: $('mission-dist'),
    stars: $('stars'), money: $('money'), repfill: $('repfill'), reptext: $('reptext'),
    clock: $('clock'), healthfill: $('healthfill'), speedo: $('speedo'), speed: $('speed'),
    carname: $('carname'), radio: $('radio'), radioStation: $('radio-station'),
    radioTrack: $('radio-track'), dialog: $('dialog'), dialogWho: $('dialog-who'),
    dialogLine: $('dialog-line'), hint: $('hint'), banner: $('banner'),
    bannerBig: $('banner-big'), bannerSub: $('banner-sub'),
    crosshair: $('crosshair'), vignette: $('vignette'), flash: $('wanted-flash'),
    units: $('units'),
  };
  const mini = $('minimap').getContext('2d');
  const bigMap = $('mapcanvas').getContext('2d');
  let dialogTimer = 0;
  let bannerTimer = 0;
  let flashTimer = 0;
  let gameMinutes = 17 * 60 + 42;

  function drawMapBase(g, size, range, cx, cy, rotate, city) {
    g.save();
    g.clearRect(0, 0, size, size);
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    g.clip();
    // Ocean to the south, land elsewhere.
    g.fillStyle = '#0e1a28';
    g.fillRect(0, 0, size, size);
    const scale = size / range;
    g.translate(size / 2, size / 2);
    if (rotate) g.rotate(rotate);
    g.scale(scale, scale);
    g.translate(-cx, -cy);
    g.fillStyle = '#274b63';
    g.fillRect(cx - range / 2 - 50, 205, range + 100, 200);
    g.fillStyle = '#e8d29a';
    g.fillRect(cx - range / 2 - 50, 190, range + 100, 18);
    g.fillStyle = '#22303e';
    g.fillRect(cx - range / 2 - 50, -CITY.half, range + 100, CITY.half + 190);
    // Roads.
    g.strokeStyle = '#5a6b7a';
    g.lineWidth = 9;
    for (const line of city.roadLines) {
      g.beginPath(); g.moveTo(-CITY.half, line); g.lineTo(CITY.half, line); g.stroke();
      g.beginPath(); g.moveTo(line, -CITY.half); g.lineTo(line, CITY.half); g.stroke();
    }
    // Buildings.
    g.fillStyle = '#3d5266';
    for (const b of city.buildings) {
      g.fillRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d);
    }
    return { g, scale };
  }

  function blip(g, x, z, color, radius, shape = 'circle') {
    g.fillStyle = color;
    if (shape === 'diamond') {
      g.beginPath();
      g.moveTo(x, z - radius * 1.4);
      g.lineTo(x + radius, z);
      g.lineTo(x, z + radius * 1.4);
      g.lineTo(x - radius, z);
      g.closePath();
      g.fill();
    } else {
      g.beginPath();
      g.arc(x, z, radius, 0, Math.PI * 2);
      g.fill();
    }
  }

  return {
    setMission(job, step) {
      if (!job || !step) {
        els.mission.style.display = 'none';
        return;
      }
      els.mission.style.display = 'block';
      els.job.textContent = `JOB ${String(job.id).padStart(2, '0')} · ${job.giver}`;
      els.title.textContent = job.name;
      els.obj.textContent = step.text;
    },
    setMissionDistance(meters) {
      els.dist.textContent = meters === null ? '' : `${Math.round(meters)} m`;
    },
    say(who, line, seconds = 4) {
      els.dialog.style.display = 'block';
      els.dialogWho.textContent = who;
      els.dialogLine.textContent = line;
      dialogTimer = seconds;
    },
    banner(big, sub, seconds = 3.5) {
      els.banner.style.display = 'block';
      els.bannerBig.textContent = big;
      els.bannerSub.textContent = sub;
      bannerTimer = seconds;
    },
    hint(text) {
      if (text) {
        els.hint.style.display = 'block';
        els.hint.textContent = text;
      } else {
        els.hint.style.display = 'none';
      }
    },
    update(dt, world) {
      const { player, police, missions, audio } = world;
      gameMinutes += dt * 0.5;
      const hh = String(Math.floor(gameMinutes / 60) % 24).padStart(2, '0');
      const mm = String(Math.floor(gameMinutes % 60)).padStart(2, '0');
      els.clock.textContent = `SOLMAR BAY · ${hh}:${mm}`;

      // Wanted stars.
      let starsHtml = '';
      for (let i = 0; i < 5; i += 1) {
        starsHtml += i < police.stars ? '★' : '<span class="off">☆</span>';
      }
      els.stars.innerHTML = starsHtml;
      els.money.textContent = `$${player.money.toLocaleString()}`;
      const repPct = Math.min(100, (player.rep / 1500) * 100);
      els.repfill.style.width = `${repPct}%`;
      const rank = player.rep < 300 ? 'STREET' : player.rep < 800 ? 'HUSTLER' : player.rep < 1400 ? 'KINGPIN' : 'LEGEND';
      els.reptext.textContent = `REP ${player.rep} · ${rank}`;
      els.healthfill.style.width = `${(player.health / player.maxHealth) * 100}%`;
      els.healthfill.style.background = player.health < 30
        ? 'linear-gradient(90deg,#e5534b,#ff9a8a)'
        : 'linear-gradient(90deg,#37d67a,#a5f3a0)';
      els.vignette.style.opacity = player.health < 35 ? String(0.4 + 0.4 * Math.sin(Date.now() / 300)) : '0';

      // Speedometer + radio, only while driving.
      if (player.inCar && player.vehicle) {
        els.speedo.style.display = 'block';
        els.speed.textContent = String(Math.round(Math.abs(player.speed) * 3.6));
        els.carname.textContent = player.vehicle.spec.name;
        els.radio.style.display = 'block';
        const st = audio.station();
        els.radioStation.textContent = st.name;
        els.radioTrack.textContent = st.track;
      } else {
        els.speedo.style.display = 'none';
        els.radio.style.display = 'none';
      }
      els.crosshair.style.display = !player.inCar && !world.shotMode ? 'block' : 'none';

      // SBPD unit list while wanted.
      if (police.stars > 0) {
        flashTimer += dt;
        els.flash.style.opacity = String(0.25 + 0.2 * Math.sin(flashTimer * 9));
        if (els.units) {
          els.units.style.display = 'block';
          els.units.innerHTML = police.cops.map((c) =>
            `<div><b>${c.name}</b> · ${c.status} · ${c.distance ?? '?'} m</div>`).join('')
            + (police.heliUp ? '<div><b>AIR-1</b> · OVERHEAD · SPOTLIGHT</div>' : '');
        }
      } else {
        els.flash.style.opacity = '0';
        if (els.units) els.units.style.display = 'none';
      }

      // Mission distance.
      const target = missions.targetPos();
      if (target) this.setMissionDistance(Math.hypot(player.x - target.x, player.z - target.z));

      // Timers.
      if (dialogTimer > 0) {
        dialogTimer -= dt;
        if (dialogTimer <= 0) els.dialog.style.display = 'none';
      }
      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0) els.banner.style.display = 'none';
      }

      this.drawMinimap(world);
    },
    drawMinimap(world) {
      const { player, police, missions, city } = world;
      const size = 232;
      const range = 150;
      const { g } = drawMapBase(mini, size, range, player.x, player.z, -player.angle - Math.PI / 2, city);
      // Place icons.
      blip(g, PLACES.safehouse.x, PLACES.safehouse.z, '#7cf29c', 3.2, 'diamond');
      blip(g, PLACES.garage.x, PLACES.garage.z, '#4fc3f7', 3.2, 'diamond');
      const target = missions.targetPos();
      if (target) {
        const pulse = 4 + Math.sin(Date.now() / 250) * 1.2;
        blip(g, target.x, target.z, '#ffd166', pulse, 'diamond');
      }
      for (const c of police.cops) {
        blip(g, c.vehicle.x, c.vehicle.z, Math.floor(Date.now() / 300) % 2 ? '#ff4444' : '#4488ff', 3);
      }
      for (const v of world.traffic.cars) blip(g, v.x, v.z, '#cfd6da', 1.6);
      // Player arrow (drawn unrotated at the centre, pointing up).
      g.restore();
      g.save();
      g.translate(size / 2, size / 2);
      g.fillStyle = '#ffffff';
      g.strokeStyle = '#14171c';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, -11);
      g.lineTo(8, 9);
      g.lineTo(0, 4);
      g.lineTo(-8, 9);
      g.closePath();
      g.fill();
      g.stroke();
      // North tick.
      g.fillStyle = '#ffd166';
      g.font = 'bold 13px system-ui, sans-serif';
      g.textAlign = 'center';
      g.fillText('N', 0, -size / 2 + 18);
      g.restore();
    },
    drawBigMap(world) {
      const { player, police, missions, city } = world;
      const size = 640;
      const range = CITY.half * 2 + 40;
      const { g } = drawMapBase(bigMap, size, range, 0, 0, 0, city);
      // The minimap base clips to a circle; for the big map, redraw square.
      g.restore();
      bigMap.save();
      bigMap.clearRect(0, 0, size, size);
      const scale = size / range;
      bigMap.translate(size / 2, size / 2);
      bigMap.scale(scale, scale);
      bigMap.fillStyle = '#22303e';
      bigMap.fillRect(-range / 2, -range / 2, range, range);
      bigMap.fillStyle = '#274b63';
      bigMap.fillRect(-range / 2, 205, range, 200);
      bigMap.fillStyle = '#e8d29a';
      bigMap.fillRect(-range / 2, 190, range, 18);
      bigMap.strokeStyle = '#5a6b7a';
      bigMap.lineWidth = 9;
      for (const line of city.roadLines) {
        bigMap.beginPath(); bigMap.moveTo(-CITY.half, line); bigMap.lineTo(CITY.half, line); bigMap.stroke();
        bigMap.beginPath(); bigMap.moveTo(line, -CITY.half); bigMap.lineTo(line, CITY.half); bigMap.stroke();
      }
      bigMap.fillStyle = '#3d5266';
      for (const b of city.buildings) bigMap.fillRect(b.x - b.w / 2, b.z - b.d / 2, b.w, b.d);
      for (const [key, p] of Object.entries(PLACES)) {
        bigMap.fillStyle = key === 'safehouse' ? '#7cf29c' : key === 'garage' ? '#4fc3f7' : '#9fb3c8';
        bigMap.beginPath();
        bigMap.arc(p.x, p.z, 5, 0, Math.PI * 2);
        bigMap.fill();
      }
      const target = missions.targetPos();
      if (target) {
        bigMap.fillStyle = '#ffd166';
        bigMap.beginPath();
        bigMap.moveTo(target.x, target.z - 10);
        bigMap.lineTo(target.x + 7, target.z);
        bigMap.lineTo(target.x, target.z + 10);
        bigMap.lineTo(target.x - 7, target.z);
        bigMap.closePath();
        bigMap.fill();
      }
      for (const c of police.cops) {
        bigMap.fillStyle = '#ff4444';
        bigMap.beginPath();
        bigMap.arc(c.vehicle.x, c.vehicle.z, 4, 0, Math.PI * 2);
        bigMap.fill();
      }
      bigMap.fillStyle = '#ffffff';
      bigMap.beginPath();
      bigMap.moveTo(player.x, player.z - 10);
      bigMap.lineTo(player.x + 7, player.z + 7);
      bigMap.lineTo(player.x, player.z + 3);
      bigMap.lineTo(player.x - 7, player.z + 7);
      bigMap.closePath();
      bigMap.fill();
      bigMap.restore();
      // Labels.
      bigMap.fillStyle = 'rgba(255,255,255,0.85)';
      bigMap.font = 'bold 12px system-ui, sans-serif';
      bigMap.textAlign = 'left';
      const toPx = (x, z) => [size / 2 + x * scale, size / 2 + z * scale];
      for (const [key, p] of Object.entries(PLACES)) {
        const [px, pz] = toPx(p.x, p.z);
        // Safehouse and Lena's Garage sit 24 m apart; stagger their labels
        // so they don't run into each other.
        const dy = key === 'garage' ? 18 : 4;
        bigMap.fillText(p.label, px + 9, pz + dy);
      }
    },
    setClock(minutes) { gameMinutes = minutes; },
  };
}
