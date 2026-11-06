import { useEffect, useRef } from "react";
import { XIcon } from "@phosphor-icons/react";
import type { Work } from "../works";

type WorkDialogProps = { work: Work | null; onClose: () => void };

export function WorkDialog({ work, onClose }: WorkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (work && !dialog.open) dialog.showModal();
    if (!work && dialog.open) dialog.close();
  }, [work]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
      aria-labelledby="work-dialog-title"
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-pond-deep/95 text-foam backdrop:bg-transparent"
    >
      {work && (
        <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center gap-8 px-4 py-20 sm:px-8">
          <div className="flex justify-center gap-3">
            {work.images.map((picture) => (
              <img
                key={picture.src}
                src={picture.src}
                alt={picture.alt}
                className="max-h-[65dvh] min-w-0 rounded-xs object-contain"
              />
            ))}
          </div>
          <div className="mx-auto w-full max-w-2xl">
            <h2 id="work-dialog-title" className="type-work-title">
              {work.title}
            </h2>
            <p className="type-work-detail">{work.detail}</p>
            {work.note && <p className="mt-5 text-foam/85">{work.note}</p>}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 grid size-11 place-items-center rounded-full text-foam-dim transition-colors hover:bg-foam/10 hover:text-foam"
      >
        <XIcon size={22} />
      </button>
    </dialog>
  );
}
