import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Shake Expenses — Rendición de Gastos',
  description: 'Sistema de rendición de gastos de Shake Again',
};

function Navbar() {
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
                Historial
              </Link>
              <Link
                href="/admin"
                className="text-sm text-gray-600 hover:text-brand-500 transition-colors"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
