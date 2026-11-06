import type { Placement, Size, Work } from "../works";

const placementClasses: Record<Placement, string> = {
  left: "sm:mr-auto sm:ml-12 lg:ml-24",
  right: "sm:ml-auto sm:mr-12 lg:mr-24",
  center: "sm:mx-auto",
};

const sizeClasses: Record<Size, string> = {
  large: "sm:max-w-xl",
  medium: "sm:max-w-md",
  small: "sm:max-w-xs",
};

type WorkPieceProps = {
  work: Work;
  surfaced: boolean;
  register: (element: HTMLElement | null) => void;
  onPoint: (pointing: boolean) => void;
  onOpen: () => void;
};

export function WorkPiece({ work, surfaced, register, onPoint, onOpen }: WorkPieceProps) {
  return (
    <li
      ref={register}
      data-surfaced={surfaced}
      className={`group w-full ${placementClasses[work.placement]} ${sizeClasses[work.size]}`}
    >
      <button
        type="button"
        onClick={onOpen}
        onPointerEnter={() => onPoint(true)}
        onPointerLeave={() => onPoint(false)}
        onFocus={() => onPoint(true)}
        onBlur={() => onPoint(false)}
        aria-label={`View ${work.title}`}
        className="block w-fit max-w-full cursor-zoom-in rounded-xs text-left"
      >
        <span className="relative flex w-fit max-w-full gap-2 overflow-hidden rounded-xs shadow-2xl shadow-pond-deep/60 blur-xs brightness-50 saturate-50 transition duration-1000 ease-surface scale-97 group-data-[surfaced=true]:blur-none group-data-[surfaced=true]:brightness-100 group-data-[surfaced=true]:saturate-100 group-data-[surfaced=true]:scale-100 motion-reduce:transition-none">
          {work.images.map((picture) => (
            <img
              key={picture.src}
              src={picture.src}
              alt={picture.alt}
              loading="lazy"
              decoding="async"
              className="block h-auto max-h-[78svh] w-auto min-w-0 max-w-full object-contain"
            />
          ))}
          <span className="absolute inset-0 bg-pond opacity-50 mix-blend-multiply transition-opacity duration-1000 ease-surface group-data-[surfaced=true]:opacity-0 motion-reduce:transition-none" />
        </span>
      </button>
      <div className="mt-4 opacity-35 transition-opacity duration-700 group-data-[surfaced=true]:opacity-100 motion-reduce:transition-none">
        <h2 className="type-work-title">{work.title}</h2>
        <p className="type-work-detail">{work.detail}</p>
      </div>
    </li>
  );
}
