interface HeaderProps {
  connected: boolean;
  sessionCount: number;
}

export function Header({ connected, sessionCount }: HeaderProps) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '32px',
      paddingBottom: '16px',
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>
          claudetree
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {sessionCount} session{sessionCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: 'var(--text-secondary)',
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: connected ? 'var(--success)' : 'var(--error)',
        }} />
        {connected ? 'Connected' : 'Disconnected'}
      </div>
    </header>
  );
}
