import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";

const katalog = path.resolve("reports");
const odczyt = JSON.parse(fs.readFileSync(path.join(katalog, "odczyt.json"), "utf8"));
const zapis = JSON.parse(fs.readFileSync(path.join(katalog, "zapis.json"), "utf8"));

const font = "/usr/share/fonts/TTF/DejaVuSans.ttf";
const fontBold = "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf";
const plikPdf = path.join(katalog, "eksperyment-obciazenia.pdf");

const FAZY = [
  ["normalny", "10/s · 20 s", 10],
  ["szczyt", "200/s · 40 s", 200],
  ["wyciszenie", "spadek · 20 s", null],
];

function ms(wartosc) {
  if (wartosc === null || wartosc === undefined || Number.isNaN(wartosc)) {
    return "—";
  }
  return `${Math.round(wartosc)} ms`;
}

function procent(wartosc) {
  if (wartosc === null || wartosc === undefined || Number.isNaN(wartosc)) {
    return "—";
  }
  return `${(wartosc * 100).toFixed(2)}%`;
}

function liczba(wartosc) {
  if (wartosc === null || wartosc === undefined || Number.isNaN(wartosc)) {
    return "—";
  }
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1 }).format(wartosc);
}

function progTekst(proba) {
  const bledy = proba.progi.bledy?.ok;
  const p95 = proba.progi.p95?.ok;
  if (bledy && p95) {
    return "spełniony";
  }
  return "niespełniony";
}

function opisFazy(fazaWynik, cel) {
  const realizacja =
    cel && fazaWynik.rps < cel * 0.8
      ? ` Z planu ${cel}/s dokończono średnio ${liczba(fazaWynik.rps)}/s, bo odpowiedzi zajmowały połączenia zbyt długo.`
      : "";
  return `p95 ${ms(fazaWynik.p95)}, błędy ${procent(fazaWynik.bledy)}.${realizacja}`;
}

function wniosekOdczytu(proba) {
  const zwykly = proba.fazy.normalny;
  const szczyt = proba.fazy.szczyt;
  if (!zwykly || !szczyt) {
    return "Brak pełnych wyników odczytu strony.";
  }

  const zwyklyOk = zwykly.bledy < 0.01 && zwykly.p95 < 600;
  const szczytOk = szczyt.bledy < 0.01 && szczyt.p95 < 600;

  if (zwyklyOk && szczytOk) {
    return `Odczyt strony utrzymał oba progi. Przy 10 żądaniach/s ${opisFazy(zwykly, 10)} Przy szczycie ${opisFazy(szczyt, 200)}`;
  }

  if (zwyklyOk && !szczytOk) {
    return `Przy zwykłym ruchu strona mieści się w progach: ${opisFazy(zwykly, 10)} Skok do 200 żądań/s je przekracza: ${opisFazy(szczyt, 200)}`;
  }

  return `Już zwykły odczyt jest poza progiem: ${opisFazy(zwykly, 10)} Na szczycie: ${opisFazy(szczyt, 200)}`;
}

function wniosekZapisu(proba) {
  const zwykly = proba.fazy.normalny;
  const szczyt = proba.fazy.szczyt;
  if (!zwykly || !szczyt) {
    return "Brak pełnych wyników zapisu do bazy.";
  }

  const szczytOk = szczyt.bledy < 0.01 && szczyt.p95 < 600;
  if (szczytOk) {
    return `Zapis zgłoszenia do PostgreSQL też utrzymał szczyt: ${opisFazy(szczyt, 200)} Udane wiersze testowe są w tabeli registrations.`;
  }

  return `Zapis do bazy, czyli właściwa ścieżka zapisów, na szczycie wygląda tak: ${opisFazy(szczyt, 200)} Przy 10 żądaniach/s: ${opisFazy(zwykly, 10)} Udane zgłoszenia z tego przebiegu leżą w tabeli registrations.`;
}

