import { ChartCarousel } from "@/components/ChartCarousel";
import { FAZY, type RaportObciazenia } from "@/lib/load-report";

const ODCZYT = "#1d4638";
const ZAPIS = "#b5522a";
const PLAN = "#8d8376";
const PROG = "#8c3b1c";

function czas(ms: number) {
  if (ms >= 10000) {
    return `${Math.round(ms / 1000)} s`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)} s`;
  }
  return `${Math.round(ms)} ms`;
}

function procent(wartosc: number) {
  return `${(wartosc * 100).toFixed(wartosc > 0 && wartosc < 0.01 ? 2 : 1)}%`;
}

function liczba(wartosc: number) {
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(
    wartosc,
  );
}

function yLog(wartosc: number, min: number, max: number, wysokosc: number) {
  const bezpieczna = Math.min(max, Math.max(wartosc, min));
  const t = Math.log(bezpieczna / min) / Math.log(max / min);
  return wysokosc - t * wysokosc;
}

export function ReportCharts({
  odczyt,
  zapis,
}: {
  odczyt: RaportObciazenia;
  zapis: RaportObciazenia;
}) {
  return (
    <ChartCarousel
      slides={[
        <ChartCard
          key="p95"
          kicker="Zmiana w czasie"
          title="Czas odpowiedzi p95"
          note="Skala logarytmiczna. Linia przerywana to próg 600 ms z założeń testu."
        >
          <LatencyChart odczyt={odczyt} zapis={zapis} />
        </ChartCard>,
        <ChartCard
          key="plan"
          kicker="Porównanie"
          title="Plan a dokończone żądania"
          note="10/s i 200/s to plan. Słupki obok pokazują, ile żądań na sekundę usługa naprawdę domknęła."
        >
          <ThroughputChart odczyt={odczyt} zapis={zapis} />
        </ChartCard>,
        <ChartCard
          key="bledy"
          kicker="Zmiana w czasie"
          title="Odsetek błędów HTTP"
          note="Próg z prezentacji to mniej niż 1% błędów."
        >
          <ErrorChart odczyt={odczyt} zapis={zapis} />
        </ChartCard>,
        <ChartCard
          key="kody"
          kicker="Rozkład"
          title="Kody odpowiedzi"
          note="502 to odmowa bramki Rendera, gdy instancja nie nadążała z odpowiedzią."
        >
          <StatusChart odczyt={odczyt} zapis={zapis} />
        </ChartCard>,
      ]}
    />
  );
}

function ChartCard({
  kicker,
  title,
  note,
  children,
}: {
  kicker: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <article className="chart-card">
      <p className="chart-card__kicker">{kicker}</p>
      <h3>{title}</h3>
      {children}
      <p className="chart-card__note">{note}</p>
    </article>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span>
        <i style={{ background: ODCZYT }} /> Odczyt strony
      </span>
      <span>
        <i style={{ background: ZAPIS }} /> Zapis do bazy
      </span>
    </div>
  );
}

function LatencyChart({
  odczyt,
  zapis,
}: {
  odczyt: RaportObciazenia;
  zapis: RaportObciazenia;
}) {
  const min = 80;
  const max = 60000;
  const szerokosc = 520;
  const wysokosc = 250;
  const lewo = 46;
  const gora = 18;
  const dol = 32;
  const poleW = szerokosc - lewo - 12;
  const poleH = wysokosc - gora - dol;
  const grupy = FAZY.length;
  const szerGrupy = poleW / grupy;
  const slupek = 18;
  const ticki = [100, 600, 1000, 10000, 60000];

  return (
    <figure>
      <Legend />
      <svg viewBox={`0 0 ${szerokosc} ${wysokosc}`} role="img">
        <title>Czas p95 odczytu i zapisu w trzech fazach ruchu</title>
        {ticki.map((tick) => {
          const y = gora + yLog(tick, min, max, poleH);
          return (
            <g key={tick}>
              <line
                x1={lewo}
                x2={szerokosc - 12}
                y1={y}
                y2={y}
                stroke={tick === 600 ? PROG : "rgba(28,23,18,0.12)"}
                strokeDasharray={tick === 600 ? "4 4" : undefined}
              />
              <text x={lewo - 6} y={y + 4} textAnchor="end" className="axis">
                {czas(tick)}
              </text>
            </g>
          );
        })}
        {FAZY.map((faza, indeks) => {
          const srodek = lewo + szerGrupy * indeks + szerGrupy / 2;
          const wartosci = [
            odczyt.fazy[faza.klucz].p95,
            zapis.fazy[faza.klucz].p95,
          ];
          const kolory = [ODCZYT, ZAPIS];
          return (
            <g key={faza.klucz}>
              {wartosci.map((wartosc, numer) => {
                const y = gora + yLog(wartosc, min, max, poleH);
                const dolna = gora + poleH;
                const x = srodek + (numer === 0 ? -slupek - 3 : 3);
                return (
                  <g key={kolory[numer]}>
                    <rect
                      x={x}
                      y={y}
                      width={slupek}
                      height={Math.max(2, dolna - y)}
                      rx={4}
                      fill={kolory[numer]}
                    />
                    <text
                      x={x + slupek / 2}
                      y={y - 4}
                      textAnchor="middle"
                      className="bar-label"
                    >
                      {czas(wartosc)}
                    </text>
                  </g>
                );
              })}
              <text
                x={srodek}
                y={wysokosc - 10}
                textAnchor="middle"
                className="axis"
              >
                {faza.etykieta}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function ThroughputChart({
  odczyt,
  zapis,
}: {
  odczyt: RaportObciazenia;
  zapis: RaportObciazenia;
}) {
  const punkty = [
    {
      etykieta: "10/s",
      plan: 10,
      odczyt: odczyt.fazy.normalny.rps,
      zapis: zapis.fazy.normalny.rps,
    },
    {
      etykieta: "200/s",
      plan: 200,
      odczyt: odczyt.fazy.szczyt.rps,
      zapis: zapis.fazy.szczyt.rps,
    },
  ];
  const max = 220;

  return (
    <figure>
      <div className="legend">
        <span>
          <i style={{ background: PLAN }} /> Plan
        </span>
        <span>
          <i style={{ background: ODCZYT }} /> Odczyt
        </span>
        <span>
          <i style={{ background: ZAPIS }} /> Zapis
        </span>
      </div>
      <Slupki
        grupy={punkty.map((punkt) => ({
          etykieta: punkt.etykieta,
          slupki: [
            { wartosc: punkt.plan, kolor: PLAN, podpis: liczba(punkt.plan) },
            { wartosc: punkt.odczyt, kolor: ODCZYT, podpis: liczba(punkt.odczyt) },
            { wartosc: punkt.zapis, kolor: ZAPIS, podpis: liczba(punkt.zapis) },
          ],
        }))}
        max={max}
        formatOsi={(wartosc) => `${wartosc}`}
        ticki={[0, 10, 100, 200]}
      />
    </figure>
  );
}

function ErrorChart({
  odczyt,
  zapis,
}: {
  odczyt: RaportObciazenia;
  zapis: RaportObciazenia;
}) {
  const max = 0.35;
  return (
    <figure>
      <Legend />
      <Slupki
        grupy={FAZY.map((faza) => ({
          etykieta: faza.etykieta,
          slupki: [
            {
              wartosc: odczyt.fazy[faza.klucz].bledy,
              kolor: ODCZYT,
              podpis: procent(odczyt.fazy[faza.klucz].bledy),
            },
            {
              wartosc: zapis.fazy[faza.klucz].bledy,
              kolor: ZAPIS,
              podpis: procent(zapis.fazy[faza.klucz].bledy),
            },
          ],
        }))}
        max={max}
        formatOsi={(wartosc) => `${Math.round(wartosc * 100)}%`}
        ticki={[0, 0.01, 0.1, 0.2, 0.3]}
        prog={0.01}
      />
    </figure>
  );
}

function StatusChart({
  odczyt,
  zapis,
}: {
  odczyt: RaportObciazenia;
  zapis: RaportObciazenia;
}) {
  const wiersze = [
    { nazwa: "Odczyt strony", statusy: odczyt.statusy },
    { nazwa: "Zapis do bazy", statusy: zapis.statusy },
  ];

  return (
    <figure className="status-chart">
      {wiersze.map((wiersz) => {
        const ok = wiersz.statusy["200"] ?? 0;
        const blad = wiersz.statusy["502"] ?? 0;
        const suma = ok + blad || 1;
        return (
          <div key={wiersz.nazwa} className="status-row">
            <div className="status-row__label">
              <strong>{wiersz.nazwa}</strong>
              <span>
                200: {liczba(ok)} · 502: {liczba(blad)}
              </span>
            </div>
            <div className="status-bar" aria-hidden="true">
              <span style={{ width: `${(ok / suma) * 100}%`, background: ODCZYT }} />
              <span style={{ width: `${(blad / suma) * 100}%`, background: ZAPIS }} />
            </div>
          </div>
        );
      })}
    </figure>
  );
}

function Slupki({
  grupy,
  max,
  ticki,
  formatOsi,
  prog,
}: {
  grupy: {
    etykieta: string;
    slupki: { wartosc: number; kolor: string; podpis: string }[];
  }[];
  max: number;
  ticki: number[];
  formatOsi: (wartosc: number) => string;
  prog?: number;
}) {
  const szerokosc = 520;
  const wysokosc = 250;
  const lewo = 42;
  const gora = 18;
  const dol = 32;
  const poleW = szerokosc - lewo - 12;
  const poleH = wysokosc - gora - dol;
  const szerGrupy = poleW / grupy.length;

  return (
    <svg viewBox={`0 0 ${szerokosc} ${wysokosc}`} role="img">
      <title>Wykres słupkowy wyników testu obciążenia</title>
      {ticki.map((tick) => {
        const y = gora + poleH - (tick / max) * poleH;
        return (
          <g key={tick}>
            <line
              x1={lewo}
              x2={szerokosc - 12}
              y1={y}
              y2={y}
              stroke="rgba(28,23,18,0.12)"
            />
            <text x={lewo - 6} y={y + 4} textAnchor="end" className="axis">
              {formatOsi(tick)}
            </text>
          </g>
        );
      })}
      {prog !== undefined ? (
        <line
          x1={lewo}
          x2={szerokosc - 12}
          y1={gora + poleH - (prog / max) * poleH}
          y2={gora + poleH - (prog / max) * poleH}
          stroke={PROG}
          strokeDasharray="4 4"
        />
      ) : null}
      {grupy.map((grupa, indeks) => {
        const srodek = lewo + szerGrupy * indeks + szerGrupy / 2;
        const szer = 16;
        const odstep = 4;
        const calosc = grupa.slupki.length * szer + (grupa.slupki.length - 1) * odstep;
        return (
          <g key={grupa.etykieta}>
            {grupa.slupki.map((slupek, numer) => {
              const wysokoscSlupka = Math.max(2, (slupek.wartosc / max) * poleH);
              const x = srodek - calosc / 2 + numer * (szer + odstep);
              const y = gora + poleH - wysokoscSlupka;
              return (
                <g key={`${grupa.etykieta}-${numer}`}>
                  <rect
                    x={x}
                    y={y}
                    width={szer}
                    height={wysokoscSlupka}
                    rx={4}
                    fill={slupek.kolor}
                  />
                  {slupek.wartosc > 0 ? (
                    <text
                      x={x + szer / 2}
                      y={y - 4}
                      textAnchor="middle"
                      className="bar-label"
                    >
                      {slupek.podpis}
                    </text>
                  ) : null}
                </g>
              );
            })}
            <text
              x={srodek}
              y={wysokosc - 10}
              textAnchor="middle"
              className="axis"
            >
              {grupa.etykieta}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function krotkiWniosek(odczyt: RaportObciazenia, zapis: RaportObciazenia) {
  const zwyklyOdczyt = odczyt.fazy.normalny;
  const zwyklyZapis = zapis.fazy.normalny;
  const szczytOdczyt = odczyt.fazy.szczyt;
  const szczytZapis = zapis.fazy.szczyt;

  return `Przy 10 żądaniach/s odczyt ma p95 ${czas(zwyklyOdczyt.p95)} i błędy ${procent(zwyklyOdczyt.bledy)}, a zapis p95 ${czas(zwyklyZapis.p95)} i błędy ${procent(zwyklyZapis.bledy)}. Przy próbie 200 żądań/s odczyt kończy się p95 ${czas(szczytOdczyt.p95)} i błędami ${procent(szczytOdczyt.bledy)}, a zapis p95 ${czas(szczytZapis.p95)} i błędami ${procent(szczytZapis.bledy)}.`;
}
