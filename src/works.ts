export type Placement = "left" | "right" | "center";
export type Size = "large" | "medium" | "small";

export type Work = {
  id: string;
  title: string;
  detail: string;
  images: { src: string; alt: string }[];
  note?: string;
  placement: Placement;
  size: Size;
};

const image = (file: string, alt: string) => ({ src: `${import.meta.env.BASE_URL}works/${file}`, alt });

export const works: Work[] = [
  {
    id: "invisible-circus",
    title: "Invisible Circus",
    detail: "Oil on canvas, 36 × 24 in, 2024",
    images: [
      image(
        "invisible-circus.jpg",
        "A self-portrait of a young woman's face, with tiny versions of herself climbing out of her eye, pulling at her cheek and spinning around her hair.",
      ),
    ],
    note: "My mind often houses an invisible circus of competing thoughts and impulses. I redefine my relationship with my own visage by processing all my internal and external thoughts, impulses, and sensations through art in an introspective yet playful process.",
    placement: "left",
    size: "large",
  },
  {
    id: "doomscrolled",
    title: "Doomscrolled",
    detail: "Air-dry clay, light bulb, stuffed tights and acrylic on canvas, 24 × 30 in, 2025",
    images: [
      image(
        "doomscrolled.jpg",
        "A sculpted brain in cross-section with a curled-up human figure inside it, lit from within by a glowing bulb.",
      ),
    ],
    note: "An artificial light source illuminates the amygdala, simulating brain activity. Upon the recognition of human limbs curled up in a claustrophobic position, the light becomes the oversaturating glow of the screen, bringing along suppressed feelings of shame that go hand in hand with excessive screen use.",
    placement: "right",
    size: "medium",
  },
  {
    id: "unfolded-box",
    title: "The Unfolded Box",
    detail: "Watercolor and colored pencil on illustration board, 32 × 24 in, 2025",
    images: [
      image(
        "unfolded-box.jpg",
        "A cubicle painted as an unfolded cardboard box, each face crowded with desks, papers and office chairs seen from above.",
      ),
    ],
    note: "Expanding upon the themes of isolation and overwork in 80,000 Hours, corporate time becomes simultaneously discarded yet made to be an active antagonist. The Unfolded Box examines the multitude of pressures compressed within one cubicle.",
    placement: "center",
    size: "large",
  },
  {
    id: "handle-with-care",
    title: "Handle with Care",
    detail: "Acrylic, 28 × 32 in, 2025",
    images: [
      image(
        "handle-with-care.jpg",
        "Two panels: a moving truck with its cargo door open, and battered cardboard boxes spilling from it off the edge of the canvas.",
      ),
    ],
    note: "Despite the cargo door being open, most of the boxes in this U-Haul, a symbol of the mind, remain secure. Only the older, battered boxes, labeled fragile but placed nearest the door, fall away.",
    placement: "left",
    size: "medium",
  },
  {
    id: "follow-your-current",
    title: "Follow your current",
    detail: "Cover for the 2026–27 Orange County School of the Arts planner, digital painting",
    images: [
      image("planner-front.jpg", "Front cover: an orange and white koi curving through deep blue water."),
      image("planner-back.jpg", "Back cover: the same koi's tail and fins trailing through the water."),
    ],
    placement: "right",
    size: "large",
  },
  {
    id: "picture-perfect",
    title: "Picture Perfect",
    detail: "Film poster",
    images: [
      image(
        "picture-perfect.jpg",
        "Film poster: a woman in sunglasses whose lenses reflect scenes from the film.",
      ),
    ],
    placement: "left",
    size: "small",
  },
  {
    id: "cohort-13",
    title: "Cohort 13",
    detail: "Lockup for USC Iovine and Young Academy",
    images: [image("cohort13.jpg", "Gold IYA monogram with the words Cohort 13, framed in red on black.")],
    placement: "right",
    size: "small",
  },
  {
    id: "driven-by-creativity",
    title: "Driven by Creativity",
    detail: "Visual arts logo",
    images: [
      image("driven-by-creativity.jpg", "A hand-drawn Volkswagen Beetle between the words driven by creativity."),
    ],
    placement: "center",
    size: "small",
  },
  {
    id: "thespians",
    title: "OCSA Thespians",
    detail: "Illustration for the school's theatre troupe",
    images: [image("camera-logo.jpg", "A blue hand-drawn camera bursting out of a yellow star.")],
    placement: "left",
    size: "small",
  },
  {
    id: "standard-physics",
    title: "Standard Physics",
    detail: "App icon",
    images: [image("standard-physics.jpg", "The letters S and P in white on navy, each with a double-headed arrow.")],
    placement: "right",
    size: "small",
  },
];
