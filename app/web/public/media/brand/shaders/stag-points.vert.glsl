precision highp float;

uniform float uTime;
uniform float uProgress;
uniform float uPointSize;
uniform vec2  uPointer;
uniform float uPointerForce;

attribute vec3 aScatterPos;
attribute float aSeed;

varying float vDepth;
varying float vSeed;

void main() {
  vSeed = aSeed;
  vDepth = position.z;

  float delay = aSeed * 0.45;
  float t = clamp((uProgress - delay) / 0.55, 0.0, 1.0);
  t = smoothstep(0.0, 1.0, t);

  vec3 currentPos = mix(aScatterPos, position, t);

  float driftAngle = uTime * 0.75 + aSeed * 6.2831853;
  vec3 ambientDrift = vec3(
    sin(driftAngle * 1.1) * 0.02,
    cos(driftAngle * 0.85) * 0.02,
    sin(driftAngle * 1.35) * 0.015
  ) * mix(1.0, 0.35, t);
  currentPos += ambientDrift;

  vec2 deltaPointer = currentPos.xy - uPointer;
  float distToPointer = length(deltaPointer);

  float repelRadius = 0.55;
  if (distToPointer < repelRadius && distToPointer > 0.0001) {
    float falloff = 1.0 - (distToPointer / repelRadius);
    falloff = falloff * falloff;
    vec2 repelDir = deltaPointer / distToPointer;
    currentPos.xy += repelDir * (falloff * uPointerForce * 0.4);
    currentPos.z -= falloff * uPointerForce * 0.15;
  }

  vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  gl_PointSize = uPointSize;
}
