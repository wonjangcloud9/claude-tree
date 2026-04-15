import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'monospace',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              background: '#1e293b',
              border: '3px solid #22d3ee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '36px',
              fontWeight: 'bold',
              color: '#22d3ee',
            }}
          >
            ct
          </div>
          <div
            style={{
              fontSize: '52px',
              fontWeight: 'bold',
              color: '#f8fafc',
              letterSpacing: '-1px',
            }}
          >
            claudetree
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '24px',
            color: '#94a3b8',
            marginBottom: '40px',
            textAlign: 'center',
            maxWidth: '800px',
          }}
        >
          Issue-to-PR Automation: Parallel Claude Code Sessions
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
          }}
        >
          {['Parallel Sessions', 'Cost Tracking', 'Conflict Detection', 'Auto Review'].map(
            (feat) => (
              <div
                key={feat}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  background: 'rgba(34, 211, 238, 0.1)',
                  border: '1px solid rgba(34, 211, 238, 0.3)',
                  color: '#22d3ee',
                  fontSize: '16px',
                }}
              >
                {feat}
              </div>
            ),
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            gap: '24px',
            color: '#64748b',
            fontSize: '16px',
          }}
        >
          <span>github.com/wonjangcloud9/claude-tree</span>
          <span>npm install -g @claudetree/cli</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
