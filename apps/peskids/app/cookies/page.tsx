import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/legal/legal-page-layout';

export const metadata: Metadata = {
  title: 'Política de Cookies · Peskids',
  description:
    'Información sobre el uso de cookies y almacenamiento local en el sitio web de Peskids.',
};

/** Marketing cookies (Meta Pixel) only exist when a Pixel ID is actually configured. */
const HAS_MARKETING_PIXEL = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);

export default function CookiesPage(): React.ReactElement {
  return (
    <LegalPageLayout
      title="Política de Cookies y Almacenamiento Local"
      version={HAS_MARKETING_PIXEL ? '2.0' : '1.0'}
      effectiveDate={HAS_MARKETING_PIXEL ? '6 de septiembre de 2026' : '24 de mayo de 2026'}
      policyId={HAS_MARKETING_PIXEL ? 'pk-cookies-v2' : 'pk-cookies-v1'}
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
          Estas cookies son indispensables para el funcionamiento del área de acceso para docentes y
          administradores. No pueden desactivarse.
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
              <td>
                <code>sb-access-token</code>
              </td>
              <td>Supabase</td>
              <td>Mantener la sesión autenticada del staff</td>
              <td>1 hora (renovable)</td>
            </tr>
            <tr>
              <td>
                <code>sb-refresh-token</code>
              </td>
              <td>Supabase</td>
              <td>Renovar la sesión sin re-autenticar</td>
              <td>7 días</td>
            </tr>
          </tbody>
        </table>
        <p>
          <em>
            Nota: estas cookies solo se establecen cuando un usuario del staff (docente o
            administrador) inicia sesión. Los visitantes del sitio público no reciben estas cookies.
          </em>
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
              <td>
                <code>pk-cookie-consent</code>
              </td>
              <td>Recordar si aceptaste este aviso de cookies{HAS_MARKETING_PIXEL ? ' y si autorizaste cookies de marketing' : ''}</td>
              <td>365 días (localStorage, no es cookie)</td>
            </tr>
          </tbody>
        </table>

        {HAS_MARKETING_PIXEL ? (
          <>
            <h3>Cookies de marketing (solo si las aceptas)</h3>
            <p>
              Usamos el Píxel de Meta para medir la efectividad de nuestras campañas en Instagram y
              Facebook, y para mostrar nuestros anuncios a personas con intereses similares a
              quienes ya nos contactaron. Se activa únicamente si eliges &quot;Aceptar todo&quot; en
              el aviso de cookies; puedes rechazarlo eligiendo &quot;Solo esenciales&quot; sin que
              esto afecte el uso del sitio.
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
                  <td>
                    <code>_fbp</code>
                  </td>
                  <td>Meta</td>
                  <td>Identificar el navegador para medir conversiones de campañas</td>
                  <td>90 días</td>
                </tr>
                <tr>
                  <td>
                    <code>_fbc</code>
                  </td>
                  <td>Meta</td>
                  <td>Asociar un clic en un anuncio de Meta con la visita al sitio</td>
                  <td>90 días</td>
                </tr>
              </tbody>
            </table>
            <p>
              Además del píxel en tu navegador, enviamos una copia del mismo evento de conversión
              directamente desde nuestro servidor a Meta (sin depender de que tu navegador permita
              el píxel), con tu correo y teléfono siempre convertidos a un valor irreversible
              (hash SHA-256) antes de salir de nuestro servidor — Meta nunca recibe tu correo o
              teléfono en texto plano.
            </p>
          </>
        ) : null}
      </section>

      <section>
        <h2>3. Lo que NO hacemos</h2>
        <ul>
          <li>
            <strong>Google Fonts:</strong> usamos <code>next/font/google</code>, que descarga las
            fuentes en el momento de compilar el sitio y las sirve desde nuestro propio servidor. Tu
            navegador nunca se conecta a los servidores de Google al visitar este sitio.
          </li>
          <li>
            <strong>Instagram:</strong> el feed de fotos se carga desde nuestra API en el servidor
            (no desde el navegador), por lo que Meta no instala cookies ni píxeles de seguimiento
            cuando visitas esta página{HAS_MARKETING_PIXEL ? ' (esto es aparte del Píxel de marketing descrito arriba)' : ''}.
          </li>
          {HAS_MARKETING_PIXEL ? null : (
            <li>
              <strong>Píxeles publicitarios:</strong> no instalamos píxeles de Meta, Google Ads,
              TikTok ni similares.
            </li>
          )}
          <li>
            <strong>Analíticas de terceros:</strong> no usamos Google Analytics, Hotjar ni
            herramientas similares que rastreen tu comportamiento entre sitios.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Tu control sobre las cookies</h2>
        <p>
          Puedes gestionar o eliminar cookies desde la configuración de tu navegador. Ten en cuenta
          que eliminar las cookies de sesión de Supabase cerrará la sesión del área de staff.
        </p>
        <ul>
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear"
              target="_blank"
              rel="noopener noreferrer"
            >
              Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/es-co/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
            >
              Safari
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Contacto</h2>
        <p>
          Preguntas sobre esta política:{' '}
          <a href="mailto:peskidsnatacion@gmail.com">peskidsnatacion@gmail.com</a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
