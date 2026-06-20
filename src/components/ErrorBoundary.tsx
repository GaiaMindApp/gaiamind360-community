import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    const safeMsg = (error?.message ?? String(error)).replace(/[\r\n]/g, ' ').slice(0, 500);
    console.error('Error caught by boundary:', safeMsg);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#e0f7fa',
          background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1729 100%)'
        }}>
          <h2>Erro ao carregar componente</h2>
          <p>Por favor, recarregue a página</p>
        </div>
      )
    }

    return this.props.children
  }
}
