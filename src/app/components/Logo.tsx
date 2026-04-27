'use client';

import Link from 'next/link';
import { UtensilsCrossed } from 'lucide-react';
import styles from './Logo.module.css';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 24, className }: LogoProps) {
  return (
    <Link 
      href="/" 
      scroll={false}
      aria-label="Página inicial Pedi-AI"
      className={className}
    >
      <UtensilsCrossed size={size} className={styles.logoIcon} aria-hidden="true" />
      <span className={styles.logoText}>Pedi-AI</span>
    </Link>
  );
}