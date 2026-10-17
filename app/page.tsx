import { RegistrationForm } from "@/components/RegistrationForm";

export default function HomePage() {
  return (
    <main className="stage">
      <section className="card" aria-label="Zapisz się na wydarzenie">
        <RegistrationForm />
      </section>
    </main>
  );
}
