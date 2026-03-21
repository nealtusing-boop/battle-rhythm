'use client';

export function AppSplash({
  subtitle = 'Loading platoon operations...',
}: {
  subtitle?: string;
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0c 0%, #17171b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom)) 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'grid',
          justifyItems: 'center',
          gap: 18,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 92,
            height: 92,
            borderRadius: 28,
            background: 'linear-gradient(180deg, #8b1538 0%, #6f102d 100%)',
            boxShadow: '0 20px 50px rgba(139,21,56,0.34)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: 32,
            fontWeight: 800,
            letterSpacing: '-0.06em',
          }}
        >
          BR
        </div>

        <div>
          <h1
            style={{
              margin: 0,
              color: '#ffffff',
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: 0.95,
            }}
          >
            Battle Rhythm
          </h1>

          <p
            style={{
              marginTop: 10,
              marginBottom: 0,
              color: 'rgba(255,255,255,0.72)',
              fontSize: 15,
            }}
          >
            {subtitle}
          </p>
        </div>

        <div
          style={{
            width: 180,
            height: 6,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '42%',
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #8b1538 0%, #d8a4b4 100%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}