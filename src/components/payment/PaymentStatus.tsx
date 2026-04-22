'use client'

interface PaymentStatusProps {
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  onRetry?: () => void
}

export function PaymentStatus({ status, onRetry }: PaymentStatusProps) {
  const configs = {
    pending: {
      color: 'text-yellow-500',
      label: 'Pendente',
      spinner: true,
    },
    processing: {
      color: 'text-blue-500',
      label: 'Processando',
      spinner: true,
    },
    paid: {
      color: 'text-green-500',
      label: 'Pago',
      checkmark: true,
    },
    failed: {
      color: 'text-red-500',
      label: 'Falhou',
      cross: true,
    },
    refunded: {
      color: 'text-gray-400',
      label: 'Reembolsado',
    },
  }

  const config = configs[status]

  return (
    <div className="flex flex-col items-center gap-2" data-testid="payment-status">
      <div className={`flex items-center gap-2 ${config.color}`}>
        {'spinner' in config && config.spinner && (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {'checkmark' in config && config.checkmark && (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
        {'cross' in config && config.cross && (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        )}
        <span className="font-medium">{config.label}</span>
      </div>
      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}