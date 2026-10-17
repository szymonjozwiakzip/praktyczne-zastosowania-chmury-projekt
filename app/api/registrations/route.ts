import { NextResponse } from "next/server";
import { readyDatabase, getPool } from "@/lib/db";
import { sendRegistrationConfirmation } from "@/lib/email";
import { findWorkshop } from "@/lib/workshops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function detectImageType(buffer: Buffer) {
  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  if (isPng) {
    return "image/png";
  }

  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  if (isJpeg) {
    return "image/jpeg";
  }

  return null;
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Nie udało się odczytać formularza.", 400);
  }

  const firstName = readText(formData, "firstName");
  const lastName = readText(formData, "lastName");
  const email = readText(formData, "email").toLowerCase();
  const workshopId = readText(formData, "workshop");
  const workshop = findWorkshop(workshopId);

  if (!firstName || firstName.length > 80) {
    return jsonError("Podaj imię (maksymalnie 80 znaków).", 400);
  }

  if (!lastName || lastName.length > 80) {
    return jsonError("Podaj nazwisko (maksymalnie 80 znaków).", 400);
  }

  if (!email || email.length > 160 || !EMAIL_PATTERN.test(email)) {
    return jsonError("Podaj poprawny adres e-mail.", 400);
  }

  if (!workshop) {
    return jsonError("Wybierz warsztat albo bilet.", 400);
  }

  const uploaded = formData.get("photo");
  let attachmentName: string | null = null;
  let attachmentMime: string | null = null;
  let attachmentSize: number | null = null;
  let attachmentData: Buffer | null = null;

  if (uploaded instanceof File && uploaded.size > 0) {
    if (uploaded.size > MAX_PHOTO_BYTES) {
      return jsonError("Zdjęcie może mieć najwyżej 2 MB.", 400);
    }

    const buffer = Buffer.from(await uploaded.arrayBuffer());
    const mime = detectImageType(buffer);
    if (!mime) {
      return jsonError("Zdjęcie może być tylko w formacie PNG lub JPG.", 400);
    }

    attachmentName = uploaded.name.slice(0, 180);
    attachmentMime = mime;
    attachmentSize = uploaded.size;
    attachmentData = buffer;
  }

  try {
    await readyDatabase();
    const result = await getPool().query<{ id: number }>(
      `INSERT INTO registrations
        (first_name, last_name, email, workshop, attachment_name, attachment_mime, attachment_size, attachment_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        firstName,
        lastName,
        email,
        workshop.label,
        attachmentName,
        attachmentMime,
        attachmentSize,
        attachmentData,
      ],
    );

    const id = result.rows[0]?.id;

    if (!id) {
      throw new Error("Baza nie zwróciła numeru zgłoszenia.");
    }

    sendRegistrationConfirmation({
      id,
      firstName,
      lastName,
      email,
      workshop: workshop.label,
      attachmentName,
    });

    return NextResponse.json({
      ok: true,
      id,
      message: "Zapis został przyjęty. Potwierdzenie trafiło do logów serwera.",
    });
  } catch (error) {
    console.error("Błąd zapisu rejestracji:", error);
    return jsonError(
      "Nie udało się zapisać zgłoszenia. Sprawdź połączenie z bazą danych.",
      500,
    );
  }
}
