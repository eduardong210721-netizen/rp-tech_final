'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(false);

    if (value !== '' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every(digit => digit !== '')) {
      validatePin(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && pin[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validatePin = (enteredPin: string) => {
    const validPin = process.env.NEXT_PUBLIC_VENDOR_PIN || '1234';
    if (enteredPin === validPin) {
      sessionStorage.setItem('rp_vendor_auth', 'true');
      onUnlock();
    } else {
      setError(true);
      setPin(['', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-primary flex items-center justify-center p-4">
      <div className={`bg-white/5 backdrop-blur-xl rounded-3xl p-8 w-full max-w-sm border border-white/10 flex flex-col items-center ${error ? 'animate-shake' : ''}`}>
        <h1 className="text-2xl font-bold text-white mb-2">Portal de Ventas <span className="text-accent">RP Tech</span></h1>
        <p className="text-white/60 mb-8 text-center">Ingrese el PIN de acceso</p>

        <div className="flex gap-4 mb-6">
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={el => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              pattern="[0-9]"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 text-center text-2xl font-bold bg-white/10 border-2 border-white/20 rounded-xl text-white focus:border-accent focus:ring-accent outline-none transition-colors"
            />
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium">PIN incorrecto</p>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
}
