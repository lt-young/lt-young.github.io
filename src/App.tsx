import { useState } from "react";
import { InstagramLogoIcon } from "@phosphor-icons/react";
import { Pond } from "./pond/Pond";
import { Hero } from "./components/Hero";
import { WorkList } from "./components/WorkList";
import { WorkDialog } from "./components/WorkDialog";
import type { Work } from "./works";

export function App() {
  const [openWork, setOpenWork] = useState<Work | null>(null);

  return (
    <>
      <Pond />
      <div className="relative z-10">
        <Hero />
        <main>
          <p className="type-statement mx-auto max-w-2xl px-4 pt-[18vh] pb-[30vh] text-center sm:px-8">
            My experimental approach to art examines the human experience of time in our rapidly unfurling digital age.
          </p>
          <WorkList onOpen={setOpenWork} />
        </main>
        <footer className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-[40vh] pb-10 text-sm text-foam-dim sm:px-8">
          <span>Lauren Young</span>
          <a
            href="https://www.instagram.com/1aurstudios_/"
            className="-m-2 flex items-center gap-2 rounded-xs p-2 transition-colors hover:text-foam"
          >
            <InstagramLogoIcon size={20} aria-hidden />
            1aurstudios_
          </a>
        </footer>
      </div>
      <WorkDialog work={openWork} onClose={() => setOpenWork(null)} />
    </>
  );
}
