import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '1.5rem', padding: '4rem 2rem', minHeight: '400px',
        }}>
          <AlertTriangle size={48} color="#DC2626" />
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>
            Algo salió mal
          </h2>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748B', textAlign: 'center', maxWidth: '480px', lineHeight: 1.5 }}>
            Ocurrió un error inesperado al renderizar este panel. Intenta recargar la página.
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.6rem 1.5rem', background: '#1E3A8A', color: '#FFFFFF',
              border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,58,138,0.25)',
              transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#0F2B6B'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#1E3A8A'}
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
