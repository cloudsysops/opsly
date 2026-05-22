import type { ReactElement } from 'react';

type ErrorPageProps = {
  statusCode?: number;
};

export default function ErrorPage({ statusCode = 500 }: ErrorPageProps): ReactElement {
  return (
    <main>
      <h1>{statusCode}</h1>
      <p>Unexpected error</p>
    </main>
  );
}
