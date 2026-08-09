import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';

export const metadata: Metadata = {
  title: 'Derechos del Titular · Peskids',
  description:
    'Ejerce tus derechos de acceso, rectificación, supresión y oposición sobre tus datos personales con Peskids.',
};

export default function DsarPage(): React.ReactElement {
  return (
    <LegalPageLayout
      title="Derechos del Titular de los Datos"
      version="1.0"
      effectiveDate="24 de mayo de 2026"
      policyId="pk-dsar-v1"
    >
      <div className="rounded-lg border-2 border-pk-primary/30 bg-pk-primary/5 p-4 text-sm">
        Conforme a la <strong>Ley 1581 de 2012</strong>, tienes derecho a conocer, rectificar,
        actualizar y suprimir los datos que Peskids tiene sobre ti o sobre tu hijo/a. Respondemos en
        máximo <strong>15 días hábiles</strong>.
      </div>

      <section>
        <h2>Tus derechos</h2>
        <ul>
          <li>
            <strong>Acceso:</strong> solicitar una copia de los datos que tenemos sobre ti.
          </li>
          <li>
            <strong>Rectificación:</strong> corregir datos incorrectos o desactualizados.
          </li>
          <li>
            <strong>Supresión:</strong> pedir que eliminemos tus datos (cuando no exista obligación
            legal de conservarlos).
          </li>
          <li>
            <strong>Oposición:</strong> oponerte a comunicaciones comerciales o tratamientos
            específicos.
          </li>
          <li>
            <strong>Portabilidad:</strong> recibir tus datos en formato estructurado (JSON o CSV).
          </li>
          <li>
            <strong>Revocación:</strong> retirar el consentimiento otorgado en cualquier momento.
          </li>
        </ul>
      </section>

      <section>
        <h2>Cómo ejercer tus derechos</h2>
        <p>Escríbenos a:</p>
        <p className="rounded-lg bg-pk-muted px-4 py-3 font-mono text-sm">
          <a href="mailto:peskidsnatacion@gmail.com" className="text-pk-primary">
            peskidsnatacion@gmail.com
          </a>
        </p>
        <p>Incluye en tu mensaje:</p>
        <ol>
          <li>Tu nombre completo y el correo electrónico con el que te registraste.</li>
          <li>El derecho que deseas ejercer (acceso, rectificación, supresión, etc.).</li>
          <li>
            Si solicitas datos de un menor: indicar nombre del menor y tu relación con él/ella
            (padre/madre/tutor).
          </li>
          <li>Cualquier detalle adicional que facilite la búsqueda de tu información.</li>
        </ol>
        <p>
          Verificaremos tu identidad antes de procesar la solicitud. El plazo de respuesta es de{' '}
          <strong>15 días hábiles</strong> a partir de la recepción.
        </p>
      </section>

      <section>
        <h2>Reclamaciones ante la SIC</h2>
        <p>
          Si consideras que tus derechos han sido vulnerados, puedes presentar una reclamación ante
          la{' '}
          <a
            href="https://www.sic.gov.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-pk-primary"
          >
            Superintendencia de Industria y Comercio (SIC)
          </a>
          , la autoridad de protección de datos en Colombia.
        </p>
      </section>

      <section>
        <h2>Documentos relacionados</h2>
        <ul>
          <li>
            <Link href="/privacy">Política de Privacidad completa</Link>
          </li>
          <li>
            <Link href="/aviso-parental">Aviso de Autorización Parental</Link>
          </li>
          <li>
            <Link href="/cookies">Política de Cookies</Link>
          </li>
        </ul>
      </section>
    </LegalPageLayout>
  );
}
