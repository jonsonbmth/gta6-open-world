// Sirena Bay — faces. Every person in the game gets a real face: eyes with
// pupils, eyebrows, a nose and a mouth, painted BIG and HIGH-CONTRAST on a
// canvas texture that wraps their (round) head, plus a 2D portrait for the
// HUD dialog and crew cards.
//
// HOW THE TEXTURE MAPS TO THE HEAD: a three.js sphere's +Z point sits at
// u = 0.25, so the face is painted centred on canvas x = 25% of the width.
// Canvas row 0 is the top of the head (v = 1 at the north pole). The face
// features live between u 0.15 and 0.35 so they stay on the front of the
// skull instead of sliding around the sides. Hair is a 3D cap, never paint,
// so it can never cover the eyes.

(function () {
  'use strict';

  const U = window.SB.util;

  const SKIN_TONES = ['#f2c69b', '#e8b07e', '#c98d5a', '#8d5a33', '#f7d7b0', '#a06a3b'];
  const HAIR_COLORS = ['#1c1410', '#3a2417', '#5b3a1e', '#8a5a2b', '#b0b0b0', '#2b2b2b'];

  // Paint a 256x256 face texture. opts: skin (hex), brows (hex), lips,
  // beard (bool), glasses (bool), freckles (bool), smile (0..1, mouth width).
  function paintFaceTexture(opts) {
    opts = opts || {};
    const skin = opts.skin || '#e8b07e';
    const browColor = opts.brows || '#2b1d12';
    const lipColor = opts.lips || '#8a3a2a';
    const tex = U.makeTexture(256, 256, (ctx) => {
      // Skin over the whole sphere, with a soft vertical falloff so the
      // jaw reads darker than the forehead.
      ctx.fillStyle = skin;
      ctx.fillRect(0, 0, 256, 256);
      const shade = ctx.createLinearGradient(0, 0, 0, 256);
      shade.addColorStop(0, 'rgba(255,255,255,0.16)');
      shade.addColorStop(0.55, 'rgba(255,255,255,0)');
      shade.addColorStop(1, 'rgba(60,20,0,0.22)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, 256, 256);

      // Cheek blush — soft, on both cheeks.
      U.softEllipse(ctx, 30, 152, 13, 10, '#e0705a', 0.28);
      U.softEllipse(ctx, 98, 152, 13, 10, '#e0705a', 0.28);

      // Freckles, if asked: a scatter of small dots across the nose bridge.
      if (opts.freckles) {
        ctx.fillStyle = 'rgba(90,50,20,0.55)';
        const spots = [[52, 138], [60, 134], [70, 136], [76, 142], [56, 146], [66, 148], [74, 132]];
        for (const s of spots) {
          ctx.beginPath();
          ctx.arc(s[0], s[1], 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // EYEBROWS — thick, arched, dark. Left brow spans x 32..58, right 70..96.
      ctx.strokeStyle = browColor;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(32, 92);
      ctx.quadraticCurveTo(44, 82, 57, 90);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(71, 90);
      ctx.quadraticCurveTo(84, 82, 96, 92);
      ctx.stroke();

      // EYES — big white ellipses with iris, pupil and a highlight dot.
      // Left eye centre (42, 110), right eye centre (86, 110).
      drawEye(ctx, 42, 110);
      drawEye(ctx, 86, 110);

      // Upper eyelid lines, so the eyes sit in the face instead of on it.
      ctx.strokeStyle = 'rgba(40,20,10,0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, 106);
      ctx.quadraticCurveTo(42, 97, 54, 106);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(74, 106);
      ctx.quadraticCurveTo(86, 97, 98, 106);
      ctx.stroke();

      // NOSE — a soft shaded bridge, a rounded tip and two nostrils.
      U.softEllipse(ctx, 64, 140, 7, 13, '#7a4a26', 0.35);
      ctx.fillStyle = 'rgba(60,30,10,0.75)';
      ctx.beginPath();
      ctx.arc(58, 150, 2.6, 0, Math.PI * 2);
      ctx.arc(70, 150, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,220,0.5)';
      ctx.beginPath();
      ctx.arc(64, 131, 3, 0, Math.PI * 2);
      ctx.fill();

      // MOUTH — a wide smile, dark inside with a lighter lower lip.
      const half = 20 + 6 * (opts.smile || 0.5);
      ctx.fillStyle = lipColor;
      ctx.beginPath();
      ctx.moveTo(64 - half, 170);
      ctx.quadraticCurveTo(64, 170 + 16, 64 + half, 170);
      ctx.quadraticCurveTo(64, 170 + 7, 64 - half, 170);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,170,150,0.75)';
      ctx.beginPath();
      ctx.moveTo(64 - half * 0.6, 181);
      ctx.quadraticCurveTo(64, 187, 64 + half * 0.6, 181);
      ctx.quadraticCurveTo(64, 185, 64 - half * 0.6, 181);
      ctx.fill();

      // Beard: a dark shape over the jaw and chin, mouth cut back in.
      if (opts.beard) {
        ctx.fillStyle = browColor;
        ctx.beginPath();
        ctx.moveTo(34, 158);
        ctx.quadraticCurveTo(64, 148, 94, 158);
        ctx.quadraticCurveTo(96, 205, 64, 214);
        ctx.quadraticCurveTo(32, 205, 34, 158);
        ctx.fill();
        // The mouth is cut back in BRIGHT so it reads against the dark beard.
        ctx.fillStyle = '#d06048';
        ctx.beginPath();
        ctx.moveTo(64 - half * 0.8, 172);
        ctx.quadraticCurveTo(64, 172 + 12, 64 + half * 0.8, 172);
        ctx.quadraticCurveTo(64, 172 + 5, 64 - half * 0.8, 172);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,190,170,0.9)';
        ctx.beginPath();
        ctx.moveTo(64 - half * 0.5, 180);
        ctx.quadraticCurveTo(64, 185, 64 + half * 0.5, 180);
        ctx.quadraticCurveTo(64, 183, 64 - half * 0.5, 180);
        ctx.fill();
      }

      // Glasses: two dark rounded frames with a bridge.
      if (opts.glasses) {
        ctx.strokeStyle = '#14100c';
        ctx.lineWidth = 5;
        U.roundRect(ctx, 26, 98, 33, 26, 9);
        ctx.stroke();
        U.roundRect(ctx, 69, 98, 33, 26, 9);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(59, 106);
        ctx.lineTo(69, 106);
        ctx.stroke();
      }
    });
    return tex;
  }

  function drawEye(ctx, x, y) {
    // White of the eye — deliberately oversized so it reads at a distance.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Iris, pupil, highlight — the pupil is what the eye reads at a glance.
    ctx.fillStyle = '#4a2c14';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0503';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Paint a 2D portrait for the HUD (dialog box, crew cards, title screen).
  // Same face language as the 3D texture, but drawn large on a flat card so
  // it is unmistakable: big eyes, brows, nose, smile, hair, shoulders.
  // Returns a data URL the HUD puts in an <img>.
  function paintPortrait(opts) {
    opts = opts || {};
    const skin = opts.skin || '#e8b07e';
    const hair = opts.hair || '#1c1410';
    const shirt = opts.shirt || '#2b6cb0';
    const { canvas, ctx } = U.makeCanvas(168, 168);
    // Background: warm dusk gradient.
    const bg = ctx.createLinearGradient(0, 0, 0, 168);
    bg.addColorStop(0, '#3a2b4a');
    bg.addColorStop(1, '#7a4a2a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 168, 168);
    // Shoulders.
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(14, 168);
    ctx.quadraticCurveTo(20, 128, 84, 126);
    ctx.quadraticCurveTo(148, 128, 154, 168);
    ctx.closePath();
    ctx.fill();
    // Neck.
    ctx.fillStyle = skin;
    ctx.fillRect(72, 108, 24, 24);
    // Head.
    ctx.beginPath();
    ctx.arc(84, 74, 50, 0, Math.PI * 2);
    ctx.fill();
    // Ears.
    ctx.beginPath();
    ctx.arc(34, 78, 8, 0, Math.PI * 2);
    ctx.arc(134, 78, 8, 0, Math.PI * 2);
    ctx.fill();
    // Hair cap — style by opts.hairStyle: short, long, buzz, cap.
    ctx.fillStyle = hair;
    const style = opts.hairStyle || 'short';
    if (style === 'long') {
      ctx.beginPath();
      ctx.arc(84, 66, 52, Math.PI, 0);
      ctx.lineTo(136, 132);
      ctx.lineTo(120, 132);
      ctx.lineTo(118, 84);
      ctx.lineTo(50, 84);
      ctx.lineTo(48, 132);
      ctx.lineTo(32, 132);
      ctx.closePath();
      ctx.fill();
    } else if (style === 'buzz') {
      ctx.beginPath();
      ctx.arc(84, 72, 50, Math.PI * 1.02, Math.PI * 1.98);
      ctx.closePath();
      ctx.fill();
    } else if (style === 'cap') {
      ctx.beginPath();
      ctx.arc(84, 66, 52, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(30, 52, 108, 10);
    } else {
      ctx.beginPath();
      ctx.arc(84, 68, 52, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      ctx.fill();
    }
    // Brows.
    ctx.strokeStyle = hair;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(52, 66);
    ctx.quadraticCurveTo(66, 58, 80, 65);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(88, 65);
    ctx.quadraticCurveTo(102, 58, 116, 66);
    ctx.stroke();
    // Eyes.
    drawEyeBig(ctx, 66, 80);
    drawEyeBig(ctx, 102, 80);
    // Nose.
    U.softEllipse(ctx, 84, 96, 6, 11, '#7a4a26', 0.4);
    ctx.fillStyle = 'rgba(60,30,10,0.8)';
    ctx.beginPath();
    ctx.arc(79, 104, 2.4, 0, Math.PI * 2);
    ctx.arc(89, 104, 2.4, 0, Math.PI * 2);
    ctx.fill();
    // Mouth — a clear smile.
    ctx.fillStyle = opts.lips || '#8a3a2a';
    ctx.beginPath();
    ctx.moveTo(66, 116);
    ctx.quadraticCurveTo(84, 130, 102, 116);
    ctx.quadraticCurveTo(84, 124, 66, 116);
    ctx.fill();
    if (opts.beard) {
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.moveTo(44, 100);
      ctx.quadraticCurveTo(84, 92, 124, 100);
      ctx.quadraticCurveTo(126, 128, 84, 134);
      ctx.quadraticCurveTo(42, 128, 44, 100);
      ctx.fill();
      ctx.fillStyle = opts.lips || '#8a3a2a';
      ctx.beginPath();
      ctx.moveTo(70, 117);
      ctx.quadraticCurveTo(84, 128, 98, 117);
      ctx.quadraticCurveTo(84, 123, 70, 117);
      ctx.fill();
    }
    return canvas.toDataURL('image/png');
  }

  function drawEyeBig(ctx, x, y) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a2c14';
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0503';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 1.8, y - 2, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  window.SB.faces = { paintFaceTexture, paintPortrait, SKIN_TONES, HAIR_COLORS };
})();
