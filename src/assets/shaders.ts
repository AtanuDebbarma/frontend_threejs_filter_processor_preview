// src/assets/shaders.ts

export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
  }
`;

export const fragmentShader = `
// ✅ fragment shader — webview + browser friendly, blur in linear space
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2 u_texel;            // <-- (1.0 / textureWidth, 1.0 / textureHeight)
uniform float brightness;
uniform float contrast;
uniform float saturation;
uniform float gammaVal;
uniform vec3 colorBalance;
uniform float hue; // radians
uniform float unsharpAmount;
uniform sampler2D curveTex;
uniform float hasCurve;
uniform float u_colorSpace;
uniform float u_inputRange;
uniform float shadows;
uniform float highlights;
uniform float temperature;
uniform float blur;              // expected 0.0..1.0 (adjust mapping below)

varying vec2 vUv;

// ---------- limited range helpers ----------

vec3 limitedToFull(vec3 c) {
  float ymin = 16.0/255.0;
  float ymax = 235.0/255.0;
  float scale = 1.0 / (ymax - ymin);
  return (c - vec3(ymin)) * vec3(scale);
}

// ---------- sRGB transfer ----------
vec3 sRGBToLinear(vec3 c) {
  vec3 cutoff = step(vec3(0.04045), c);
  vec3 low = c / 12.92;
  vec3 high = pow((c + 0.055) / 1.055, vec3(2.4));
  return mix(low, high, cutoff);
}
vec3 linearToSRGB(vec3 c) {
  vec3 cutoff = step(vec3(0.0031308), c);
  vec3 low = c * 12.92;
  vec3 high = 1.055 * pow(c, vec3(1.0/2.4)) - 0.055;
  return mix(low, high, cutoff);
}

 // ---------- Rec.709 transfer ----------
vec3 rec709ToLinear(vec3 c) {
  vec3 mask = step(vec3(0.081), c);
  vec3 low = c / 4.5;
  vec3 high = pow((c + 0.099) / 1.099, vec3(1.0/0.45));
  return mix(low, high, mask);
}
vec3 linearToRec709(vec3 c) {
  vec3 mask = step(vec3(0.018), c);
  vec3 low = c * 4.5;
  vec3 high = 1.099 * pow(c, vec3(0.45)) - 0.099;
  return mix(low, high, mask);
}

// ---------- math helpers ----------
vec3 applyContrast(vec3 col, float cont) {
  return ((col - 0.5) * cont) + 0.5;
}

vec3 applySaturation(vec3 color, float sat) {
  float l = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return mix(vec3(l), color, sat);
}

 // ✅ simplified hue rotation (lighter on ALU than full YIQ)
vec3 hueRotate(vec3 color, float angle) {
  const mat3 rgb2yiq = mat3(
    0.299, 0.587, 0.114,
    0.596, -0.274, -0.322,
    0.211, -0.523, 0.312
  );
  const mat3 yiq2rgb = mat3(
    1.0, 0.956, 0.621,
    1.0, -0.272, -0.647,
    1.0, -1.105, 1.702
  );
  vec3 yiq = rgb2yiq * color;
  float cs = cos(angle);
  float sn = sin(angle);
  mat3 rot = mat3(
    1.0, 0.0, 0.0,
    0.0, cs, -sn,
    0.0, sn, cs
  );
  vec3 yiq2 = rot * yiq;
  return yiq2rgb * yiq2;
}

/* 3x3 box blur, radius scales sample offsets using u_texel */
vec3 boxBlur(sampler2D samp, vec2 uv, vec2 texel, float radius) {
  vec3 sum = vec3(0.0);
  for (int i = -1; i <= 1; i++) {
    for (int j = -1; j <= 1; j++) {
      sum += texture2D(samp, uv + vec2(float(i), float(j)) * texel * radius).rgb;
    }
  }
  return sum / 9.0;
}

