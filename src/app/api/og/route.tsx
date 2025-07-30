import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Cruiser Aviation';
    const subtitle = searchParams.get('subtitle') || 'Flight Management System';
    const type = searchParams.get('type') || 'default';
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
            backgroundColor: '#ffffff',
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 0, 0, 0.02) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(0, 0, 0, 0.02) 0%, transparent 50%)',
          }}
        >
          {/* Background Pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px',
              maxWidth: '1000px',
            }}
          >
            {/* Logo/Icon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '120px',
                height: '120px',
                borderRadius: '12px',
                backgroundColor: '#000000',
                border: '2px solid #e5e7eb',
                marginBottom: '40px',
              }}
            >
              <svg
                width="60"
                height="60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: '#ffffff' }}
              >
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4c-1.5 0-2 1-2.5 2L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 2.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
              </svg>
            </div>

            {/* Title */}
            <h1
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: '#000000',
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
                color: '#6b7280',
                margin: '0 0 40px 0',
                fontWeight: '400',
                lineHeight: '1.3',
              }}
            >
              {subtitle}
            </p>

            {/* Type Badge */}
            {type !== 'default' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  color: '#000000',
                  fontSize: '20px',
                  fontWeight: '500',
                  textTransform: 'capitalize',
                }}
              >
                {type}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  marginTop: '40px',
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
                        padding: '16px 20px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '12px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                          color: '#000000',
                          marginBottom: '4px',
                        }}
                      >
                        {value}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          color: '#6b7280',
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
                color: '#9ca3af',
              }}
            >
              <span>cruiserapp.com</span>
              <span>Flight Management System</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
} 