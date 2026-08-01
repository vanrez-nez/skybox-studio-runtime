// Disc geometry constants, in their own module because both the baker and the light
// rig need them and importing across those two directly would make a cycle.

// Fraction of the texture width the disc spans. The margin keeps the antialiased
// limb and the shadow/AO taps off the texture edge, and — mostly — reserves room for
// the halo, which is baked into the sprite rather than added as a post-process.
export const DISC_FILL = 0.72;

// How far past the limb the texture actually extends, in disc radii (1.0 = the
// limb). The halo's reach is a fraction of this, so it can never overrun the texture
// and get sliced off square at the edge.
export const DISC_MARGIN = 1 / DISC_FILL - 1;

