import type { ReactElement } from 'react';

export default function HomePage(): ReactElement {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Opsly API</h1>
      <p>
        Use the <code>/api/*</code> routes.
      </p>
    </main>
  );
}
