'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('shake_admin_auth') === 'true');
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-brand-500">
              Shake Expenses
            </Link>
            <div className="hidden sm:flex gap-4">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-brand-500 transition-colors"
              >
                Cargar gastos
              </Link>
              <Link
                href="/historial"
                className="text-sm text-gray-600 hover:text-brand-500 transition-colors"
              >
                Mis gastos
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-gray-600 hover:text-brand-500 transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
