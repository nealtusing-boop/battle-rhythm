function skeletonLine(width: string) {
  return {
    width,
    height: 14,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.18)',
  } as const;
}

function whiteCardStyle() {
  return {
    borderRadius: 30,
    background: '#ffffff',
    padding: 22,
    boxShadow: '0 18px 44px rgba(15,23,42,0.14)',
    color: '#0f172a',
  } as const;
}

export default function AppSectionLoading() {
  return (
    <div style={{ padding: 16, display: 'grid', gap: 16 }}>
      <section style={{ display: 'grid', gap: 10 }}>
        <div style={{ ...skeletonLine('52%'), height: 18 }} />
        <div style={{ ...skeletonLine('28%'), opacity: 0.8 }} />
      </section>

      <section style={whiteCardStyle()}>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={skeletonLine('36%')} />
          <div style={skeletonLine('88%')} />
          <div style={skeletonLine('72%')} />
          <div
            style={{
              borderRadius: 20,
              background: '#f8fafc',
              border: '1px solid rgba(15,23,42,0.08)',
              minHeight: 220,
            }}
          />
        </div>
      </section>
    </div>
  );
}
