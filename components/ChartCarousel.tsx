"use client";

import { useEffect, useState } from "react";

export function ChartCarousel({ slides }: { slides: React.ReactNode[] }) {
  const [indeks, setIndeks] = useState(0);
  const ostatni = slides.length - 1;

  function przejdz(kierunek: -1 | 1) {
    setIndeks((biezacy) => {
      const nastepny = biezacy + kierunek;
      if (nastepny < 0) {
        return ostatni;
      }
      if (nastepny > ostatni) {
        return 0;
      }
      return nastepny;
    });
  }

  useEffect(() => {
    function naKlawisz(zdarzenie: KeyboardEvent) {
      const cel = zdarzenie.target;
      if (
        cel instanceof HTMLElement &&
        (cel.tagName === "INPUT" ||
          cel.tagName === "TEXTAREA" ||
          cel.tagName === "SELECT" ||
          cel.isContentEditable)
      ) {
        return;
      }
      if (zdarzenie.key === "ArrowLeft") {
        zdarzenie.preventDefault();
        przejdz(-1);
      }
      if (zdarzenie.key === "ArrowRight") {
        zdarzenie.preventDefault();
        przejdz(1);
      }
    }

    window.addEventListener("keydown", naKlawisz);
    return () => window.removeEventListener("keydown", naKlawisz);
  }, [ostatni]);

  return (
    <div className="carousel">
      <div className="carousel__stage">{slides[indeks]}</div>
      <div className="carousel__nav">
        <button type="button" onClick={() => przejdz(-1)} aria-label="Poprzedni wykres">
          ←
        </button>
        <span>
          Wykres {indeks + 1} z {slides.length}
        </span>
        <button type="button" onClick={() => przejdz(1)} aria-label="Następny wykres">
          →
        </button>
      </div>
    </div>
  );
}
