import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Peskids — Academia de natación en Medellín';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Static logo read from disk and inlined as a data URI: `ImageResponse`
 * renders outside the normal Next.js asset pipeline, so a plain `/brand/...`
 * path would 404 against the OG image's own render context.
 */
async function logoDataUri(): Promise<string> {
  const bytes = await readFile(join(process.cwd(), 'public/brand/logo-official.png'));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

export default async function InstagramOpengraphImage(): Promise<ImageResponse> {
  const logo = await logoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          backgroundColor: '#1B607E',
          backgroundImage: 'linear-gradient(135deg, #1B607E 0%, #14495F 100%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={220} height={220} alt="" style={{ borderRadius: 32 }} />
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          Clases de natación para niños
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#B7E5E0',
            textAlign: 'center',
          }}
        >
          Sede Llanogrande o a domicilio · Medellín
        </div>
      </div>
    ),
    { ...size }
  );
}
