export type PondPalette = {
  paper: string;
  graphite: string;
  pond: string;
  pondDeep: string;
  foam: string;
  koi: string;
  koiCream: string;
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
    koi: token(styles, "koi"),
    koiCream: token(styles, "koi-cream"),
  };
}
