import type { Metadata } from 'next'
import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata: Metadata = {
  title: 'Política de Cookies · Peskids',
  description: 'Información sobre el uso de cookies y almacenamiento local en el sitio web de Peskids.',
}

export default function CookiesPage(): React.ReactElement {
  return (
    <LegalPageLayout
      title="Política de Cookies y Almacenamiento Local"
      version="1.0"
      effectiveDate="24 de mayo de 2026"
      policyId="pk-cookies-v1"
    >
      <section>
        <h2>1. ¿Qué son las cookies?</h2>
        <p>
          Las cookies son pequeños archivos de texto que un sitio web almacena en su dispositivo
          para recordar preferencias o mantener sesiones activas. Además de cookies, usamos
          almacenamiento local del navegador (<code>localStorage</code>) para guardar preferencias
          de consentimiento.
        </p>
      </section>

      <section>
        <h2>2. Cookies y almacenamiento que usamos</h2>

        <h3>Cookies estrictamente necesarias</h3>
        <p>
          Estas cookies son indispensables para el funcionamiento del área de acceso para
          docentes y administradores. No pueden desactivarse.
        </p>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Proveedor</th>
              <th>Finalidad</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sb-access-token</code></td>
              <td>Supabase</td>
              <td>Mantener la sesión autenticada del staff</td>
              <td>1 hora (renovable)</td>
            </tr>
            <tr>
              <td><code>sb-refresh-token</code></td>
              <td>Supabase</td>
              <td>Renovar la sesión sin re-autenticar</td>
              <td>7 días</td>
            </tr>
          </tbody>
        </table>
        <p>
          <em>Nota: estas cookies solo se establecen cuando un usuario del staff (docente o administrador)
          inicia sesión. Los visitantes del sitio público no reciben estas cookies.</em>
        </p>

        <h3>Almacenamiento local de preferencias</h3>
        <table>
          <thead>
            <tr>
              <th>Clave</th>
              <th>Finalidad</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>pk-cookie-consent</code></td>
              <td>Recordar si aceptaste este aviso de cookies</td>
              <td>365 días (localStorage, no es cookie)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>3. Lo que NO hacemos</h2>
        <ul>
          <li>
            <strong>Google Fonts:</strong> usamos <code>next/font/google</code>, que descarga
            las fuentes en el momento de compilar el sitio y las sirve desde nuestro propio
            servidor. Tu navegador nunca se conecta a los servidores de Google al visitar
            este sitio.
          </li>
          <li>
            <strong>Instagram:</strong> el feed de fotos se carga desde nuestra API en el servidor
            (no desde el navegador), por lo que Meta no instala cookies ni píxeles de seguimiento
            cuando visitas esta página.
          </li>
          <li>
            <strong>Píxeles publicitarios:</strong> no instalamos píxeles de Meta, Google Ads,
            TikTok ni similares.
          </li>
          <li>
            <strong>Analíticas de terceros:</strong> no usamos Google Analytics, Hotjar ni
            herramientas similares que rastreen tu comportamiento entre sitios.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Tu control sobre las cookies</h2>
        <p>
          Puedes gestionar o eliminar cookies desde la configuración de tu navegador. Ten en
          cuenta que eliminar las cookies de sesión de Supabase cerrará la sesión del área
          de staff.
        </p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
          <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear" target="_blank" rel="noopener noreferrer">Firefox</a></li>
          <li><a href="https://support.apple.com/es-co/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">Safari</a></li>
        </ul>
      </section>

      <section>
        <h2>5. Contacto</h2>
        <p>
          Preguntas sobre esta política:{' '}
          <a href="mailto:privacidad@peskids.co">privacidad@peskids.co</a>
        </p>
      </section>
    </LegalPageLayout>
  )
}
