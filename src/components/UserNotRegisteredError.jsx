
const SHADOW = '0px 50px 40px rgba(0,0,0,0.02), 0px 50px 40px rgba(0,0,0,0.04), 0px 20px 40px rgba(0,0,0,0.08), 0px 3px 10px rgba(0,0,0,0.12)';

const UserNotRegisteredError = () => {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 24,
      background: '#ffffff',
    }}>
      <div style={{ background: '#F4F4F5', borderRadius: 20, maxWidth: 440, width: '100%', boxShadow: SHADOW, overflow: 'hidden' }}>
        {/* Header strip */}
        <div style={{ padding: '6px 14px 5px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9B9A98', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Access
          </span>
        </div>

        {/* White inner card */}
        <div style={{ background: '#ffffff', margin: '0 5px 5px', borderRadius: 14, padding: '28px 28px 24px' }}>
          {/* Icon */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 20px',
            background: 'rgba(232,114,110,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8726E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1A1918', margin: '0 0 10px', textAlign: 'center', fontFamily: "'Cormorant Garamond', Georgia, serif", letterSpacing: '-0.01em' }}>
            Access Restricted
          </h1>
          <p style={{ fontSize: 13, color: '#787776', margin: '0 0 20px', textAlign: 'center', lineHeight: 1.6 }}>
            You are not registered to use this application. Please contact the app administrator to request access.
          </p>

          {/* Info box */}
          <div style={{ background: '#F4F4F5', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, color: '#5C5B5A', margin: '0 0 8px', fontWeight: 500 }}>If you believe this is an error, you can:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Verify you are logged in with the correct account',
                'Contact the app administrator for access',
                'Try logging out and back in again',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#C4C3C1', flexShrink: 0, marginTop: 6 }} />
                  <span style={{ fontSize: 12, color: '#787776', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
