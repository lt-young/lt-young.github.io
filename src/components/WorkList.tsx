import { works, type Work } from "../works";
import { useSurfacedWork } from "./useSurfacedWork";
import { WorkPiece } from "./WorkPiece";

export function WorkList({ onOpen }: { onOpen: (work: Work) => void }) {
  const { surfacedId, register, setPointedId } = useSurfacedWork();

  return (
    <ol className="mx-auto flex max-w-6xl flex-col gap-[16svh] px-4 sm:px-8">
      {works.map((work) => (
        <WorkPiece
          key={work.id}
          work={work}
          surfaced={surfacedId === work.id}
          register={register(work.id)}
          onPoint={(pointing) => setPointedId((current) => (pointing ? work.id : current === work.id ? null : current))}
          onOpen={() => onOpen(work)}
        />
      ))}
    </ol>
  );
}
