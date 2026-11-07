import { useEffect } from 'react'
import { Icon } from './Icons'

export interface ToastData {
  id: number
  title: string
  message?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

interface ToastProps {
  data: ToastData
  onDismiss: () => void
}

export function Toast({ data, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4_000)
    return () => window.clearTimeout(timer)
  }, [data.id, onDismiss])

  const tone = data.tone ?? 'default'
  const icon = tone === 'success' ? 'check' : tone === 'default' ? 'info' : 'alert'

  return (
    <div className={`toast toast-${tone}`} role="status" aria-live="polite">
      <div className="toast-icon">
        <Icon name={icon} size={18} />
      </div>
      <div className="toast-copy">
        <strong>{data.title}</strong>
        {data.message && <span>{data.message}</span>}
      </div>
      <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        <Icon name="x" size={15} />
      </button>
      <span className="toast-progress" />
    </div>
  )
}
