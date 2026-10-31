/**
 * Arctic Reconnaissance / Snow Shader
 * Adapted from God's Eye View (c) Bilawal Sidhu (MIT License)
 * Cold winter atmosphere with high-altitude frost, desaturated terrain, and particle dynamics.
 */
export const snowShader = {
  name: 'snow',
  fragmentShader: /* glsl */ `
    uniform sampler2D colorTexture;
    uniform vec2 colorTextureDimensions;
    uniform float intensity;
    uniform float time;
    in vec2 v_textureCoordinates;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = v_textureCoordinates;
      vec4 orig = texture(colorTexture, uv);

      // Cold tint & desaturation
      float luma = dot(orig.rgb, vec3(0.299, 0.587, 0.114));
      vec3 coldTint = vec3(0.85, 0.92, 1.05) * (luma * 1.1 + 0.05);

      // Light animated frost / snow particle layers
      vec2 snowUV = uv * vec2(2.0, 1.0) * 12.0;
      snowUV.y += time * 0.4;
      snowUV.x += sin(time * 0.3 + uv.y * 3.0) * 0.1;
      vec2 cell = floor(snowUV);
      float p = hash(cell);
      float particle = smoothstep(0.92, 0.98, p) * smoothstep(0.4, 0.0, length(fract(snowUV) - 0.5));

      vec3 result = mix(orig.rgb, coldTint + vec3(particle * 0.5), intensity);
      out_FragColor = vec4(clamp(result, 0.0, 1.0), 1.0);
    }
  `
};
