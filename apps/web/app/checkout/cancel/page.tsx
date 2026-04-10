import Link from "next/link";

export const metadata = {
  title: "Pago cancelado — Opsly",
};

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-lg w-full text-center">
        <div className="text-5xl mb-6">😕</div>

        <h1 className="text-3xl font-extrabold mb-4">Pago cancelado</h1>

        <p className="text-white/60 text-lg mb-8">
          No te preocupes, no se realizó ningún cargo.
          Puedes intentarlo de nuevo cuando quieras.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/#pricing" className="ops-btn-primary text-center">
            Ver planes de nuevo →
          </Link>
          <a
            href="mailto:hola@opsly.io"
            className="ops-btn-ghost text-center"
          >
            ¿Tienes preguntas?
          </a>
        </div>
      </div>
    </main>
  );
}
