import http from "k6/http";
import exec from "k6/execution";
import { check } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

const BASE_URL =
  __ENV.BASE_URL ||
  "https://praktyczne-zastosowania-chmury-projekt.onrender.com";
const RODZAJ = __ENV.RODZAJ || "odczyt";

const pomiar = {
  normalny: {
    czas: new Trend("czas_normalny"),
    bledy: new Rate("bledy_normalny"),
    liczba: new Counter("liczba_normalny"),
    okno: 20,
  },
  szczyt: {
    czas: new Trend("czas_szczyt"),
    bledy: new Rate("bledy_szczyt"),
    liczba: new Counter("liczba_szczyt"),
    okno: 40,
  },
  wyciszenie: {
    czas: new Trend("czas_wyciszenie"),
    bledy: new Rate("bledy_wyciszenie"),
    liczba: new Counter("liczba_wyciszenie"),
    okno: 20,
  },
};

const kody = {
  200: new Counter("kod_200"),
  400: new Counter("kod_400"),
  429: new Counter("kod_429"),
  500: new Counter("kod_500"),
  502: new Counter("kod_502"),
  503: new Counter("kod_503"),
  0: new Counter("kod_0"),
};
const kodInny = new Counter("kod_inny");

// Profil z prezentacji: 20 s zwykłego ruchu, 40 s szczytu, 20 s wyciszenia.
// Liczby 10 i 200 to żądania na sekundę, nie liczba wirtualnych użytkowników.
// Dlatego użyty jest arrival-rate, a nie stages + sleep(1).
export const options = {
  discardResponseBodies: true,
  scenarios: {
    normalny: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "20s",
      preAllocatedVUs: 40,
      maxVUs: 80,
      exec: "wyslij",
      tags: { faza: "normalny" },
    },
    szczyt: {
      executor: "constant-arrival-rate",
      rate: 200,
      timeUnit: "1s",
      duration: "40s",
      startTime: "21s",
      preAllocatedVUs: 300,
      maxVUs: 1000,
      exec: "wyslij",
      tags: { faza: "szczyt" },
    },
    wyciszenie: {
      executor: "ramping-arrival-rate",
      startRate: 200,
      timeUnit: "1s",
      preAllocatedVUs: 300,
      maxVUs: 1000,
      startTime: "62s",
      stages: [{ duration: "20s", target: 0 }],
      exec: "wyslij",
      tags: { faza: "wyciszenie" },
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<600"],
  },
};

export function wyslij() {
  const odpowiedz =
    RODZAJ === "zapis" ? wyslijZapis() : http.get(`${BASE_URL}/`);

  const scena = pomiar[exec.scenario.name];
  scena.czas.add(odpowiedz.timings.duration);
  scena.bledy.add(odpowiedz.status !== 200);
  scena.liczba.add(1);
  (kody[odpowiedz.status] || kodInny).add(1);

  check(odpowiedz, {
    "status jest 200": (r) => r.status === 200,
  });
}

function wyslijZapis() {
  const boundary = "----k6granica";
  const pola = {
    firstName: "Test",
    lastName: "Obciazenia",
    email: `loadtest+${__VU}-${__ITER}@example.com`,
    workshop: "bilet-uczestnik",
  };

  let tresc = "";
  for (const nazwa of Object.keys(pola)) {
    tresc += `--${boundary}\r\nContent-Disposition: form-data; name="${nazwa}"\r\n\r\n${pola[nazwa]}\r\n`;
  }
  tresc += `--${boundary}--\r\n`;

  return http.post(`${BASE_URL}/api/registrations`, tresc, {
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
  });
}

function wartosci(data, nazwa) {
  const metryka = data.metrics[nazwa];
  if (!metryka) {
    return null;
  }
  return metryka.values;
}

function faza(data, nazwa) {
  const czas = wartosci(data, `czas_${nazwa}`);
  const bledy = wartosci(data, `bledy_${nazwa}`);
  const zadania = wartosci(data, `liczba_${nazwa}`);
  if (!czas || !bledy || !zadania) {
    return null;
  }

  return {
    zadania: zadania.count,
    rps: zadania.count / pomiar[nazwa].okno,
    bledy: bledy.rate,
    avg: czas.avg,
    med: czas.med,
    p95: czas["p(95)"],
    p99: czas["p(99)"],
    max: czas.max,
  };
}

function prog(data, nazwa) {
  const metryka = data.metrics[nazwa];
  if (!metryka || !metryka.thresholds) {
    return null;
  }
  const wpis = Object.entries(metryka.thresholds)[0];
  if (!wpis) {
    return null;
  }
  return { wyrazenie: wpis[0], ok: wpis[1].ok };
}

export function handleSummary(data) {
  const statusZliczenia = {};
  for (const kod of Object.keys(kody)) {
    const metryka = wartosci(data, `kod_${kod}`);
    if (metryka && metryka.count) {
      statusZliczenia[kod] = metryka.count;
    }
  }
  const inne = wartosci(data, "kod_inny");
  if (inne && inne.count) {
    statusZliczenia.inne = inne.count;
  }

  const caloscCzas = wartosci(data, "http_req_duration");
  const caloscBledy = wartosci(data, "http_req_failed");
  const caloscZadania = wartosci(data, "http_reqs");
  const pominiete = wartosci(data, "dropped_iterations");

  const skrot = {
    rodzaj: RODZAJ,
    url: BASE_URL,
    zebrano: new Date().toISOString(),
    progi: {
      bledy: prog(data, "http_req_failed"),
      p95: prog(data, "http_req_duration"),
    },
    ogolem: {
      zadania: caloscZadania ? caloscZadania.count : 0,
      rps: caloscZadania ? caloscZadania.rate : 0,
      bledy: caloscBledy ? caloscBledy.rate : 0,
      avg: caloscCzas ? caloscCzas.avg : 0,
      med: caloscCzas ? caloscCzas.med : 0,
      p95: caloscCzas ? caloscCzas["p(95)"] : 0,
      p99: caloscCzas ? caloscCzas["p(99)"] : 0,
      max: caloscCzas ? caloscCzas.max : 0,
      pominiete: pominiete ? pominiete.count : 0,
    },
    fazy: {
      normalny: faza(data, "normalny"),
      szczyt: faza(data, "szczyt"),
      wyciszenie: faza(data, "wyciszenie"),
    },
    statusy: statusZliczenia,
  };

  return {
    [`reports/${RODZAJ}.json`]: JSON.stringify(skrot, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: false }),
  };
}
