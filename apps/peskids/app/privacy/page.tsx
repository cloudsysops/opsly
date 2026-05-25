import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Política de Privacidad · Peskids',
  description: 'Política de tratamiento de datos personales de Peskids, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia.',
}

export default function PrivacyPage(): React.ReactElement {
  return (
    <LegalPageLayout
      title="Política de Privacidad y Tratamiento de Datos Personales"
      version="1.0"
      effectiveDate="24 de mayo de 2026"
      policyId="pk-privacy-v1"
    >
      <section>
        <h2>1. Identificación del Responsable del Tratamiento</h2>
        <p>
          <strong>Responsable:</strong> Peskids — Academia de Natación<br />
          <strong>Correo de contacto para asuntos de datos:</strong>{' '}
          <a href="mailto:privacidad@peskids.co">privacidad@peskids.co</a>{' '}
          (o al correo del operador: sierrasantiago90@gmail.com)<br />
          <strong>Sede principal:</strong> Llanogrande, Rionegro, Antioquia, Colombia
        </p>
        <p>
          Esta política regula el tratamiento de datos personales que Peskids recolecta a través
          de su sitio web y canales de contacto, en cumplimiento de la{' '}
          <strong>Ley Estatutaria 1581 de 2012</strong> y su decreto reglamentario{' '}
          <strong>1377 de 2013</strong> (régimen colombiano de protección de datos personales
          — Habeas Data).
        </p>
      </section>

      <section>
        <h2>2. Datos que Recolectamos</h2>
        <p>Recolectamos únicamente los datos necesarios para prestar el servicio:</p>
        <ul>
          <li><strong>Del acudiente:</strong> nombre completo, correo electrónico, número de teléfono.</li>
          <li><strong>Del menor:</strong> rango de edad o nivel de interés (no nombre completo en la solicitud inicial).</li>
          <li><strong>Logísticos:</strong> barrio o zona (para coordinar clases a domicilio cuando aplica).</li>
          <li><strong>Del uso del servicio:</strong> conversaciones con el asistente de IA, preferencias de clase, fuente de referido.</li>
          <li><strong>Técnicos:</strong> cookies de sesión de Supabase Auth (necesarias para el acceso al panel de administración y docentes).</li>
        </ul>
        <p>
          No recolectamos número de cédula del acudiente, nombre completo del menor, ni
          información médica sin consentimiento adicional y explícito.
        </p>
      </section>

      <section>
        <h2>3. Finalidades del Tratamiento</h2>
        <table>
          <thead>
            <tr>
              <th>Finalidad</th>
              <th>Base legal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Contactar al acudiente para agendar la clase de prueba solicitada</td>
              <td>Ejecución del contrato / Autorización</td>
            </tr>
            <tr>
              <td>Coordinar el servicio (horarios, sedes, instructores)</td>
              <td>Ejecución del contrato</td>
            </tr>
            <tr>
              <td>Enviar comunicaciones sobre el programa (avances, novedades)</td>
              <td>Autorización específica (opt-in separado)</td>
            </tr>
            <tr>
              <td>Mejorar el asistente de IA y los mensajes de orientación</td>
              <td>Interés legítimo + Autorización</td>
            </tr>
            <tr>
              <td>Cumplir obligaciones legales (facturación, reportes a autoridades)</td>
              <td>Obligación legal</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Transferencias y Sub-procesadores</h2>
        <p>
          Sus datos pueden ser procesados por los siguientes sub-procesadores, siempre bajo
          instrucción de Peskids y con acuerdos de tratamiento de datos vigentes:
        </p>
        <ul>
          <li>
            <strong>Supabase Inc. (USA):</strong> almacenamiento de la base de datos.
          </li>
          <li>
            <strong>Jelou S.A.S (Colombia):</strong> plataforma de mensajería (WhatsApp, email)
            para contacto con el acudiente.
          </li>
          <li>
            <strong>n8n / Automatización interna (Opsly):</strong> flujos de CRM para agendar
            seguimientos y notificaciones al equipo.
          </li>
          <li>
            <strong>Anthropic PBC (USA):</strong> procesamiento de las conversaciones del asistente
            de IA para generar las respuestas orientativas.
          </li>
          <li>
            <strong>Vercel Inc. (USA):</strong> alojamiento del sitio web.
          </li>
          <li>
            <strong>Resend Inc. (USA):</strong> envío de correos transaccionales.
          </li>
        </ul>
        <p>
          Algunos de estos sub-procesadores están ubicados en los Estados Unidos, país que no
          figura en la lista de países con nivel adecuado de protección emitida por la
          Superintendencia de Industria y Comercio (SIC). Conforme al artículo 26 de la
          Ley 1581 de 2012, las transferencias a dichos países se realizan con base en la{' '}
          <strong>autorización expresa del titular</strong>, quien ha sido informado de este
          hecho antes de otorgar el consentimiento. No vendemos datos a terceros.
        </p>
      </section>

      <section>
        <h2>5. Derechos del Titular</h2>
        <p>
          Como titular de los datos (o como padre/madre/tutor del menor cuyos datos tratamos),
          usted tiene los siguientes derechos conforme al artículo 8 de la Ley 1581 de 2012:
        </p>
        <ul>
          <li><strong>Acceso:</strong> conocer qué datos personales suyos o de su hijo/a tenemos.</li>
          <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
          <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando no exista obligación legal de conservarlos.</li>
          <li><strong>Oposición:</strong> oponerse al tratamiento para finalidades de comunicaciones comerciales.</li>
          <li><strong>Portabilidad:</strong> recibir una copia de sus datos en formato estructurado.</li>
          <li><strong>Revocación del consentimiento:</strong> retirar la autorización otorgada en cualquier momento, sin efecto retroactivo.</li>
        </ul>
        <p>
          Para ejercer estos derechos, visita nuestra página{' '}
          <a href="/dsar">Derechos del Titular</a> o escribe a{' '}
          <a href="mailto:privacidad@peskids.co">privacidad@peskids.co</a>.
          Responderemos en un máximo de <strong>15 días hábiles</strong>, conforme al artículo
          14 de la Ley 1581.
        </p>
        <p>
          También puede acudir ante la{' '}
          <strong>Superintendencia de Industria y Comercio (SIC)</strong> —
          autoridad de protección de datos en Colombia — si considera que sus derechos han
          sido vulnerados.
        </p>
      </section>

      <section>
        <h2>6. Datos de Menores de Edad</h2>
        <p>
          Los datos relacionados con menores de 18 años se tratan con especial protección, conforme
          al artículo 7 de la Ley 1581 de 2012 y el artículo 12 del Decreto 1377 de 2013.
          El tratamiento de dichos datos requiere la <strong>autorización previa, expresa e
          informada del padre, madre o tutor legal</strong>, la cual se obtiene mediante el
          formulario de solicitud. Consulta nuestro{' '}
          <a href="/aviso-parental">Aviso de Autorización Parental</a>.
        </p>
      </section>

      <section>
        <h2>7. Retención y Eliminación</h2>
        <ul>
          <li>Datos de prospectos sin conversión: <strong>24 meses</strong> desde el último contacto, luego eliminación o anonimización.</li>
          <li>Datos de estudiantes matriculados: durante la vigencia de la matrícula + <strong>12 meses</strong>.</li>
          <li>Registros de auditoría: <strong>5 años</strong> (obligación legal).</li>
          <li>Conversaciones del asistente de IA: <strong>90 días</strong>.</li>
        </ul>
      </section>

      <section>
        <h2>8. Seguridad</h2>
        <p>
          Implementamos medidas técnicas y organizativas para proteger sus datos, incluyendo:
          cifrado AES-256 en reposo, TLS en tránsito, control de acceso basado en roles (RLS),
          y registros de auditoría de operaciones críticas.
        </p>
      </section>

      <section>
        <h2>9. Cambios a esta Política</h2>
        <p>
          Cualquier cambio sustancial a esta política será comunicado por correo electrónico
          a los titulares registrados con al menos <strong>10 días hábiles de anticipación</strong>.
          La versión vigente siempre estará disponible en{' '}
          <a href="/privacy">peskids.co/privacy</a>.
        </p>
      </section>

      <section>
        <h2>10. Ley Aplicable</h2>
        <p>
          Esta política se rige por las leyes de la República de Colombia. Toda controversia
          será dirimida ante los jueces competentes de la ciudad de Medellín, Colombia.
        </p>
      </section>
    </LegalPageLayout>
  )
}
