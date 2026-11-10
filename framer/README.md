# Framer code files

Source for the two code files in the Framer version of the portfolio:

- `KoiPond.tsx`: the koi pond from `src/pond`, combined into one Framer code component. Use one instance with Layer "Water" behind the page (sky, water and the swimming koi, so they pass under the artwork) and one with Layer "Surface" above it (the ink koi in the air around the clock).
- `Surfacing.tsx`: the `withSurfacing` override that brings the artwork nearest the middle of the screen into focus and tells the koi which piece to circle.

The site in `src/` is unchanged.
