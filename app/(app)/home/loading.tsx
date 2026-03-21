export default function HomeLoading() {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section style={{ paddingTop: 8 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          Home
        </div>

        <div
          style={{
            marginTop: 18,
            height: 58,
            width: '88%',
            maxWidth: 520,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.12)',
          }}
        />

        <div
          style={{
            marginTop: 18,
            height: 24,
            width: 220,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.12)',
          }}
        />
      </section>

      <section
        style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: 40,
          padding: 28,
          boxShadow: '0 24px 70px rgba(15,23,42,0.18)',
        }}
      >
        <div
          style={{
            height: 44,
            width: 260,
            borderRadius: 16,
            background: '#e2e8f0',
          }}
        />
        <div
          style={{
            marginTop: 16,
            height: 22,
            width: 230,
            borderRadius: 12,
            background: '#f1f5f9',
          }}
        />

        <div
          style={{
            marginTop: 24,
            borderRadius: 28,
            background: '#f1f5f9',
            border: '1px solid rgba(15,23,42,0.06)',
            padding: 24,
            display: 'grid',
            gap: 14,
          }}
        >
          <div
            style={{
              height: 24,
              width: '32%',
              borderRadius: 12,
              background: '#dbe4ee',
            }}
          />
          <div
            style={{
              height: 20,
              width: '24%',
              borderRadius: 10,
              background: '#dbe4ee',
            }}
          />
          <div
            style={{
              height: 18,
              width: '55%',
              borderRadius: 10,
              background: '#e2e8f0',
            }}
          />
        </div>
      </section>

      <section
        style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: 40,
          padding: 28,
          boxShadow: '0 24px 70px rgba(15,23,42,0.18)',
        }}
      >
        <div
          style={{
            height: 44,
            width: 180,
            borderRadius: 16,
            background: '#e2e8f0',
          }}
        />
        <div
          style={{
            marginTop: 16,
            height: 22,
            width: 260,
            borderRadius: 12,
            background: '#f1f5f9',
          }}
        />

        <div
          style={{
            marginTop: 24,
            borderRadius: 28,
            background: 'rgba(139,21,56,0.08)',
            border: '1px solid rgba(139,21,56,0.12)',
            padding: 24,
            display: 'grid',
            gap: 14,
          }}
        >
          <div
            style={{
              height: 28,
              width: '46%',
              borderRadius: 12,
              background: 'rgba(139,21,56,0.18)',
            }}
          />
          <div
            style={{
              height: 18,
              width: '34%',
              borderRadius: 10,
              background: 'rgba(139,21,56,0.12)',
            }}
          />
        </div>
      </section>
    </div>
  );
}