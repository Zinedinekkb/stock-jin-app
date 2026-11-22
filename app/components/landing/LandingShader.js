// app/components/landing/LandingShader.js
// Full-bleed WebGL aurora used behind the dark sections of the landing page.
// Raw WebGL1 (no library): one triangle, a domain-warped fbm fragment shader.
// Renders at reduced resolution, pauses off-screen, and draws a single still
// frame when the visitor prefers reduced motion.
'use client';

import React, { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_scroll;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;
  float t = u_time * 0.06;

  // domain warp: noise feeding noise gives the slow "liquid light" motion
  vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 - t + 4.0));
  vec2 r = vec2(fbm(p * 1.4 + 3.0 * q + vec2(1.7, 9.2) + t * 1.4),
                fbm(p * 1.4 + 3.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p * 1.2 + 2.5 * r + u_scroll * 0.6);

  vec3 base   = vec3(0.075, 0.098, 0.133);  // #131922
  vec3 violet = vec3(0.39, 0.33, 0.85);     // brand #6355d8
  vec3 teal   = vec3(0.13, 0.75, 0.78);
  vec3 rose   = vec3(0.93, 0.36, 0.55);

  vec3 col = base;
  col = mix(col, violet, smoothstep(0.35, 0.95, f) * 0.75);
  col = mix(col, teal,   smoothstep(0.55, 1.05, r.x) * 0.45);
  col = mix(col, rose,   smoothstep(0.62, 1.10, q.y) * 0.25);

  // keep the centre readable: darken toward the middle, glow toward the edges
  float vig = smoothstep(0.15, 0.95, length(p * vec2(0.8, 1.1)));
  col = mix(base, col, 0.35 + 0.65 * vig);
  col *= 0.85 + 0.15 * uv.y;
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('[LandingShader]', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export default function LandingShader({ className = '', scrollVarHost }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    // The canvas is created per mount: a context released by loseContext() on unmount
    // can never draw again, and React dev mode mounts effects twice.
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return undefined; // CSS gradient behind stays as the fallback
    host.appendChild(canvas);

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = vs && fs ? gl.createProgram() : null;
    if (prog) {
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
    }
    if (!prog || !gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.remove();
      return undefined;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uScroll = gl.getUniformLocation(prog, 'u_scroll');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const RES = 0.5; // render at half resolution; the image is soft anyway
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr * RES));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr * RES));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    let raf = 0;
    let visible = false;
    const start = performance.now();
    const draw = (now) => {
      resize();
      const host = scrollVarHost?.current;
      const scroll = host ? parseFloat(getComputedStyle(host).getPropertyValue('--p')) || 0 : 0;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduce ? 12.0 : (now - start) / 1000);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now) => {
      draw(now);
      raf = visible && !reduce ? requestAnimationFrame(loop) : 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const onResize = () => { if (!raf) draw(performance.now()); };
    window.addEventListener('resize', onResize);
    draw(start);

    return () => {
      io.disconnect();
      window.removeEventListener('resize', onResize);
      if (raf) cancelAnimationFrame(raf);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
  }, [scrollVarHost]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
