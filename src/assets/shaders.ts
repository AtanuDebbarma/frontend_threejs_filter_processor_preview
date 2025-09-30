// src/assets/shaders.ts

export const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.);
  }
`;

export const fragmentShader = `
  // ✅ Always use mediump for safer WebGL memory on all devices
  precision mediump float;

  uniform sampler2D tDiffuse;
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
  uniform float blur;

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
    float cs = cos(angle);
    float sn = sin(angle);
    mat3 rot = mat3(
      cs + (1.0 - cs) / 3.0, 1.0/3.0 * (1.0 - cs) - sn / sqrt(3.0), 1.0/3.0 * (1.0 - cs) + sn / sqrt(3.0),
      1.0/3.0 * (1.0 - cs) + sn / sqrt(3.0), cs + 1.0/3.0 * (1.0 - cs), 1.0/3.0 * (1.0 - cs) - sn / sqrt(3.0),
      1.0/3.0 * (1.0 - cs) - sn / sqrt(3.0), 1.0/3.0 * (1.0 - cs) + sn / sqrt(3.0), cs + 1.0/3.0 * (1.0 - cs)
    );
    return rot * color;
  }

  // ✅ small 3x3 blur only (safe for WebView)
  vec3 boxBlur(sampler2D samp, vec2 uv) {
    vec2 texel = 1.0 / vec2(textureSize(samp, 0));
    vec3 sum = vec3(0.0);
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        sum += texture2D(samp, uv + vec2(float(i), float(j)) * texel).rgb;
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
    vec4 sampled = texture2D(tDiffuse, vUv);
    vec3 c = sampled.rgb;

    if (u_inputRange > 0.5) {
      c = limitedToFull(c);
    }

    if (u_colorSpace < 0.5) {
      c = sRGBToLinear(c);
    } else if (u_colorSpace < 1.5) {
      c = rec709ToLinear(c);
    }

    // eq (brightness / contrast / sat)
    c += vec3(brightness);
    c = applyContrast(c, contrast);
    c = applySaturation(c, saturation);

    c += colorBalance;

    if (abs(hue) > 0.0001) {
      c = hueRotate(c, hue);
    }

    if (hasCurve > 0.5) {
      c.r = texture2D(curveTex, vec2(clamp(c.r, 0.0, 1.0), 0.5)).r;
      c.g = texture2D(curveTex, vec2(clamp(c.g, 0.0, 1.0), 0.5)).g;
      c.b = texture2D(curveTex, vec2(clamp(c.b, 0.0, 1.0), 0.5)).b;
    }

    c = applyShadowsHighlights(c, shadows, highlights);
    c = applyTemperature(c, temperature);

    // ✅ unsharp: capped for WebView
    if (unsharpAmount > 0.0001) {
      float capped = min(unsharpAmount, 0.8);
      vec3 orig = c;
      vec3 blurSrgb = boxBlur(tDiffuse, vUv);
      vec3 blurLinear;
      if (u_colorSpace < 0.5) blurLinear = sRGBToLinear(blurSrgb);
      else if (u_colorSpace < 1.5) blurLinear = rec709ToLinear(blurSrgb);
      else blurLinear = blurSrgb;
      c = mix(orig, orig + (orig - blurLinear) * capped, 1.0);
    }

    // ✅ blur: capped for WebView
    if (blur > 0.01) {
      float cappedBlur = min(blur, 0.2);
      vec3 blurred = boxBlur(tDiffuse, vUv);
      c = mix(c, blurred, cappedBlur / 10.0);
    }

    if (abs(gammaVal - 1.0) > 0.001) {
      c = pow(c, vec3(1.0 / gammaVal));
    }

    if (u_colorSpace < 0.5) {
      c = linearToSRGB(c);
    } else if (u_colorSpace < 1.5) {
      c = linearToRec709(c);
    }

    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }
`;
