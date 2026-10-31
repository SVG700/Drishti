export const SPATIAL_CONFIG = {
  perspective: 1200,
  springs: {
    // Precise, controlled spring for pointer tilt
    tilt: { stiffness: 400, damping: 30, mass: 0.8 },
    // Soft fluid spring for mouse parallax background
    parallax: { stiffness: 120, damping: 25, mass: 1 },
    // Crisp snappy spring for modal and window emergence
    modal: { stiffness: 350, damping: 28, mass: 0.9 },
    // Fast spring for button interactions
    button: { stiffness: 500, damping: 25 },
    // Graph node elevation spring
    node: { stiffness: 300, damping: 22 }
  },
  depth: {
    background: -40,
    chassis: 0,
    surface: 0,
    card: 12,
    cardHover: 24,
    control: 6,
    floatingPanel: 32,
    modal: 80,
    commandPalette: 100
  },
  tiltLimits: {
    maxRotateX: 4, // Degrees
    maxRotateY: 4  // Degrees
  }
};
