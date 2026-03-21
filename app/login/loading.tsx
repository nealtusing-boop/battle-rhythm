export default function LoginLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0c 0%, #17171b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          display: 'grid',
          gap: 20,
        }}
      >
        <section
          style={{
            padding: '8px 4px',
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: 0,
              fontSize: 44,
              lineHeight: 0.96,
              fontWeight: 800,
              letterSpacing: '-0.06em',
              color: '#ffffff',
            }}
          >
            Battle Rhythm
          </h1>
        </section>

        <section
          style={{
            background: 'rgba(255,255,255,0.97)',
            borderRadius: 32,
            padding: 24,
            boxShadow: '0 24px 70px rgba(15,23,42,0.24)',
            color: '#0f172a',
            display: 'grid',
            gap: 14,
          }}
        >
          <div
            style={{
              height: 18,
              width: 120,
              borderRadius: 999,
              background: '#e2e8f0',
            }}
          />
          <div
            style={{
              height: 38,
              width: '72%',
              borderRadius: 14,
              background: '#e2e8f0',
            }}
          />
          <div
            style={{
              height: 16,
              width: '88%',
              borderRadius: 999,
              background: '#f1f5f9',
            }}
          />

          <div
            style={{
              height: 52,
              borderRadius: 18,
              background: '#f8fafc',
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          />
          <div
            style={{
              height: 52,
              borderRadius: 18,
              background: '#f8fafc',
              border: '1px solid rgba(15,23,42,0.08)',
            }}
          />
          <div
            style={{
              height: 52,
              borderRadius: 18,
              background: 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
              boxShadow: '0 14px 30px rgba(139,21,56,0.28)',
            }}
          />
        </section>
      </div>
    </div>
  );
}