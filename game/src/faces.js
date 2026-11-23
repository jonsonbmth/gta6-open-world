// Crew portraits: small flat-style faces drawn on canvas at load time and
// used as data-URI images in the HUD cards. No image files, no network.

function drawFace({ skin, hair, hairStyle, shirt, accessory }) {
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  // Background.
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(0, 0, 72, 72);
  // Shoulders / shirt.
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(36, 78, 30, 22, 0, Math.PI, 0);
  ctx.fill();
  // Head.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(36, 34, 19, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hair.
  ctx.fillStyle = hair;
  if (hairStyle === 'short') {
    ctx.beginPath();
    ctx.ellipse(36, 20, 19, 11, 0, Math.PI, 0);
    ctx.fill();
  } else if (hairStyle === 'long') {
    ctx.beginPath();
    ctx.ellipse(36, 24, 21, 16, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(15, 24, 8, 26);
    ctx.fillRect(49, 24, 8, 26);
  } else if (hairStyle === 'bun') {
    ctx.beginPath();
    ctx.ellipse(36, 20, 19, 11, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(36, 8, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (hairStyle === 'cap') {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(36, 20, 20, 10, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(36, 16, 20, 5);
  }
  // Eyes.
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(29, 34, 2.6, 0, Math.PI * 2);
  ctx.arc(43, 34, 2.6, 0, Math.PI * 2);
  ctx.fill();
  // Brows.
  ctx.strokeStyle = hair;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(25, 28); ctx.lineTo(33, 27);
  ctx.moveTo(39, 27); ctx.lineTo(47, 28);
  ctx.stroke();
  // Smile.
  ctx.strokeStyle = '#7a4a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(36, 42, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  if (accessory === 'earring') {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(18, 44, 2.5, 0, Math.PI * 2);
    ctx.arc(54, 44, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (accessory === 'glasses') {
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 30, 12, 9);
    ctx.strokeRect(38, 30, 12, 9);
    ctx.beginPath();
    ctx.moveTo(34, 33); ctx.lineTo(38, 33);
    ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

export function buildPortraits() {
  return {
    vera: drawFace({ skin: '#e8b88a', hair: '#4a2c14', hairStyle: 'long', shirt: '#8a4fd0', accessory: 'earring' }),
    lena: drawFace({ skin: '#d9a066', hair: '#1a1a1a', hairStyle: 'bun', shirt: '#2f7fd0' }),
    hugo: drawFace({ skin: '#a06a3a', hair: '#1a1a1a', hairStyle: 'short', shirt: '#d97b2f', accessory: 'glasses' }),
    nina: drawFace({ skin: '#f2c9a0', hair: '#8a6a3a', hairStyle: 'short', shirt: '#3d9e5f' }),
    dante: drawFace({ skin: '#d9a066', hair: '#1a1a1a', hairStyle: 'cap', shirt: '#c0392b' }),
  };
}
