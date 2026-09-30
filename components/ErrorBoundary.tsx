import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  cleaningCache: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    cleaningCache: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, copied: false, cleaningCache: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleCopyError = async () => {
    const errorText = [
      '===============================',
      'REPORTE DE ERROR REMBRANDT IA',
      '===============================',
      `Fecha: ${new Date().toISOString()} (${new Date().toLocaleString()})`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
      `Error: ${this.state.error?.name}: ${this.state.error?.message}`,
      '\n--- STACK TRACE ---',
      this.state.error?.stack || 'No stack disponible',
      '\n--- COMPONENT STACK ---',
      this.state.errorInfo?.componentStack || 'No component stack disponible',
      '==============================='
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(errorText);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = errorText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 4000);
    } catch (err) {
      console.error('No se pudo copiar automáticamente:', err);
    }
  };

  private handleCleanCacheAndReload = async () => {
    this.setState({ cleaningCache: true });
    try {
      // 1. Delete all caches
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
      // 2. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
    } catch (e) {
      console.warn('Error limpiando caché:', e);
    }
    // 3. Force reload with cache-busting timestamp
    const cleanUrl = window.location.origin + window.location.pathname + '?reload=' + Date.now();
    window.location.replace(cleanUrl);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '24px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #030712 100%)',
          color: '#f8fafc',
          minHeight: '100vh',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '850px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)',
            backdropFilter: 'blur(16px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                ⚠️
              </div>
              <div>
                <h1 style={{ color: '#f87171', fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>
                  Algo salió mal en Rembrandt IA Studio
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Ocurrió un error inesperado al renderizar la pestaña.
                </p>
              </div>
            </div>

            {/* Error box */}
            <pre style={{
              background: '#020617',
              color: '#fca5a5',
              padding: '16px',
              overflow: 'auto',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontSize: '12px',
              fontFamily: 'Consolas, Monaco, monospace',
              lineHeight: '1.6',
              maxHeight: '260px',
              margin: '18px 0'
            }}>
              <strong>{this.state.error?.toString()}</strong>
              {this.state.error?.stack && (
                <>
                  <br /><br />
                  <span style={{ color: '#94a3b8' }}>{this.state.error.stack}</span>
                </>
              )}
              {this.state.errorInfo?.componentStack && (
                <>
                  <br /><br />
                  <span style={{ color: '#64748b' }}>Component Stack:{this.state.errorInfo.componentStack}</span>
                </>
              )}
            </pre>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={this.handleCopyError}
                style={{
                  padding: '12px 20px',
                  background: this.state.copied ? '#059669' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: this.state.copied ? '0 0 15px rgba(16, 185, 129, 0.5)' : '0 0 15px rgba(59, 130, 246, 0.4)'
                }}
              >
                {this.state.copied ? '✅ ¡Copiado! Pégalo aquí con Ctrl + V' : '📋 Copiar Error al Portapapeles'}
              </button>

              <button
                onClick={this.handleCleanCacheAndReload}
                disabled={this.cleaningCache}
                style={{
                  padding: '12px 20px',
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: '#e9d5ff',
                  border: '1px solid rgba(168, 85, 247, 0.4)',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {this.cleaningCache ? '🧹 Limpiando y recargando...' : '🧹 Limpiar Caché y Forzar Recarga'}
              </button>

              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 18px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🔄 Recargar Página
              </button>
            </div>
            
            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '16px', margin: '16px 0 0 0' }}>
              💡 Haz clic en <strong>"Copiar Error al Portapapeles"</strong> y solo presiona <strong>Ctrl + V</strong> en el chat para compartir todos los detalles del error al asistente.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