function nastepnyKrok(odczytProba, zapisProba) {
  const szczytStrony = odczytProba.fazy.szczyt;
  const szczytZapisu = zapisProba.fazy.szczyt;
  const stronaPada = szczytStrony && (szczytStrony.bledy >= 0.01 || szczytStrony.p95 >= 600);
  const zapisPada = szczytZapisu && (szczytZapisu.bledy >= 0.01 || szczytZapisu.p95 >= 600);

  if (!stronaPada && !zapisPada) {
    return "Przed premierą powtórzyć ten sam profil na docelowym planie Rendera i zostawić ten PDF jako wynik bazowy.";
  }

  if (zapisPada && !stronaPada) {
    return "Przed otwarciem zapisów podnieść plan bazy albo ograniczyć równoległe zapisy, na przykład kolejką. Sam większy serwer WWW nie wystarczy, jeśli PostgreSQL nie nadąża.";
  }

  return "Na dzień otwarcia zapisów obecny plan nie pokrywa modelu 200 żądań/s. Albo podnieść plan Web Service i bazy na te godziny, albo wpuścić ruch partiami, żeby szczyt nie trafił w usługę naraz.";
}

function rysujTabele(doc, y, proba) {
  const kolumny = [48, 168, 248, 318, 398, 478];
  const naglowki = ["Faza", "Dokończone", "Średnio /s", "Błędy", "Mediana", "p95"];
  doc.font(fontBold).fontSize(9);
  naglowki.forEach((naglowek, indeks) => {
    doc.text(naglowek, kolumny[indeks], y, { width: 90, lineBreak: false });
  });
  y += 16;
  doc.moveTo(48, y).lineTo(547, y).strokeColor("#c8bfb2").stroke();
  y += 6;
  doc.font(font).fontSize(9).fillColor("#1c1712");

  for (const [klucz, etykieta] of FAZY) {
    const fazaWynik = proba.fazy[klucz];
    const komorki = fazaWynik
      ? [
          etykieta,
          liczba(fazaWynik.zadania),
          liczba(fazaWynik.rps),
          procent(fazaWynik.bledy),
          ms(fazaWynik.med),
          ms(fazaWynik.p95),
        ]
      : [etykieta, "—", "—", "—", "—", "—"];
    komorki.forEach((komorka, indeks) => {
      doc.text(String(komorka), kolumny[indeks], y, {
        width: indeks === 0 ? 110 : 75,
        lineBreak: false,
      });
    });
    y += 18;
  }

  return y + 6;
}

const doc = new PDFDocument({ size: "A4", margin: 48 });
doc.pipe(fs.createWriteStream(plikPdf));
doc.font(font);

doc.font(fontBold).fontSize(18).fillColor("#1c1712").text("Eksperyment obciążenia", { continued: false });
doc.moveDown(0.2);
doc.font(font).fontSize(11).fillColor("#3d342c").text("Zapisy na wydarzenie — profil z prezentacji");
doc.moveDown(0.6);
doc.fontSize(10).text(`Adres: ${odczyt.url}`);
doc.text(`Pomiar: ${odczyt.zebrano}`);
doc.text("Narzędzie: k6. Progi: mniej niż 1% błędów HTTP oraz p95 poniżej 600 ms.");
doc.moveDown(0.4);
doc.text(
  "Przez 20 sekund usługa dostaje 10 żądań na sekundę, przez kolejne 40 sekund 200 żądań na sekundę, a przez ostatnie 20 sekund ruch spada do zera. To odpowiada zwykłemu miesiącowi i dwudziestokrotnemu skokowi w dniu otwarcia zapisów.",
);
doc.moveDown(0.8);

doc.font(fontBold).fontSize(13).fillColor("#1c1712").text("1. Odczyt strony głównej");
doc.moveDown(0.3);
doc.font(font).fontSize(10).fillColor("#3d342c").text(`Próg całego przebiegu: ${progTekst(odczyt)}.`);
doc.moveDown(0.3);
let y = doc.y + 4;
y = rysujTabele(doc, y, odczyt);
doc.y = y;
doc.font(font).fontSize(10).fillColor("#3d342c").text(wniosekOdczytu(odczyt), 48, y, { width: 499 });
doc.moveDown(0.8);

