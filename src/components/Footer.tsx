import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#023e55] text-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <h2 className="text-white font-bold text-2xl tracking-tight">
              RP <span className="text-[#2ba5b2]">Tech</span>
            </h2>
            <p className="text-sm leading-relaxed max-w-xs">
              Tu tienda de accesorios tecnológicos.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm hover:text-[#f7af02] transition-colors duration-200"
                >
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  href="/#catalogo"
                  className="text-sm hover:text-[#f7af02] transition-colors duration-200"
                >
                  Catálogo
                </Link>
              </li>
              <li>
                <Link
                  href="/ventas"
                  className="text-sm hover:text-[#f7af02] transition-colors duration-200"
                >
                  Portal Ventas
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Contacto</h3>
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/51935423395"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20bd5a] transition-colors text-white"
                aria-label="Contactar por WhatsApp"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.005-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z" />
                </svg>
              </a>
              <div className="flex flex-col">
                <a
                  href="https://wa.me/51935423395"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#f7af02] transition-colors text-sm"
                >
                  51935423395
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-white/60">
            © 2024 RP Tech. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
