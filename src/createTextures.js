function canvasTex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  const ctx = tex.getContext();
  draw(ctx, w, h);
  tex.refresh();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function brickFill(ctx, w, h, light, dark, grout) {
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, w, h);
  const bw = 24;
  const bh = 14;
  for (let row = 0, y = 0; y < h; row += 1, y += bh) {
    const ox = row % 2 ? -bw / 2 : 0;
    for (let x = ox; x < w; x += bw) {
      ctx.fillStyle = (row + Math.floor((x - ox) / bw)) % 2 ? light : dark;
      ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
}

export function createTextures(scene) {
  canvasTex(scene, 'ground-garden', 48, 48, (ctx, w, h) => {
    ctx.fillStyle = '#c9844a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#7ad151';
    ctx.fillRect(0, 0, w, 14);
    ctx.fillStyle = '#98e86a';
    ctx.fillRect(0, 0, w, 6);
    ctx.fillStyle = '#b56a32';
    for (let i = 0; i < 8; i += 1) ctx.fillRect(6 * i + 4, 22 + (i % 3) * 7, 5, 4);
  });

  canvasTex(scene, 'ground-castle', 48, 48, (ctx, w, h) => {
    brickFill(ctx, w, h, '#f4a4c8', '#e57eaf', '#9b4d78');
    ctx.fillStyle = '#ffd1ea';
    ctx.fillRect(0, 0, w, 6);
  });

  canvasTex(scene, 'ground-tower', 48, 48, (ctx, w, h) => {
    brickFill(ctx, w, h, '#9b7dff', '#7a58d8', '#4a3288');
    ctx.fillStyle = '#d7c6ff';
    ctx.fillRect(0, 0, w, 6);
  });

  canvasTex(scene, 'pad', 48, 20, (ctx, w, h) => {
    ctx.fillStyle = '#ffd76a';
    roundRect(ctx, 0, 0, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    roundRect(ctx, 2, 2, w - 4, 7, 6);
    ctx.fill();
  });

  canvasTex(scene, 'star', 36, 36, (ctx) => {
    ctx.translate(18, 18);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI / 2 + i * (Math.PI * 2) / 5;
      const b = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
      ctx.lineTo(Math.cos(b) * 6, Math.sin(b) * 6);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff6cc';
    ctx.beginPath();
    ctx.arc(-2, -3, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  canvasTex(scene, 'crystal', 28, 36, (ctx) => {
    ctx.translate(14, 18);
    ctx.fillStyle = '#7ef0ff';
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(11, -2);
    ctx.lineTo(7, 16);
    ctx.lineTo(-7, 16);
    ctx.lineTo(-11, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8ffff';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(4, -2);
    ctx.lineTo(0, 6);
    ctx.lineTo(-1, -2);
    ctx.closePath();
    ctx.fill();
  });

  canvasTex(scene, 'heart', 28, 26, (ctx) => {
    ctx.fillStyle = '#ff5d8f';
    ctx.beginPath();
    ctx.moveTo(14, 24);
    ctx.bezierCurveTo(14, 24, 2, 14, 2, 8);
    ctx.bezierCurveTo(2, 2, 8, 1, 14, 8);
    ctx.bezierCurveTo(20, 1, 26, 2, 26, 8);
    ctx.bezierCurveTo(26, 14, 14, 24, 14, 24);
    ctx.fill();
    ctx.fillStyle = '#ffc1d4';
    ctx.beginPath();
    ctx.arc(9, 8, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  canvasTex(scene, 'heart-empty', 28, 26, (ctx) => {
    ctx.strokeStyle = '#ffc1d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 24);
    ctx.bezierCurveTo(14, 24, 2, 14, 2, 8);
    ctx.bezierCurveTo(2, 2, 8, 1, 14, 8);
    ctx.bezierCurveTo(20, 1, 26, 2, 26, 8);
    ctx.bezierCurveTo(26, 14, 14, 24, 14, 24);
    ctx.stroke();
  });

  canvasTex(scene, 'crown-goal', 48, 40, (ctx) => {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(4, 34);
    ctx.lineTo(6, 10);
    ctx.lineTo(16, 22);
    ctx.lineTo(24, 4);
    ctx.lineTo(32, 22);
    ctx.lineTo(42, 10);
    ctx.lineTo(44, 34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff7ab6';
    [[16, 22], [24, 10], [32, 22]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  canvasTex(scene, 'bat-0', 52, 36, (ctx) => drawBat(ctx, 0));
  canvasTex(scene, 'bat-1', 52, 36, (ctx) => drawBat(ctx, 1));

  canvasTex(scene, 'oly-face-fallback', 64, 64, (ctx) => drawOlyFace(ctx));

  canvasTex(scene, 'oly-hit', 32, 56, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.01)';
    ctx.fillRect(0, 0, w, h);
  });

  canvasTex(scene, 'oly-body', 72, 80, (ctx) => {
    // shoes
    ctx.fillStyle = '#5b2b16';
    roundRect(ctx, 18, 70, 14, 8, 4); ctx.fill();
    roundRect(ctx, 40, 70, 14, 8, 4); ctx.fill();
    // legs
    ctx.fillStyle = '#9be7ff';
    roundRect(ctx, 22, 52, 10, 20, 4); ctx.fill();
    roundRect(ctx, 40, 52, 10, 20, 4); ctx.fill();
    // dress - teal like her hoodie
    const g = ctx.createLinearGradient(0, 18, 0, 64);
    g.addColorStop(0, '#5fe0d8');
    g.addColorStop(1, '#1db8b0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(22, 26);
    ctx.quadraticCurveTo(8, 62, 10, 64);
    ctx.lineTo(62, 64);
    ctx.quadraticCurveTo(64, 62, 50, 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe38a';
    ctx.fillRect(22, 30, 28, 4);
    // sparkle on dress
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(28, 46, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(44, 52, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // arms
    ctx.strokeStyle = '#5fe0d8';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(24, 32); ctx.lineTo(10, 50); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(48, 30); ctx.lineTo(66, 38); ctx.stroke();
    // neck
    ctx.fillStyle = '#f3c7a7';
    roundRect(ctx, 32, 18, 8, 10, 3); ctx.fill();
  });

  canvasTex(scene, 'oly-crown', 40, 22, (ctx) => {
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(4, 20);
    ctx.lineTo(6, 6);
    ctx.lineTo(13, 14);
    ctx.lineTo(20, 2);
    ctx.lineTo(27, 14);
    ctx.lineTo(34, 6);
    ctx.lineTo(36, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7ef0ff';
    ctx.beginPath(); ctx.arc(20, 8, 3, 0, Math.PI * 2); ctx.fill();
  });

  canvasTex(scene, 'cloud', 90, 44, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(22, 26, 16, 0, Math.PI * 2);
    ctx.arc(44, 18, 20, 0, Math.PI * 2);
    ctx.arc(68, 26, 16, 0, Math.PI * 2);
    ctx.fill();
  });

  canvasTex(scene, 'flower', 22, 22, (ctx) => {
    ctx.fillStyle = '#ff9ad5';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      const a = i * Math.PI * 2 / 5;
      ctx.arc(11 + Math.cos(a) * 5, 11 + Math.sin(a) * 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(11, 11, 3.5, 0, Math.PI * 2); ctx.fill();
  });

  canvasTex(scene, 'btn-circle', 88, 88, (ctx) => {
    ctx.fillStyle = 'rgba(40,18,70,0.28)';
    ctx.beginPath(); ctx.arc(44, 48, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(44, 42, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(36, 34, 10, 0, Math.PI * 2); ctx.fill();
  });

  canvasTex(scene, 'spark', 10, 10, (ctx) => {
    ctx.fillStyle = '#fff6cc';
    ctx.beginPath(); ctx.arc(5, 5, 4, 0, Math.PI * 2); ctx.fill();
  });
}

function drawBat(ctx, frame) {
  ctx.translate(24, 16);
  const wingY = frame ? -12 : -3;
  ctx.fillStyle = '#1a0b22';
  ctx.beginPath();
  ctx.moveTo(-5, 2);
  ctx.quadraticCurveTo(-18, wingY - 4, -26, wingY);
  ctx.lineTo(-22, 2);
  ctx.quadraticCurveTo(-16, 8, -8, 6);
  ctx.lineTo(-18, 12);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(5, 2);
  ctx.quadraticCurveTo(18, wingY - 4, 26, wingY);
  ctx.lineTo(22, 2);
  ctx.quadraticCurveTo(16, 8, 8, 6);
  ctx.lineTo(18, 12);
  ctx.lineTo(6, 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#2b1238';
  ctx.beginPath();
  ctx.ellipse(0, 3, 9, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#140816';
  ctx.beginPath();
  ctx.moveTo(-6, -6);
  ctx.lineTo(-8, -14);
  ctx.lineTo(-2, -8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, -6);
  ctx.lineTo(8, -14);
  ctx.lineTo(2, -8);
  ctx.fill();

  ctx.fillStyle = '#ff3b4a';
  ctx.beginPath();
  ctx.ellipse(-3.5, 0, 2.6, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.5, 0, 2.6, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b0008';
  ctx.beginPath();
  ctx.arc(-3.5, 0.4, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3.5, 0.4, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f4e8ff';
  ctx.beginPath();
  ctx.moveTo(-2, 7);
  ctx.lineTo(-0.8, 11);
  ctx.lineTo(0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 7);
  ctx.lineTo(0.8, 11);
  ctx.lineTo(0, 7);
  ctx.fill();
}

function drawOlyFace(ctx) {
  ctx.save();
  ctx.translate(32, 34);

  // hair bun / pulled-back dark hair
  ctx.fillStyle = '#2a1a14';
  ctx.beginPath();
  ctx.ellipse(0, -10, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-16, -16, 8, 0, Math.PI * 2);
  ctx.arc(16, -16, 8, 0, Math.PI * 2);
  ctx.fill();

  // face
  ctx.fillStyle = '#f3c7a7';
  ctx.beginPath();
  ctx.ellipse(0, 2, 18, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // side hair / ears covered
  ctx.fillStyle = '#2a1a14';
  ctx.beginPath();
  ctx.ellipse(-16, 0, 5, 11, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(16, 0, 5, 11, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // bangs
  ctx.beginPath();
  ctx.ellipse(-7, -12, 8, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7, -12, 8, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -14, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // brows
  ctx.strokeStyle = '#3b2418';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, -4);
  ctx.quadraticCurveTo(-7, -7, -3, -4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(3, -4);
  ctx.quadraticCurveTo(7, -7, 11, -4);
  ctx.stroke();

  // eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-7, 1, 5.2, 6.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(7, 1, 5.2, 6.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a2a12';
  ctx.beginPath();
  ctx.arc(-6.5, 1.4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6.5, 1.4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0c08';
  ctx.beginPath();
  ctx.arc(-6.3, 1.6, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(6.7, 1.6, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-7.4, -0.2, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5.6, -0.2, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // blush
  ctx.fillStyle = 'rgba(255, 120, 150, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-11, 9, 4, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(11, 9, 4, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // smile
  ctx.strokeStyle = '#c56b7a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 10, 5, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.restore();
}