doc.font(fontBold).fontSize(13).fillColor("#1c1712").text("2. Zapis zgłoszenia do PostgreSQL");
doc.moveDown(0.3);
doc.font(font).fontSize(10).fillColor("#3d342c").text(`Próg całego przebiegu: ${progTekst(zapis)}.`);
doc.moveDown(0.3);
y = doc.y + 4;
y = rysujTabele(doc, y, zapis);
doc.y = y;
doc.font(font).fontSize(10).fillColor("#3d342c").text(wniosekZapisu(zapis), 48, y, { width: 499 });

doc.addPage();
doc.font(fontBold).fontSize(13).fillColor("#1c1712").text("Gdzie widać te dane");
doc.moveDown(0.4);
doc.font(font).fontSize(10).fillColor("#3d342c");
const gdzie = [
  "Ten plik oraz reports/odczyt.json i reports/zapis.json to wynik testu k6. k6 liczy czasy u klienta, który wysyła żądania. Aplikacja nie ma osobnego ekranu z wynikami testu.",
  "Render, usługa Web Service, zakładka Metrics: zużycie CPU, pamięci i czas odpowiedzi w trakcie pomiaru.",
  "Render, zakładka Logs: błędy aplikacji i linia „SYMULACJA WIADOMOŚCI E-MAIL” dla każdego udanego zapisu.",
  "PostgreSQL, tabela registrations: udane zapisy testowe mają e-mail zaczynający się od loadtest+. Nie ma tam czasów odpowiedzi k6, tylko treść zgłoszeń.",
];
for (const akapit of gdzie) {
  doc.text(`•  ${akapit}`, { paragraphGap: 6 });
}

doc.moveDown(0.6);
doc.font(fontBold).fontSize(13).text("Wnioski do slajdów");
doc.moveDown(0.4);
doc.font(font).fontSize(10);
const wnioski = [
  `Wniosek 1. ${wniosekOdczytu(odczyt)}`,
  `Wniosek 2. ${wniosekZapisu(zapis)}`,
  "Wniosek 3. Cena planu PaaS z modelu rocznego nie jest tym samym co zdolność do przyjęcia dnia otwarcia zapisów. Eksperyment sprawdza właśnie tę różnicę: zwykłe 10 żądań/s wobec skoku do 200.",
  `Następny krok. ${nastepnyKrok(odczyt, zapis)} Po prezentacji wiersze testowe można usunąć: DELETE FROM registrations WHERE email LIKE 'loadtest%@example.com';`,
];
for (const akapit of wnioski) {
  doc.text(akapit, { paragraphGap: 8 });
}

doc.moveDown(0.8);
doc.font(fontBold).fontSize(13).text("Kody odpowiedzi");
doc.moveDown(0.3);
doc.font(font).fontSize(10);
doc.text(`Odczyt strony: ${formatujStatusy(odczyt.statusy)}`);
doc.text(`Zapis zgłoszenia: ${formatujStatusy(zapis.statusy)}`);
doc.moveDown(0.4);
doc.text(
  `Pominięte iteracje, gdy zabrakło wirtualnych użytkowników: odczyt ${liczba(odczyt.ogolem.pominiete)}, zapis ${liczba(zapis.ogolem.pominiete)}.`,
);

doc.end();

fs.writeFileSync(
  path.join(katalog, "wyniki.json"),
  JSON.stringify({ odczyt, zapis }, null, 2),
);

function formatujStatusy(statusy) {
  const wpisy = Object.entries(statusy);
  if (wpisy.length === 0) {
    return "brak";
  }
  return wpisy
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([kod, ile]) => `${kod}: ${liczba(ile)}`)
    .join(", ");
}

console.log(plikPdf);
