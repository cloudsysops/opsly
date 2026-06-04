import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';

type BrandLogoProps = {
  variant?: 'horizontal' | 'icon';
};

export function BrandLogo({ variant = 'horizontal' }: BrandLogoProps): ReactElement {
  const src =
    variant === 'icon' ? '/brand/logo-square.png' : '/brand/logo-primary.png';
  const width = variant === 'icon' ? 40 : 160;
  const height = variant === 'icon' ? 40 : 48;

  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="ICSO home">
      <Image
        src={src}
        alt="IntCloud SysOps"
        width={width}
        height={height}
        className="h-auto w-auto max-h-12 object-contain"
        priority
      />
    </Link>
  );
}
