precision highp float;

uniform vec3 uColorBase;
uniform vec3 uColorBrand;
uniform vec3 uColorAccent;
uniform float uTime;
uniform float uExit;

varying float vDepth;
varying float vSeed;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }

  float alpha = smoothstep(0.5, 0.04, dist);
  float core = smoothstep(0.32, 0.0, dist);
  float rim = smoothstep(0.18, 0.46, dist) * (1.0 - smoothstep(0.46, 0.5, dist));

  float depthT = clamp((vDepth + 0.10) / 0.22, 0.0, 1.0);
  vec3 rampColor = mix(uColorBrand, uColorAccent, depthT);

  vec3 finalColor = mix(uColorBase, rampColor, 0.82 + core * 0.18);
  finalColor += uColorAccent * (rim * 0.7);

  float pulse = sin(uTime * 2.0 + vSeed * 6.2831853) * 0.1 + 0.9;
  finalColor *= pulse;

  float fade = 1.0 - smoothstep(0.25, 1.0, uExit);
  gl_FragColor = vec4(finalColor, alpha * fade);
}
