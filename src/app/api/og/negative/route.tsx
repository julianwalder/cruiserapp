import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Cruiser Aviation';
    const subtitle = searchParams.get('subtitle') || 'Flight Management System';
    const stats = searchParams.get('stats') || '';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            padding: '40px',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              marginBottom: '40px',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: '#000000' }}
            >
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4c-1.5 0-2 1-2.5 2L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 2.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
            </svg>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#ffffff',
              margin: '0 0 16px 0',
              lineHeight: '1.1',
            }}
          >
            {title}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '32px',
              color: '#9ca3af',
              margin: '0 0 40px 0',
              lineHeight: '1.3',
            }}
          >
            {subtitle}
          </p>

          {/* Stats */}
          {stats && (
            <div
              style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '40px',
                justifyContent: 'center',
              }}
            >
              {stats.split(',').map((stat, index) => {
                const parts = stat.split(':');
                const label = parts[0] || 'Unknown';
                const value = parts[1] || 'N/A';
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      textAlign: 'center',
                      padding: '12px 16px',
                      backgroundColor: '#1f2937',
                      borderRadius: '8px',
                      border: '1px solid #374151',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#ffffff',
                        marginBottom: '4px',
                      }}
                    >
                      {value}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                      }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '40px',
              right: '40px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '18px',
              color: '#6b7280',
            }}
          >
            <span>cruiserapp.com</span>
            <span>Flight Management System</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.log(`${e instanceof Error ? e.message : 'Unknown error'}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
} 