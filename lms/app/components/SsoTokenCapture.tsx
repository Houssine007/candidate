'use client';

import { useEffect } from 'react';
import { captureSsoToken } from '@/lib/sso-client';

// Capture le token JWT RH transmis via ?token= dès le chargement de n'importe
// quelle page du LMS, et le persiste dans localStorage. Monté dans le layout racine.
export default function SsoTokenCapture() {
  useEffect(() => {
    captureSsoToken();
  }, []);

  return null;
}
