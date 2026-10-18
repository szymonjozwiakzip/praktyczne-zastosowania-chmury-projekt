import odczytJson from "@/reports/odczyt.json";
import zapisJson from "@/reports/zapis.json";

export type FazaRaportu = {
  zadania: number;
  rps: number;
  bledy: number;
  avg: number;
  med: number;
  p95: number;
  max: number;
};

export type RaportObciazenia = {
  rodzaj: string;
  url: string;
  zebrano: string;
  progi: {
    bledy: { ok: boolean };
    p95: { ok: boolean };
  };
  ogolem: {
    zadania: number;
    bledy: number;
    p95: number;
    pominiete: number;
  };
  fazy: {
    normalny: FazaRaportu;
    szczyt: FazaRaportu;
    wyciszenie: FazaRaportu;
  };
  statusy: Record<string, number>;
};

export const raportOdczytu = odczytJson as RaportObciazenia;
export const raportZapisu = zapisJson as RaportObciazenia;

export const FAZY = [
  { klucz: "normalny", etykieta: "10/s" },
  { klucz: "szczyt", etykieta: "200/s" },
  { klucz: "wyciszenie", etykieta: "spadek" },
] as const;
