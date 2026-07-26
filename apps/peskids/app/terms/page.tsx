import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Términos y Condiciones · Peskids',
  description: 'Términos y condiciones de uso del sitio web y servicios de Peskids Academia de Natación.',
}

export default function TermsPage(): React.ReactElement {
  return (
    <LegalPageLayout
      title="Términos y Condiciones de Uso"
      version="1.0"
      effectiveDate="24 de mayo de 2026"
      policyId="pk-terms-v1"
    >
      <section>
        <h2>1. Aceptación</h2>
        <p>
          Al usar el sitio web de Peskids (en adelante &quot;el Sitio&quot;) o al enviar el formulario
          de contacto o solicitud de matrícula, usted acepta estos Términos y Condiciones. Si no
          está de acuerdo, no use el Sitio.
        </p>
      </section>

      <section>
        <h2>2. Descripción del Servicio</h2>
        <p>
          Peskids es una academia de natación con sede en Llanogrande, Rionegro, Antioquia,
          Colombia. A través del Sitio, los acudientes pueden:
        </p>
        <ul>
          <li>Enviar una solicitud de contacto o matrícula.</li>
          <li>Obtener información sobre programas, etapas y tarifas.</li>
          <li>Interactuar con el asistente de IA para orientación general.</li>
          <li>Acceder al panel de seguimiento de estudiantes (acudientes con cuenta activa).</li>
        </ul>
        <p>
          El asistente de IA proporciona <strong>orientación general y no profesional</strong>.
          Sus respuestas no sustituyen la evaluación de instructores certificados ni consejo médico.
        </p>
      </section>

      <section>
        <h2>3. Obligaciones del Usuario</h2>
        <p>Al usar el Sitio, usted se compromete a:</p>
        <ul>
          <li>Proporcionar información veraz, completa y actualizada en los formularios.</li>
          <li>No usar el Sitio para fines ilegales, fraudulentos o que perjudiquen a terceros.</li>
          <li>No intentar acceder a áreas restringidas, bases de datos o sistemas de Peskids.</li>
          <li>No publicar o transmitir contenido ofensivo, difamatorio o que infrinja derechos de terceros.</li>
        </ul>
      </section>

      <section>
        <h2>4. Propiedad Intelectual</h2>
        <p>
          Todo el contenido del Sitio (textos, imágenes, logotipos, diseño) es propiedad de
          Peskids o está licenciado a Peskids. Queda prohibida su reproducción, distribución
          o modificación sin autorización escrita previa.
        </p>
      </section>

      <section>
        <h2>5. Limitación de Responsabilidad</h2>
        <p>
          Peskids no garantiza que el Sitio esté disponible de forma ininterrumpida o libre de
          errores. En ningún caso Peskids será responsable por daños indirectos, incidentales
          o consecuentes derivados del uso o imposibilidad de uso del Sitio.
        </p>
        <p>
          Las clases físicas están sujetas a disponibilidad, condiciones climáticas y
          cumplimiento de los requisitos de salud del estudiante. Las condiciones específicas
          de prestación del servicio se acordarán directamente con el equipo de Peskids.
        </p>
      </section>

      <section>
        <h2>6. Privacidad</h2>
        <p>
          El tratamiento de datos personales se rige por nuestra{' '}
          <a href="/privacy">Política de Privacidad</a> y el{' '}
          <a href="/aviso-parental">Aviso de Autorización Parental</a>.
        </p>
      </section>

      <section>
        <h2>7. Modificaciones</h2>
        <p>
          Peskids se reserva el derecho de modificar estos Términos en cualquier momento.
          Los cambios sustanciales serán comunicados por correo electrónico con al menos
          10 días hábiles de anticipación.
        </p>
      </section>

      <section>
        <h2>8. Ley Aplicable y Jurisdicción</h2>
        <p>
          Estos Términos se rigen por las leyes de la República de Colombia. Cualquier
          controversia será resuelta ante los jueces competentes de Medellín, Antioquia.
        </p>
      </section>
    </LegalPageLayout>
  )
}
