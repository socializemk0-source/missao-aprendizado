// Marionete digital do Tico: deforma a arte oficial (public/tico/*.webp) numa
// malha no WebGL para a cabeça virar e acenar com o pescoço acompanhando, um
// braço balançar, os olhos piscarem e o visor "tecnológico" acender, sem
// redesenhar o personagem. Medidas de cada pose em pixels da imagem (512 x 512).
//
//   await TicoRig.load('../../public/tico/');
//   const t = TicoRig.create(pai, 700);             // div com o Tico, 700 px
//   t.draw({ pose: 'acenando', head: 6, nod: 4, arm: -12, blink: 0, visor: 1 });
//   t.el.style.transform = ...                      // posição, estica e amassa
//
// Precisa de --allow-file-access-from-files no Chromium (render.mjs já passa).
(() => {
  const POSES = {
    neutro: { head: [280, 132, 138, 118], pivot: [290, 238], eyes: [[240, 132, 16, 24], [352, 100, 12, 14]], line: [[240, 132], [352, 100]] },
    acenando: { head: [220, 138, 128, 112], pivot: [235, 250], eyes: [[160, 139, 16, 24], [276, 96, 15, 18]], line: [[160, 139], [276, 96]],
      arm: { a: [335, 262], b: [402, 135], r: 48, f: 30 } },
    apontando: { head: [255, 128, 130, 112], pivot: [265, 240], eyes: [[186, 128, 22, 22], [293, 81, 18, 17]], line: [[186, 128], [293, 81]],
      arm: { a: [348, 252], b: [425, 128], r: 38, f: 28 } },
    comemorando: { head: [228, 128, 125, 105], pivot: [225, 228], eyes: [], line: [[185, 128], [290, 78]],
      arm: { a: [330, 205], b: [388, 105], r: 42, f: 26 } },
    joinha: { head: [248, 120, 128, 110], pivot: [258, 230], eyes: [], line: [[208, 113], [333, 120]],
      arm: { a: [345, 292], b: [398, 222], r: 38, f: 26 } },
    estrela: { head: [245, 140, 125, 108], pivot: [250, 242], eyes: [], line: [[196, 143], [291, 88]],
      arm: { a: [360, 252], b: [392, 85], r: 46, f: 28 } },
  };
  const VIEW = [-96, 608];   // área desenhada (deixa espaço para o braço sair da imagem)
  const RES = 900;           // pixels do canvas para a área acima
  const GRID = 56;

  const VS = `
    attribute vec2 aPos;
    uniform vec4 uHead; uniform vec2 uPivot; uniform float uAngle; uniform vec2 uShift;
    uniform vec2 uArmA; uniform vec2 uArmB; uniform vec2 uArmRF; uniform float uArm;
    varying vec2 vUv;
    vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
    float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
    void main() {
      vec2 p = aPos * 512.0;
      vUv = aPos;
      float wh = 1.0 - smoothstep(0.88, 1.28, length((p - uHead.xy) / uHead.zw));
      float wa = (uArmRF.x > 0.0) ? 1.0 - smoothstep(uArmRF.x, uArmRF.x + uArmRF.y, seg(p, uArmA, uArmB)) : 0.0;
      wa *= 1.0 - wh;
      vec2 q = rot(p - uPivot, uAngle * wh) + uPivot + uShift * wh;
      q = rot(q - uArmA, uArm * wa) + uArmA;
      vec2 clip = (q - ${VIEW[0].toFixed(1)}) / ${(VIEW[1] - VIEW[0]).toFixed(1)} * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
    }`;
  const FS = `
    precision mediump float;
    uniform sampler2D uTex; varying vec2 vUv;
    uniform vec4 uEye0; uniform vec4 uEye1; uniform float uBlink; uniform vec4 uFur;
    uniform vec4 uLine; uniform float uVisor; uniform float uTime;
    // Pálpebra: pinta com o pelo logo acima do olho e fecha num arco.
    void lid(vec2 p, vec4 e, vec2 fp, float b, inout vec4 c) {
      if (e.z <= 0.0 || b <= 0.01) return;
      vec2 r = e.zw + vec2(3.0, 3.0);
      vec2 d = (p - e.xy) / r;
      float L = length(d);
      if (L > 1.0 || c.a < 0.5) return;
      float lum = dot(c.rgb, vec3(0.3, 0.59, 0.11));
      float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
      if (!(L < 0.86 || lum < 0.62 || (lum > 0.78 && sat < 0.25))) return;
      // a pálpebra desce até um pouco abaixo do meio; fechada, cobre o olho todo
      float curve = (1.0 - d.x * d.x) * r.y * 0.28;
      float y = e.y - r.y + 1.25 * r.y * b + curve * b;
      vec4 fur = texture2D(uTex, (fp + vec2(p.x - e.x, 0.0) * 0.3) / 512.0);
      fur.a = 1.0;
      if (p.y < y || b > 0.9) c = mix(fur, fur * 0.88, smoothstep(y - 8.0, y, p.y));
      if (abs(p.y - y) < 2.6 && b > 0.05) c = vec4(0.30, 0.17, 0.09, 1.0);
    }
    float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
    // Óculos de realidade aumentada: uma lente em cada olho e uma ponte.
    void lens(vec2 p, vec2 ctr, float rad, inout vec4 c, inout float hit) {
      float d = length(p - ctr);
      if (d < rad + 4.5) {
        float scan = 0.5 + 0.5 * sin((p.y - p.x * 0.4) * 0.35 - uTime * 10.0);
        vec3 glass = mix(vec3(0.15, 0.78, 1.0), vec3(0.75, 1.0, 1.0), scan * 0.3);
        vec4 inside = vec4(mix(c.rgb, glass, 0.55) + smoothstep(rad * 0.9, rad * 0.2, length(p - ctr + vec2(rad * 0.35, rad * 0.4))) * 0.3, 1.0);
        c = d < rad ? inside : vec4(0.11, 0.2, 0.28, 1.0);
        hit = 1.0;
      }
    }
    void main() {
      vec4 c = texture2D(uTex, vUv);
      vec2 p = vUv * 512.0;
      lid(p, uEye0, uFur.xy, uBlink, c); lid(p, uEye1, uFur.zw, uBlink, c);
      if (uVisor > 0.0) {
        float hit = 0.0;
        float r0 = 31.0 * uVisor, r1 = 24.0 * uVisor;
        lens(p, uLine.xy, r0, c, hit);
        lens(p, uLine.zw, r1, c, hit);
        vec2 dir = normalize(uLine.zw - uLine.xy);
        float br = seg(p, uLine.xy + dir * r0, uLine.zw - dir * r1);
        if (hit < 0.5 && br < 4.0 * uVisor) c = vec4(0.11, 0.2, 0.28, 1.0);
        // haste até a orelha
        float arm = seg(p, uLine.xy - dir * r0, uLine.xy - dir * (r0 + 46.0));
        if (hit < 0.5 && arm < 4.0 * uVisor) c = vec4(0.11, 0.2, 0.28, 1.0);
      }
      gl_FragColor = vec4(c.rgb * c.a, c.a);
    }`;

  let gl, glCanvas, prog, loc = {}, tex = {}, count = 0;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  async function load(base) {
    glCanvas = document.createElement('canvas');
    glCanvas.width = glCanvas.height = RES;
    gl = glCanvas.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog); gl.useProgram(prog);
    for (const n of ['aPos', 'uHead', 'uPivot', 'uAngle', 'uShift', 'uArmA', 'uArmB', 'uArmRF', 'uArm', 'uTex', 'uEye0', 'uEye1', 'uBlink', 'uFur', 'uLine', 'uVisor', 'uTime'])
      loc[n] = n[0] === 'a' ? gl.getAttribLocation(prog, n) : gl.getUniformLocation(prog, n);
    // malha
    const v = [];
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      const x0 = i / GRID, x1 = (i + 1) / GRID, y0 = j / GRID, y1 = (j + 1) / GRID;
      v.push(x0, y0, x1, y0, x0, y1, x1, y0, x1, y1, x0, y1);
    }
    count = v.length / 2;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc.aPos);
    gl.vertexAttribPointer(loc.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    await Promise.all(Object.keys(POSES).map(async (p) => {
      const im = new Image(); im.src = `${base}${p}.webp`; await im.decode();
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      tex[p] = t;
    }));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  function render(s) {
    const P = POSES[s.pose || 'neutro'];
    gl.viewport(0, 0, RES, RES);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, tex[s.pose || 'neutro']);
    gl.uniform1i(loc.uTex, 0);
    gl.uniform4f(loc.uHead, ...P.head);
    gl.uniform2f(loc.uPivot, ...P.pivot);
    gl.uniform1f(loc.uAngle, ((s.head || 0) * Math.PI) / 180);
    gl.uniform2f(loc.uShift, s.lookX || 0, s.nod || 0);
    const arm = P.arm;
    gl.uniform2f(loc.uArmA, ...(arm ? arm.a : [0, 0]));
    gl.uniform2f(loc.uArmB, ...(arm ? arm.b : [1, 1]));
    gl.uniform2f(loc.uArmRF, arm ? arm.r : 0, arm ? arm.f : 0);
    gl.uniform1f(loc.uArm, ((s.arm || 0) * Math.PI) / 180);
    const e = P.eyes;
    gl.uniform4f(loc.uEye0, ...(e[0] || [0, 0, 0, 0]));
    gl.uniform4f(loc.uEye1, ...(e[1] || [0, 0, 0, 0]));
    gl.uniform1f(loc.uBlink, s.blink || 0);
    // cor da pálpebra: o pelo entre o olho e o centro da cabeça
    const furAt = (eye) => {
      if (!eye) return [0, 0];
      const dx = P.head[0] - eye[0], dy = P.head[1] - eye[1] - 30, d = Math.hypot(dx, dy) || 1, k = Math.max(eye[2], eye[3]) + 10;
      return [eye[0] + (dx / d) * k, eye[1] + (dy / d) * k];
    };
    gl.uniform4f(loc.uFur, ...furAt(e[0]), ...furAt(e[1]));
    gl.uniform4f(loc.uLine, ...P.line[0], ...P.line[1]);
    gl.uniform1f(loc.uVisor, s.visor || 0);
    gl.uniform1f(loc.uTime, s.time || 0);
    gl.drawArrays(gl.TRIANGLES, 0, count);
  }

  // Um Tico na tela: um canvas 2D que recebe a cópia do quadro do WebGL.
  function create(parent, size) {
    const el = document.createElement('div');
    el.style.cssText = `position:absolute;width:${size}px;height:${size}px;transform-origin:50% 92%;`;
    const c = document.createElement('canvas');
    c.width = c.height = RES;
    // a área do canvas é maior que a imagem: alinha a imagem (0..512) com o div
    const k = size / 512;
    c.style.cssText = `position:absolute;left:${VIEW[0] * k}px;top:${VIEW[0] * k}px;width:${(VIEW[1] - VIEW[0]) * k}px;height:${(VIEW[1] - VIEW[0]) * k}px;`;
    el.appendChild(c);
    parent.appendChild(el);
    const ctx = c.getContext('2d');
    return {
      el,
      draw(s) {
        render(s);
        ctx.clearRect(0, 0, RES, RES);
        ctx.drawImage(glCanvas, 0, 0);
      },
    };
  }

  // Piscada natural: rápida, com intervalos irregulares (fixos pela semente).
  function blinkAt(t, seed = 1) {
    let at = 0.6 + (seed % 3) * 0.4, i = 0;
    while (at < t + 1) {
      const d = t - at;
      if (d >= 0 && d < 0.16) return d < 0.06 ? d / 0.06 : 1 - (d - 0.06) / 0.1;
      const r = Math.sin((i + seed) * 91.7) * 43758.5; at += 1.6 + (r - Math.floor(r)) * 2.2; i++;
    }
    return 0;
  }

  window.TicoRig = { load, create, blinkAt, POSES };
})();
