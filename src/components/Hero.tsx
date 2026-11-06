import { DIAL_CENTER_FRACTION } from "../pond/dial";

export function Hero() {
  return (
    <header className="relative h-svh">
      <div
        className="absolute left-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 px-4 text-center"
        style={{ top: `${DIAL_CENTER_FRACTION * 100}%` }}
      >
        <h1 className="type-name">Lauren Young</h1>
        <p className="type-lede mt-2">Paintings, sculpture and design</p>
      </div>
    </header>
  );
}
