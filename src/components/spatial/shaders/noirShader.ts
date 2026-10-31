/**
 * Noir Reconnaissance Shader
 * Adapted from God's Eye View (c) Bilawal Sidhu (MIT License)
 * Tactical high-contrast black & white imagery with film grain and optical vignette.
 */
export const noirShader = {
  name: 'noir',
  fragmentShader: /* glsl */ `
    uniform sampler2D colorTexture;
    uniform vec2 colorTextureDimensions;
    uniform float intensity;
    uniform float contrastAmt;
    uniform float grainAmt;
    uniform float vignetteAmt;
    in vec2 v_textureCoordinates;

    void main() {
      vec2 uv = v_textureCoordinates;
      vec4 color = texture(colorTexture, uv);

      // Desaturate to luminance
      float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 gray = vec3(luma);
      vec3 desaturated = mix(color.rgb, gray, intensity);

      // High contrast curve
      float contrast = 1.0 + (contrastAmt > 0.0 ? contrastAmt : 1.3) * intensity;
      vec3 contrasted = (desaturated - 0.5) * contrast + 0.5;
      contrasted = clamp(contrasted, 0.0, 1.0);

      // Recon film grain
      float grain = fract(sin(dot(uv * colorTextureDimensions, vec2(12.9898, 78.233))) * 43758.5453);
      grain = (grain - 0.5) * 0.07 * (grainAmt > 0.0 ? grainAmt : 0.6) * intensity;
      contrasted += grain;

      // Optical lens vignette
      vec2 vigUV = uv * (1.0 - uv);
      float vig = vigUV.x * vigUV.y * 15.0;
      vig = clamp(pow(vig, 0.35), 0.0, 1.0);
      contrasted *= mix(1.0, vig, (vignetteAmt > 0.0 ? vignetteAmt : 0.6) * intensity);

      out_FragColor = vec4(clamp(contrasted, 0.0, 1.0), 1.0);
    }
  `
};
