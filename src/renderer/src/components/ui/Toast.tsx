import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

let toastListeners: ((toast: Toast) => void)[] = []

export function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
  const toast: Toast = { id: Date.now().toString(), message, type }
  toastListeners.forEach(listener => listener(toast))
}

export function ToastContainer(): JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 3500)
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />
      default: return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-emerald-500/30'
      case 'error': return 'border-red-500/30'
      case 'warning': return 'border-amber-500/30'
      default: return 'border-blue-500/30'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={
            'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-card border ' +
            getBorderColor(toast.type) +
            ' shadow-lg shadow-black/20 min-w-[300px] max-w-[420px] animate-[slideIn_0.3s_ease-out]'
          }
        >
          {getIcon(toast.type)}
          <span className="text-sm text-text-primary flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 rounded-md hover:bg-surface-hover text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
