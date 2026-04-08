export default function RootLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f1f5f9',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          borderRadius: 28,
          background: '#ffffff',
          boxShadow: '0 20px 50px rgba(15,23,42,0.14)',
          padding: 24,
          display: 'grid',
          gap: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '3px solid rgba(139,21,56,0.16)',
              borderTopColor: '#8b1538',
              animation: 'battle-rhythm-spin 0.8s linear infinite',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Loading</div>
            
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ height: 12, width: '42%', borderRadius: 999, background: 'rgba(148,163,184,0.20)' }} />
          <div style={{ height: 12, width: '100%', borderRadius: 999, background: 'rgba(148,163,184,0.20)' }} />
          <div style={{ height: 12, width: '82%', borderRadius: 999, background: 'rgba(148,163,184,0.20)' }} />
        </div>
      </div>

      <style>{`
        @keyframes battle-rhythm-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
