import Link from 'next/link';

export default function ParaNichoPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#050505', color: '#f4f4f5', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <p style={{ color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: 12 }}>
          Asistido por IA
        </p>
        <h1 style={{ fontSize: 40, marginTop: 16 }}>Opsly para nichos de alto valor</h1>
        <p style={{ marginTop: 16, color: '#a1a1aa', fontSize: 18, maxWidth: 760 }}>
          Esta landing dinamica sirve como plantilla base para verticales comerciales. La version activa para
          agencias vive en <code>/para-agencias</code>.
        </p>
        <div style={{ marginTop: 28 }}>
          <Link href="/para-agencias" style={{ color: '#22d3ee' }}>
            Ir a landing para agencias
          </Link>
        </div>
      </div>
    </main>
  );
}
