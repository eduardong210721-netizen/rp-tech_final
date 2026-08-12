'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#023e55]/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.jpg"
              alt="RP Tech Logo"
              width={40}
              height={40}
              className="rounded-md object-cover"
            />
            <span className="text-white font-bold text-xl tracking-tight">
              RP <span className="text-[#2ba5b2]">Tech</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-white hover:text-[#f7af02] transition-colors duration-200 font-medium"
            >
              Inicio
            </Link>
            <Link
              href="/ventas"
              className="text-white hover:text-[#f7af02] transition-colors duration-200 font-medium"
            >
              Portal Ventas
            </Link>
            <Link
              href="/admin"
              className="bg-[#2ba5b2] text-white hover:bg-[#20838e] transition-colors duration-200 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
              Editar Productos
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white focus:outline-none"
              aria-label="Toggle menu"
            >
              <div className="w-6 flex flex-col justify-between items-end h-5 cursor-pointer relative">
                <span
                  className={`w-full h-[2px] bg-white rounded-sm transform transition-all duration-300 ${
                    isOpen ? 'rotate-45 absolute top-2' : ''
                  }`}
                />
                <span
                  className={`w-full h-[2px] bg-white rounded-sm transition-all duration-300 ${
                    isOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`w-full h-[2px] bg-white rounded-sm transform transition-all duration-300 ${
                    isOpen ? '-rotate-45 absolute top-2' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1 bg-[#023e55] shadow-inner">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:text-[#f7af02] hover:bg-[#3b4e73]/50 transition-colors"
          >
            Inicio
          </Link>
          <Link
            href="/ventas"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-white hover:text-[#f7af02] hover:bg-[#3b4e73]/50 transition-colors"
          >
            Portal Ventas
          </Link>
          <Link
            href="/admin"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-[#2ba5b2] hover:text-white hover:bg-[#2ba5b2]/20 transition-colors"
          >
            ✏️ Editar Productos
          </Link>
        </div>
      </div>
    </nav>
  );
}
