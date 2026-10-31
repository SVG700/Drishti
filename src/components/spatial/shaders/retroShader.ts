/**
 * CRT Retro Terminal Shader
 * Adapted from God's Eye View (c) Bilawal Sidhu (MIT License)
 * Phosphor scanlines, chromatic aberration, barrel bulge distortion, and CRT phosphor decay.
 */
export const retroShader = {
  name: 'retro',
  fragmentShader: /* glsl */ `
    uniform sampler2D colorTexture;
    uniform vec2 colorTextureDimensions;
    uniform float intensity;
    uniform float time;
    uniform float pixelation;
    uniform float distortion;
    uniform float instability;
    in vec2 v_textureCoordinates;

    vec2 barrelDistort(vec2 uv, float k) {
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      return 0.5 + c * (1.0 + k * r2);
    }

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec2 uv = v_textureCoordinates;
      vec2 dims = colorTextureDimensions;

      // Barrel distortion
      float dist = 0.18 * intensity;
      vec2 distUV = barrelDistort(uv, dist);

      if (distUV.x < 0.0 || distUV.x > 1.0 || distUV.y < 0.0 || distUV.y > 1.0) {
        out_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      // Horizontal jitter / instability
      float jitter = (hash(vec2(distUV.y * 100.0, time * 10.0)) - 0.5) * 0.002 * instability * intensity;
      distUV.x += jitter;

      // Pixelation
      float pix = mix(1.0, max(pixelation, 1.0), intensity);
      vec2 snappedUV = floor(distUV * dims / pix) * pix / dims;

      // Chromatic aberration (RGB split)
      float split = 0.003 * intensity;
      float r = texture(colorTexture, snappedUV + vec2(split, 0.0)).r;
      float g = texture(colorTexture, snappedUV).g;
      float b = texture(colorTexture, snappedUV - vec2(split, 0.0)).b;
      vec3 col = vec3(r, g, b);

      // Amber/green CRT phosphor warmth
      vec3 phosphorTint = vec3(1.05, 0.95, 0.7);
      col *= phosphorTint;

      // Scanlines
      float scanline = sin(snappedUV.y * dims.y * 1.5) * 0.5 + 0.5;
      col *= mix(1.0, scanline * 0.3 + 0.7, intensity);

      // Vignette
      vec2 vigUV = uv * (1.0 - uv);
      float vig = vigUV.x * vigUV.y * 15.0;
      vig = clamp(pow(vig, 0.3), 0.0, 1.0);
      col *= vig;

      vec4 orig = texture(colorTexture, uv);
      out_FragColor = vec4(mix(orig.rgb, col, intensity), 1.0);
    }
  `
};
