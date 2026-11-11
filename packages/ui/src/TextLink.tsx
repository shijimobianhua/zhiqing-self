import type { ReactNode } from 'react';
export function TextLink({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return <a className={`text-link ${className}`} href={href}>{children}</a>;
}
