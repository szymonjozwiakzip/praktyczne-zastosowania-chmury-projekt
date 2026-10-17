export const WORKSHOPS = [
  {
    id: "architektura",
    label: "Warsztat: Architektura usług chmurowych",
  },
  {
    id: "kontenery",
    label: "Warsztat: Kontenery i orkiestracja",
  },
  {
    id: "cicd",
    label: "Warsztat: CI/CD i wdrożenia na Render",
  },
  {
    id: "bilet-uczestnik",
    label: "Bilet uczestnika",
  },
  {
    id: "bilet-vip",
    label: "Bilet VIP",
  },
] as const;

export type WorkshopId = (typeof WORKSHOPS)[number]["id"];

export function findWorkshop(id: string) {
  return WORKSHOPS.find((workshop) => workshop.id === id);
}
