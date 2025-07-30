import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Cruiser Aviation';
    const subtitle = searchParams.get('subtitle') || 'Flight Management System';
    const type = searchParams.get('type') || 'dashboard';
    const user = searchParams.get('user') || '';
    const stats = searchParams.get('stats') || '';

    const getLayout = () => {
      switch (type) {
        case 'dashboard':
          return (
            <div
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#ffffff',
                backgroundImage: 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.02) 100%)',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '40px',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: '#000000',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
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
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000' }}>
                      Cruiser
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      Aviation Dashboard
                    </div>
                  </div>
                </div>
                {user && (
                  <div
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#000000',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {user}
                  </div>
                )}
              </div>

              {/* Main Content */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '40px',
                  textAlign: 'center',
                }}
              >
                <h1
                  style={{
                    fontSize: '72px',
                    fontWeight: 'bold',
                    color: '#000000',
                    margin: '0 0 24px 0',
                    lineHeight: '1.1',
                  }}
                >
                  {title}
                </h1>
                <p
                  style={{
                    fontSize: '28px',
                    color: '#6b7280',
                    margin: '0 0 40px 0',
                    maxWidth: '800px',
                    lineHeight: '1.4',
                  }}
                >
                  {subtitle}
                </p>
                {stats && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '32px',
                      marginTop: '40px',
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
                            padding: '24px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '16px',
                            border: '1px solid #e5e7eb',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '36px',
                              fontWeight: 'bold',
                              color: '#000000',
                              marginBottom: '8px',
                            }}
                          >
                            {value}
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
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
              </div>
            </div>
          );

        case 'flight-log':
          return (
            <div
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                backgroundColor: '#ffffff',
                backgroundImage: 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.02) 100%)',
              }}
            >
              {/* Left Panel */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '60px',
                  borderRight: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    fontSize: '18px',
                    color: '#000000',
                    fontWeight: 'bold',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}
                >
                  Flight Log
                </div>
                <h1
                  style={{
                    fontSize: '56px',
                    fontWeight: 'bold',
                    color: '#000000',
                    margin: '0 0 24px 0',
                    lineHeight: '1.1',
                  }}
                >
                  {title}
                </h1>
                <p
                  style={{
                    fontSize: '24px',
                    color: '#6b7280',
                    margin: '0',
                    lineHeight: '1.4',
                  }}
                >
                  {subtitle}
                </p>
              </div>

              {/* Right Panel */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '60px',
                }}
              >
                <div
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '12px',
                    backgroundColor: '#000000',
                    border: '3px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="80"
                    height="80"
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
              </div>
            </div>
          );

        default:
          return (
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
                textAlign: 'center',
                padding: '40px',
              }}
            >
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
              <p
                style={{
                  fontSize: '32px',
                  color: '#6b7280',
                  margin: '0',
                  lineHeight: '1.3',
                }}
              >
                {subtitle}
              </p>
            </div>
          );
      }
    };

    return new ImageResponse(getLayout(), {
      width: 1200,
      height: 630,
    });
  } catch (e) {
    console.log(`${e instanceof Error ? e.message : 'Unknown error'}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
} 