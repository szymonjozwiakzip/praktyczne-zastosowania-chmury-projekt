type RegistrationNotice = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  workshop: string;
  attachmentName: string | null;
};

export function sendRegistrationConfirmation(notice: RegistrationNotice) {
  const attachmentLine = notice.attachmentName
    ? `Zdjęcie: ${notice.attachmentName}`
    : "Zdjęcie: brak";

  console.log(
    [
      "========== SYMULACJA WIADOMOŚCI E-MAIL ==========",
      `Do: ${notice.email}`,
      "Temat: Potwierdzenie zapisu na wydarzenie",
      "-------------------------------------------------",
      `Dzień dobry ${notice.firstName} ${notice.lastName},`,
      "",
      "Twoja rejestracja została przyjęta.",
      `Numer zgłoszenia: ${notice.id}`,
      `Wybrany warsztat / bilet: ${notice.workshop}`,
      attachmentLine,
      "",
      "Do zobaczenia na konferencji „Praktyczne zastosowanie chmury”.",
      "=================================================",
    ].join("\n"),
  );
}