vec3 applyTemperature(vec3 color, float temp) {
  float t = temp / 100.0;
  color.r += t * 0.1;
  color.b -= t * 0.1;
  return clamp(color, 0.0, 1.0);
}

vec3 applyShadowsHighlights(vec3 color, float shadowsVal, float highlightsVal) {
  color = mix(color, vec3(0.0), shadowsVal < 0.0 ? -shadowsVal : 0.0);
  color = mix(color, vec3(1.0), highlightsVal > 0.0 ? highlightsVal : 0.0);
  return color;
}

void main() {
  // raw samples from texture (gamma-encoded if sRGB)
  vec4 raw = texture2D(tDiffuse, vUv);
  vec3 srcEnc = raw.rgb;

  // Blur sample — skip 9-tap when neither blur mix nor unsharp needs it
  vec3 blurEnc = srcEnc;
  if (blur > 0.01 || unsharpAmount > 0.0001) {
    float radius = 1.0 + clamp(blur, 0.0, 1.0) * 6.0;
    blurEnc = boxBlur(tDiffuse, vUv, u_texel, radius);
  }

  // if input is limited range, expand both samples first
  if (u_inputRange > 0.5) {
    srcEnc = limitedToFull(srcEnc);
    blurEnc = limitedToFull(blurEnc);
  }

  // convert both to linear (or rec709) BEFORE we do mixes/unsharp
  vec3 srcLin = srcEnc;
  vec3 blurLin = blurEnc;
  if (u_colorSpace < 0.5) {
    srcLin = sRGBToLinear(srcEnc);
    blurLin = sRGBToLinear(blurEnc);
  } else if (u_colorSpace < 1.5) {
    srcLin = rec709ToLinear(srcEnc);
    blurLin = rec709ToLinear(blurEnc);
  }

  // Now operate in linear space
  vec3 c = srcLin;

  // basic adjustments in linear
  c += vec3(brightness);
  c = applyContrast(c, contrast);
  c = applySaturation(c, saturation);
  c += colorBalance;

  if (abs(hue) > 0.0001) {
    c = hueRotate(c, hue);
  }

  if (hasCurve > 0.5) {
    // curve texture was created in 0..1 range; sample and convert if needed
    c.r = texture2D(curveTex, vec2(clamp(c.r, 0.0, 1.0), 0.5)).r;
    c.g = texture2D(curveTex, vec2(clamp(c.g, 0.0, 1.0), 0.5)).g;
    c.b = texture2D(curveTex, vec2(clamp(c.b, 0.0, 1.0), 0.5)).b;
  }

  c = applyShadowsHighlights(c, shadows, highlights);
  c = applyTemperature(c, temperature);

  // Unsharp: use the blur sample converted to same linear space
  if (unsharpAmount > 0.0001) {
    float u = clamp(unsharpAmount, 0.0, 1.0);
    vec3 sharpenedSrc = srcLin + (srcLin - blurLin) * u;
    // use sharpenedSrc as the starting color for subsequent adjustments:
    srcLin = sharpenedSrc;
  }

  // Final blur mix (mix in linear space)
  if (blur > 0.01) {
    // mix weight uses blur directly (0..1) — tweak divisor if you want a gentler effect
    float weight = clamp(blur, 0.0, 1.0);
    c = mix(c, blurLin, weight);
  }

  // gamma correction if requested (apply after mixing)
  // clamp to non-negative to avoid NaNs from pow()
  if (gammaVal > 0.0 && abs(gammaVal - 1.0) > 0.001) {
      c = max(c, vec3(0.0));      // ✅ prevent negative before pow
      c = pow(c, vec3(1.0 / gammaVal));
  }

  // convert back to display color space
  if (u_colorSpace < 0.5) {
    c = linearToSRGB(c);
  } else if (u_colorSpace < 1.5) {
    c = linearToRec709(c);
  }

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), raw.a);
}
`;
