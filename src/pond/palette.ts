export type PondPalette = {
  paper: string;
  graphite: string;
  pond: string;
  pondDeep: string;
  foam: string;
  koiRed: string;
  koiOrange: string;
  koiGold: string;
  koiGlow: string;
  koiCream: string;
  koiShade: string;
};

function token(styles: CSSStyleDeclaration, name: string) {
  return styles.getPropertyValue(`--color-${name}`).trim();
}

export function readPalette(): PondPalette {
  const styles = getComputedStyle(document.documentElement);
  return {
    paper: token(styles, "paper"),
    graphite: token(styles, "graphite"),
    pond: token(styles, "pond"),
    pondDeep: token(styles, "pond-deep"),
    foam: token(styles, "foam"),
    koiRed: token(styles, "koi-red"),
    koiOrange: token(styles, "koi-orange"),
    koiGold: token(styles, "koi-gold"),
    koiGlow: token(styles, "koi-glow"),
    koiCream: token(styles, "koi-cream"),
    koiShade: token(styles, "koi-shade"),
  };
}
