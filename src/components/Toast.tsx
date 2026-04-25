'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
  duration?: number
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (type === 'success' && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [type, duration, onClose])

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div
        className={`flex items-center gap-3 min-w-[320px] max-w-md p-4 rounded-lg shadow-lg border ${
          type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div className="flex-shrink-0">
          {type === 'success' ? (
            <CheckCircle className="text-green-600" size={20} />
          ) : (
            <XCircle className="text-red-600" size={20} />
          )}
        </div>
        <p
          className={`flex-1 text-sm font-medium ${
            type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}
        >
          {message}
        </p>
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${
            type === 'success'
              ? 'text-green-600 hover:text-green-800'
              : 'text-red-600 hover:text-red-800'
          }`}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
