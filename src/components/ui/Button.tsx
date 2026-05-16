'use client'

import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  fullWidth = true,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'flex items-center justify-center rounded-2xl px-6 py-4 text-base font-semibold transition-opacity disabled:opacity-50 active:opacity-80'
  const variants: Record<Variant, string> = {
    primary: 'bg-[#F05A1E] text-white',
    secondary: 'bg-white border border-gray-200 text-gray-900',
  }
  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
