// SOLMAR BAY — screenshot shots: fixed scenarios for the four screenshots.
// Each shot is a real render of the game, driven by ?shot=<name> in the URL.
// The game starts at once in shot mode (no title click needed), except the
// title shot, which shows the title screen over a slow orbital view.

var SB = window.SB || (window.SB = {});

SB.shots = (function () {
  let fixedCamera = false;

  function hideHud() {
    for (const id of ['hud-tl', 'hud-tr', 'hud-bl', 'hud-br']) {
      document.getElementById(id).style.display = 'none';
    }
  }

  function showHud() {
    for (const id of ['hud-tl', 'hud-tr', 'hud-bl', 'hud-br']) {
      document.getElementById(id).style.display = '';
    }
  }

  function apply(name) {
    const st = SB.game.state;
    if (name === 'title') {
      // Title screen over the orbital city view; HUD hidden, game not started.
      // Hide the checkpoint beams so no glowing pillar photobombs the frame.
      st.started = false;
      document.getElementById('title-screen').style.display = '';
      hideHud();
      SB.missions.setVisible(false);
      fixedCamera = false;
      return;
    }
    showHud();
    st.started = true;
    document.getElementById('title-screen').style.display = 'none';

    if (name === 'chase') {
      // Autopilot drives north up Ocean Drive toward checkpoint 1 (a long
      // straight run); the camera is snapped behind the car so the framing is
      // right from the first frame. Two police close in from the side streets
      // with light bars flashing; mission 1/6 running; HUD dense in all corners.
      st.playerPos.x = 240;
      st.playerPos.z = -80;
      st.heading = Math.PI; // north (-z)
      // Already at speed (~100 km/h) so the shot shows the car driving, not
      // accelerating from a standstill in slow headless rendering.
      st.vel.x = Math.sin(st.heading) * 28;
      st.vel.z = Math.cos(st.heading) * 28;
      st.speed = 28;
      st.autopilot = true;
      st.wanted = 1;
      SB.render.snapChaseCamera(st.playerPos, st.heading);
      const police = SB.police.cars();
      if (police[0]) { police[0].mesh.position.set(160, 0, -160); police[0].heading = Math.PI; }
      if (police[1]) { police[1].mesh.position.set(320, 0, -160); police[1].heading = Math.PI; }
      fixedCamera = false;
    } else if (name === 'map') {
      // Player in Palm Row with the full city map open: GPS route to checkpoint 1.
      st.playerPos.x = 40;
      st.playerPos.z = 0;
      st.heading = 0;
      st.autopilot = false;
      SB.hud.setMap(true);
      fixedCamera = false;
    } else if (name === 'marina') {
      // Fixed camera from the south, closer in: crew on the middle pier facing
      // the camera, boats side-on with coloured hulls, hero car parked on the
      // sand at left. Mission beams hidden so the boats read cleanly.
      // Hero car parked on dry sand west of the basin (x < 232), in frame left.
      st.playerPos.x = 228;
      st.playerPos.z = 305;
      st.heading = 0.5;
      st.vel.x = 0;
      st.vel.z = 0;
      st.autopilot = false;
      SB.missions.setVisible(false);
      SB.render.setShotCamera([232, 4.5, 318], [252, 2, 264]);
      fixedCamera = true;
    }
  }

  return {
    apply: apply,
    get fixedCamera() { return fixedCamera; },
  };
})();
