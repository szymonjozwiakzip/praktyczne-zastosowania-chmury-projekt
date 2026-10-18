import type { Metadata } from "next";
import Link from "next/link";
import { ReportCharts, krotkiWniosek } from "@/components/ReportCharts";
import { readyDatabase, getPool } from "@/lib/db";
import { raportOdczytu, raportZapisu } from "@/lib/load-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Panel zapisów",
  description: "Zgłoszenia z bazy i wykresy z testu obciążenia.",
};

type Podsumowanie = {
  wszystkie: number;
  testowe: number;
  ze_zdjeciem: number;
};

type Warsztat = {
  workshop: string;
  liczba: number;
};

type Zgloszenie = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  workshop: string;
  attachment_name: string | null;
  created_at: Date;
};

const formatCzasu = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Warsaw",
});

const formatLiczby = new Intl.NumberFormat("pl-PL");
const NA_STRONE = 20;

function adresAdmina(bezTestow: boolean, strona: number) {
  const parametry = new URLSearchParams();
  if (bezTestow) {
    parametry.set("widok", "uczestnicy");
  }
  if (strona > 1) {
    parametry.set("strona", String(strona));
  }
  const zapisane = parametry.toString();
  return zapisane ? `/admin?${zapisane}` : "/admin";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ widok?: string; strona?: string }>;
}) {
  const parametry = await searchParams;
  const bezTestow = parametry.widok === "uczestnicy";
  const zadanaStrona = Number.parseInt(parametry.strona ?? "1", 10);
  const dane = await wczytajZapisy(
    bezTestow,
    Number.isFinite(zadanaStrona) ? zadanaStrona : 1,
  );
  const pomiar = formatCzasu.format(new Date(raportOdczytu.zebrano));

  return (
    <main className="admin-page">
      <div className="admin-wrap">
        <header className="admin-head">
          <div>
            <p className="chart-card__kicker">Panel admina</p>
            <h1>Zapisy i wynik eksperymentu</h1>
          </div>
          <Link className="admin-link" href="/">
            Formularz zapisów
          </Link>
        </header>

        <section className="admin-card" aria-label="Zgłoszenia w bazie">
          <div className="admin-card__head">
            <h2>Baza zgłoszeń</h2>
            <div className="filter">
              <Link
                href={adresAdmina(false, 1)}
                aria-current={bezTestow ? undefined : "page"}
              >
                Wszystkie
              </Link>
              <Link
                href={adresAdmina(true, 1)}
                aria-current={bezTestow ? "page" : undefined}
              >
                Bez testu obciążenia
              </Link>
            </div>
          </div>

          {dane.ok ? (
            <>
              <div className="kpis">
                <Kpi
                  etykieta="Wszystkie zgłoszenia"
                  wartosc={formatLiczby.format(dane.podsumowanie.wszystkie)}
                />
                <Kpi
                  etykieta="Z formularza"
                  wartosc={formatLiczby.format(
                    dane.podsumowanie.wszystkie - dane.podsumowanie.testowe,
                  )}
                />
                <Kpi
                  etykieta="Z testu k6"
                  wartosc={formatLiczby.format(dane.podsumowanie.testowe)}
                />
                <Kpi
                  etykieta="Ze zdjęciem"
                  wartosc={formatLiczby.format(dane.podsumowanie.ze_zdjeciem)}
                />
              </div>
              <WorkshopBars warsztaty={dane.warsztaty} />
              <div className="table-wrap">
                <table>
                  <caption>
                    {dane.wiersze.length === 0
                      ? "Brak zgłoszeń w tym widoku."
                      : `Pozycje ${dane.od}–${dane.do} z ${formatLiczby.format(dane.liczbaWidoku)}.`}
                  </caption>
                  <thead>
                    <tr>
                      <th>Nr</th>
                      <th>Imię i nazwisko</th>
                      <th>E-mail</th>
                      <th>Warsztat lub bilet</th>
                      <th>Zdjęcie</th>
                      <th>Czas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dane.wiersze.length === 0 ? (
                      <tr>
                        <td colSpan={6}>Brak zgłoszeń w tym widoku.</td>
                      </tr>
                    ) : (
                      dane.wiersze.map((wiersz) => (
                        <tr
                          key={wiersz.id}
                          className={
                            wiersz.email.startsWith("loadtest")
                              ? "row-test"
                              : undefined
                          }
                        >
                          <td>{wiersz.id}</td>
                          <td>
                            {wiersz.first_name} {wiersz.last_name}
                          </td>
                          <td>{wiersz.email}</td>
                          <td>{wiersz.workshop}</td>
                          <td>{wiersz.attachment_name ?? "—"}</td>
                          <td>{formatCzasu.format(new Date(wiersz.created_at))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <nav className="pager" aria-label="Strony zgłoszeń">
                {dane.strona > 1 ? (
                  <Link href={adresAdmina(bezTestow, dane.strona - 1)}>
                    ← Poprzednia
                  </Link>
                ) : (
                  <span className="pager__disabled">← Poprzednia</span>
                )}
                <span>
                  Strona {dane.strona} z {dane.stron}
                </span>
                {dane.strona < dane.stron ? (
                  <Link href={adresAdmina(bezTestow, dane.strona + 1)}>
                    Następna →
                  </Link>
                ) : (
                  <span className="pager__disabled">Następna →</span>
                )}
              </nav>
            </>
          ) : (
            <p className="notice notice--error" role="status">
              {dane.wiadomosc}
            </p>
          )}
        </section>

        <section className="admin-card" aria-label="Wykresy z testu obciążenia">
          <div className="admin-card__head">
            <div>
              <h2>Eksperyment obciążenia</h2>
              <p className="admin-lead">
                Pomiar {pomiar}, {raportOdczytu.url}. Progi: błędy poniżej 1% i
                p95 poniżej 600 ms. Cały przebieg:{" "}
                {raportOdczytu.progi.bledy.ok && raportOdczytu.progi.p95.ok
                  ? "spełniony"
                  : "niespełniony"}
                .
              </p>
            </div>
          </div>
          <p className="admin-conclusion">
            {krotkiWniosek(raportOdczytu, raportZapisu)}
          </p>
          <ReportCharts odczyt={raportOdczytu} zapis={raportZapisu} />
        </section>
      </div>
    </main>
  );
}

function Kpi({ etykieta, wartosc }: { etykieta: string; wartosc: string }) {
  return (
    <article className="kpi">
      <span>{etykieta}</span>
      <strong>{wartosc}</strong>
    </article>
  );
}

function WorkshopBars({ warsztaty }: { warsztaty: Warsztat[] }) {
  if (warsztaty.length === 0) {
    return null;
  }
  const maksimum = Math.max(...warsztaty.map((warsztat) => warsztat.liczba));

  return (
    <div className="workshop-list">
      {warsztaty.map((warsztat) => (
        <div key={warsztat.workshop} className="workshop-row">
          <span>{warsztat.workshop}</span>
          <div className="workshop-track">
            <span
              style={{ width: `${(warsztat.liczba / maksimum) * 100}%` }}
            />
          </div>
          <strong>{formatLiczby.format(warsztat.liczba)}</strong>
        </div>
      ))}
    </div>
  );
}

async function wczytajZapisy(bezTestow: boolean, zadanaStrona: number) {
  try {
    await readyDatabase();
    const pool = getPool();
    const filtr = bezTestow ? "WHERE email NOT LIKE 'loadtest%'" : "";
    const [podsumowanie, warsztaty, ileWidoku] = await Promise.all([
      pool.query<Podsumowanie>(`
        SELECT
          COUNT(*)::int AS wszystkie,
          COUNT(*) FILTER (WHERE email LIKE 'loadtest%')::int AS testowe,
          COUNT(*) FILTER (WHERE attachment_name IS NOT NULL)::int AS ze_zdjeciem
        FROM registrations
      `),
      pool.query<Warsztat>(`
        SELECT workshop, COUNT(*)::int AS liczba
        FROM registrations
        ${filtr}
        GROUP BY workshop
        ORDER BY liczba DESC, workshop ASC
      `),
      pool.query<{ liczba: number }>(`
        SELECT COUNT(*)::int AS liczba
        FROM registrations
        ${filtr}
      `),
    ]);

    const liczbaWidoku = ileWidoku.rows[0]?.liczba ?? 0;
    const stron = Math.max(1, Math.ceil(liczbaWidoku / NA_STRONE));
    const strona = Math.min(Math.max(1, zadanaStrona), stron);
    const wiersze = await pool.query<Zgloszenie>(
      `
        SELECT id, first_name, last_name, email, workshop, attachment_name, created_at
        FROM registrations
        ${filtr}
        ORDER BY created_at DESC, id DESC
        LIMIT $1 OFFSET $2
      `,
      [NA_STRONE, (strona - 1) * NA_STRONE],
    );

    return {
      ok: true as const,
      podsumowanie: podsumowanie.rows[0] ?? {
        wszystkie: 0,
        testowe: 0,
        ze_zdjeciem: 0,
      },
      warsztaty: warsztaty.rows,
      wiersze: wiersze.rows,
      liczbaWidoku,
      strona,
      stron,
      od: liczbaWidoku === 0 ? 0 : (strona - 1) * NA_STRONE + 1,
      do: Math.min(strona * NA_STRONE, liczbaWidoku),
    };
  } catch (error) {
    console.error("Nie udało się odczytać zgłoszeń:", error);
    return {
      ok: false as const,
      wiadomosc:
        "Nie udało się odczytać bazy. Sprawdź DATABASE_URL. Wykresy z raportu są poniżej i nie zależą od bazy.",
    };
  }
}
