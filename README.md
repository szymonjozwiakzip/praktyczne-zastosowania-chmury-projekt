# Zapisy na wydarzenia

Aplikacja webowa Next.js (React + App Router) do zapisów na wydarzenie. Formularz zapisuje dane w PostgreSQL, przyjmuje opcjonalne zdjęcie PNG lub JPG i loguje symulowane potwierdzenie e-mail w konsoli serwera.

## Formularz

Pola obowiązkowe:

- imię
- nazwisko
- e-mail
- warsztat albo bilet

Dodatkowo można wgrać zdjęcie (PNG lub JPG, do 2 MB). Plik jest buforowany i zapisywany w kolumnie `BYTEA`.

## Uruchomienie lokalne

Wymagane: Node.js 20+ oraz PostgreSQL.

```bash
npm install
cp .env.example .env.local
```

Ustaw w `.env.local` własny ciąg połączenia:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/zapisy
```

Tabela `registrations` tworzy się automatycznie przy pierwszym zapisie.

```bash
npm run dev
```

Aplikacja działa pod adresem [http://localhost:3000](http://localhost:3000).

Skrypty produkcyjne:

```bash
npm run build
npm start
```

`npm start` nasłuchuje na `0.0.0.0` i porcie ze zmiennej `PORT` (domyślnie 3000).

## Wdrożenie na Renderze

Repozytorium zawiera `render.yaml`. W panelu Render wybierz **New → Blueprint**, wskaż to repozytorium i zatwierdź plan. Blueprint utworzy:

- jedną usługę **Web Service** (`npm ci && npm run build`, start: `npm start`)
- bazę PostgreSQL i podepnie jej adres jako `DATABASE_URL`

Połączenie z bazą odbywa się wyłącznie przez `process.env.DATABASE_URL`.

Potwierdzenie rejestracji pojawia się w logach usługi (zakładka **Logs**), a nie jako prawdziwa wysyłka e-mail.
