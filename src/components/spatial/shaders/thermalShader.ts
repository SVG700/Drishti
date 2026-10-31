/**
 * FLIR / Thermal Infrared Shader
 * Adapted from God's Eye View (c) Bilawal Sidhu (MIT License)
 * Military-grade thermal imaging with White-Hot / Black-Hot modes, Ironbow
 * Predator heat palette, hot-spot bloom, and thermal gradient banding.
 */
export const thermalShader = {
  name: 'thermal',
  fragmentShader: /* glsl */ `
    uniform sampler2D colorTexture;
    uniform vec2 colorTextureDimensions;
    uniform float intensity;
    uniform float time;
    uniform float sensitivity;
    uniform float bloom;
    uniform float mode; // 0.0 = White-Hot, 1.0 = Ironbow
    uniform float pixelation;
    in vec2 v_textureCoordinates;

    // Ironbow heat color ramp
    vec3 ironbow(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 c;
      if (t < 0.2) {
        c = mix(vec3(0.0, 0.0, 0.1), vec3(0.15, 0.0, 0.45), t / 0.2);
      } else if (t < 0.4) {
        c = mix(vec3(0.15, 0.0, 0.45), vec3(0.65, 0.0, 0.5), (t - 0.2) / 0.2);
      } else if (t < 0.6) {
        c = mix(vec3(0.65, 0.0, 0.5), vec3(0.95, 0.35, 0.0), (t - 0.4) / 0.2);
      } else if (t < 0.8) {
        c = mix(vec3(0.95, 0.35, 0.0), vec3(1.0, 0.85, 0.0), (t - 0.6) / 0.2);
      } else {
        c = mix(vec3(1.0, 0.85, 0.0), vec3(1.0, 1.0, 0.95), (t - 0.8) / 0.2);
      }
      return c;
    }

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = v_textureCoordinates;
      vec2 dims = colorTextureDimensions;
      vec2 texel = 1.0 / dims;

      // Pixelation for sensor resolution feel
      float pix = mix(1.0, max(pixelation, 1.0), intensity);
      vec2 snappedUV = floor(uv * dims / pix) * pix / dims;
      vec2 sampleUV = mix(uv, snappedUV, intensity);

      vec4 orig = texture(colorTexture, sampleUV);
      float luma = dot(orig.rgb, vec3(0.299, 0.587, 0.114));

      // Thermal contrast sensitivity curve
      float temp = pow(luma, mix(1.2, 0.65, sensitivity));

      // Bloom on hot spots
      float bloomSum = 0.0;
      for (int y = -2; y <= 2; y++) {
        for (int x = -2; x <= 2; x++) {
          vec2 offset = vec2(float(x), float(y)) * texel * 2.5;
          float bLuma = dot(texture(colorTexture, sampleUV + offset).rgb, vec3(0.299, 0.587, 0.114));
          bloomSum += smoothstep(0.6, 0.95, bLuma);
        }
      }
      bloomSum /= 25.0;
      temp = clamp(temp + bloomSum * bloom * 0.35, 0.0, 1.0);

      // FLIR White-Hot monochrome vs Ironbow
      vec3 whiteHot = vec3(temp);
      vec3 ironColor = ironbow(temp);
      vec3 flirColor = mix(whiteHot, ironColor, step(0.5, mode));

      // Subtle IR thermal sensor temporal noise
      float noise = (hash(uv * dims + vec2(time * 120.0, time * 80.0)) - 0.5) * 0.04;
      flirColor = clamp(flirColor + noise, 0.0, 1.0);

      // Vignette
      vec2 vigUV = uv * (1.0 - uv);
      float vig = vigUV.x * vigUV.y * 15.0;
      vig = clamp(pow(vig, 0.25), 0.0, 1.0);
      flirColor *= vig;

      vec3 finalColor = mix(orig.rgb, flirColor, intensity);
      out_FragColor = vec4(finalColor, 1.0);
    }
  `
};
