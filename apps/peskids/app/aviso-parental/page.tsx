import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';

export const metadata: Metadata = {
  title: 'Aviso de Autorización Parental · Peskids',
  description:
    'Aviso de privacidad y autorización parental para el tratamiento de datos de menores, conforme al Decreto 1377 de 2013 de Colombia.',
};

export default function AvisoParentalPage(): React.ReactElement {
  return (
    <LegalPageLayout
      title="Aviso de Autorización Parental para Tratamiento de Datos de Menores"
      version="1.0"
      effectiveDate="24 de mayo de 2026"
      policyId="pk-parental-v1"
    >
      <div className="rounded-lg border-2 border-pk-primary/30 bg-pk-primary/5 p-4 text-sm">
        <strong>Importante:</strong> Este documento aplica al tratamiento de datos personales de
        menores de 18 años. Conforme al artículo 7 de la Ley 1581 de 2012 y el artículo 12 del
        Decreto 1377 de 2013, solo el padre, madre o tutor legal puede autorizar el tratamiento de
        los datos de un menor.
      </div>

      <section>
        <h2>1. ¿Quién solicita la autorización?</h2>
        <p>
          <strong>Peskids — Academia de Natación</strong>
          <br />
          Sede: Llanogrande, Rionegro, Antioquia, Colombia
          <br />
          Contacto: <a href="mailto:privacidad@peskids.co">privacidad@peskids.co</a>
        </p>
      </section>

      <section>
        <h2>2. ¿Para qué tratamos los datos del menor?</h2>
        <p>
          Al solicitar una clase de prueba o matricular a su hijo/a, recolectamos información
          relacionada con el menor para los siguientes fines:
        </p>
        <ul>
          <li>Evaluar habilidades de natación y asignar el grupo o instructor adecuado.</li>
          <li>Coordinar horarios, sede (presencial o domicilio) y necesidades especiales.</li>
          <li>Llevar el seguimiento del progreso del estudiante.</li>
          <li>Comunicar novedades del programa al acudiente (notas, torneos, eventos).</li>
          <li>Cumplir con requisitos legales y de seguridad en la prestación del servicio.</li>
        </ul>
      </section>

      <section>
        <h2>3. ¿Qué datos del menor tratamos?</h2>
        <ul>
          <li>Edad o rango de edad (en la solicitud inicial).</li>
          <li>Nombre del menor (una vez iniciado el proceso de matrícula).</li>
          <li>Información sobre sus hitos y progreso en el programa.</li>
          <li>
            En caso de necesidades especiales: información relevante para la seguridad en el agua
            (con autorización adicional).
          </li>
        </ul>
        <p>
          <strong>No recolectamos</strong> número de documento de identidad del menor, fotos o
          videos sin autorización expresa adicional, ni información médica detallada sin
          justificación de seguridad.
        </p>
      </section>

      <section>
        <h2>4. ¿Con quién compartimos estos datos?</h2>
        <p>Los datos del menor pueden ser compartidos con:</p>
        <ul>
          <li>
            <strong>Instructores y staff de Peskids:</strong> para la prestación del servicio.
          </li>
          <li>
            <strong>Supabase Inc. (USA):</strong> almacenamiento seguro de la base de datos.
          </li>
          <li>
            <strong>Jelou S.A.S (Colombia):</strong> mensajería con el acudiente (no con el menor
            directamente).
          </li>
        </ul>
        <p>
          No compartimos datos de menores con anunciantes, redes de datos ni terceros ajenos a la
          prestación del servicio.
        </p>
      </section>

      <section>
        <h2>5. ¿Por cuánto tiempo conservamos los datos?</h2>
        <ul>
          <li>Durante la vigencia del proceso de matrícula o la relación de servicio.</li>
          <li>
            Hasta <strong>12 meses adicionales</strong> tras el último contacto o la terminación del
            servicio.
          </li>
          <li>Después de este plazo: eliminación o anonimización completa.</li>
        </ul>
      </section>

      <section>
        <h2>6. Derechos del titular y del representante legal</h2>
        <p>Como padre, madre o tutor legal, usted puede en cualquier momento:</p>
        <ul>
          <li>
            <strong>Consultar</strong> qué datos del menor tenemos registrados.
          </li>
          <li>
            <strong>Corregir</strong> datos incorrectos o desactualizados.
          </li>
          <li>
            <strong>Solicitar la eliminación</strong> de los datos del menor.
          </li>
          <li>
            <strong>Revocar esta autorización</strong>, lo que implicará el retiro del menor del
            programa.
          </li>
        </ul>
        <p>
          Para ejercer estos derechos: <a href="/dsar">formulario de derechos del titular</a> o
          escribe a <a href="mailto:privacidad@peskids.co">privacidad@peskids.co</a>. Respuesta en
          máximo <strong>15 días hábiles</strong>.
        </p>
      </section>

      <section>
        <h2>7. ¿Cómo otorgo la autorización?</h2>
        <p>
          La autorización parental se otorga de manera electrónica al marcar la casilla de
          consentimiento en el formulario de solicitud de clase de prueba. Esta acción queda
          registrada con fecha, hora e identificador de la versión de la política vigente,
          constituyendo prueba de la autorización conforme al artículo 12 del Decreto 1377 de 2013.
        </p>
        <p>
          La autorización es libre, previa, expresa e informada. Puede ser revocada en cualquier
          momento sin que ello genere consecuencias distintas a la imposibilidad de continuar el
          servicio.
        </p>
      </section>
    </LegalPageLayout>
  );
}
