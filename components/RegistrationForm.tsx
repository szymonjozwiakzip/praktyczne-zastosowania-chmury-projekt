"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { WORKSHOPS } from "@/lib/workshops";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

type FormStatus = "idle" | "submitting" | "success" | "error";

function isPngOrJpeg(file: File) {
  const name = file.name.toLowerCase();
  const extensionOk =
    name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg");
  const typeOk =
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    file.type === "";

  return extensionOk && typeOk;
}

export function RegistrationForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [confirmationId, setConfirmationId] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const previewUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function setPhoto(file: File | null) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextUrl = file ? URL.createObjectURL(file) : "";
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
    setFileName(file?.name ?? "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    const fileInput = form.elements.namedItem("photo");
    const file =
      fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;

    if (file && file.size > 0) {
      if (!isPngOrJpeg(file)) {
        setStatus("error");
        setMessage("Zdjęcie może być tylko w formacie PNG lub JPG.");
        return;
      }

      if (file.size > MAX_PHOTO_BYTES) {
        setStatus("error");
        setMessage("Zdjęcie może mieć najwyżej 2 MB.");
        return;
      }
    }

    setStatus("submitting");
    setMessage("");
    setConfirmationId(null);

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        body: new FormData(form),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        id?: number;
        message?: string;
      };

      if (!response.ok || !payload.ok) {
        setStatus("error");
        setMessage(payload.message ?? "Nie udało się zapisać zgłoszenia.");
        return;
      }

      setStatus("success");
      setConfirmationId(payload.id ?? null);
      setMessage(
        payload.message ??
          "Zapis został przyjęty. Potwierdzenie trafiło do logów serwera.",
      );
      form.reset();
      setPhoto(null);
    } catch {
      setStatus("error");
      setMessage("Brak połączenia z serwerem. Spróbuj ponownie.");
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <header className="form__header">
        <h1>Zapisz się na wydarzenie</h1>
      </header>

      <div className="form__grid">
        <label className="field">
          <span>Imię</span>
          <input
            name="firstName"
            type="text"
            autoComplete="given-name"
            maxLength={80}
            required
            placeholder="Anna"
          />
        </label>

        <label className="field">
          <span>Nazwisko</span>
          <input
            name="lastName"
            type="text"
            autoComplete="family-name"
            maxLength={80}
            required
            placeholder="Kowalska"
          />
        </label>
      </div>

      <label className="field">
        <span>E-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          maxLength={160}
          required
          placeholder="anna.kowalska@example.com"
        />
      </label>

      <label className="field">
        <span>Warsztat lub bilet</span>
        <select name="workshop" required defaultValue="">
          <option value="" disabled>
            Wybierz jedną opcję
          </option>
          {WORKSHOPS.map((workshop) => (
            <option key={workshop.id} value={workshop.id}>
              {workshop.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--file">
        <span>Wgraj zdjęcie (opcjonalne)</span>
        <input
          name="photo"
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (file && !isPngOrJpeg(file)) {
              event.target.value = "";
              setPhoto(null);
              setStatus("error");
              setMessage("Zdjęcie może być tylko w formacie PNG lub JPG.");
              return;
            }
            setMessage("");
            setStatus("idle");
            setPhoto(file);
          }}
        />
        <span className="file-hint">
          {fileName ? fileName : "PNG lub JPG, do 2 MB"}
        </span>
        {previewUrl ? (
          <img className="preview" src={previewUrl} alt="Podgląd zdjęcia" />
        ) : null}
      </label>

      {message ? (
        <p
          className={`notice notice--${status === "success" ? "success" : "error"}`}
          role="status"
        >
          {confirmationId ? `Zgłoszenie nr ${confirmationId}. ` : null}
          {message}
        </p>
      ) : null}

      <button className="submit" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Zapisywanie…" : "Wyślij zgłoszenie"}
      </button>
    </form>
  );
}
