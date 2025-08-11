# WebSocket Server Setup for Community Board

## Overview
The Community Board now includes real-time updates via WebSocket connections. This guide explains how to set up and run the WebSocket server.

## Prerequisites
- Node.js 18+ installed
- Dependencies installed (`npm install`)

## Dependencies Added
```json
{
  "ws": "^8.18.0",
  "concurrently": "^8.2.2"
}
```

## Environment Variables
Add these to your `.env.local` file:

```bash
# WebSocket Configuration
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:3003
WS_PORT=3003

# App URL for email links
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Running the WebSocket Server

### Option 1: Run Both Servers Together
```bash
npm run dev:ws
```
This runs both the Next.js app and WebSocket server concurrently.

### Option 2: Run WebSocket Server Separately
```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: WebSocket server
npm run ws
```

## WebSocket Server Features

### Connection Management
- Token-based authentication
- Automatic reconnection handling
- Heartbeat monitoring (ping/pong)
- Graceful shutdown

### Health Monitoring
- Health check: `http://localhost:3002/health`
- Statistics: `http://localhost:3002/stats`
- Connection count monitoring

### Message Broadcasting
- Broadcast to all connected clients
- Send to specific users by token
- Real-time post updates
- Response notifications

## Integration with Community Board

### Frontend WebSocket Service
- Automatic connection management
- Event subscription system
- Toast notifications for real-time events
- Connection status indicator

### API Integration
- Posts API sends WebSocket notifications
- Responses API triggers email notifications
- Real-time feed updates

## Production Deployment

### WebSocket Server
1. Deploy `websocket-server.js` to your server
2. Set environment variables
3. Use PM2 or similar process manager
4. Configure reverse proxy (nginx) for WebSocket upgrade

### Environment Variables
```bash
# Production
NEXT_PUBLIC_WEBSOCKET_URL=wss://app.cruiseraviation.com
WS_PORT=3003
NEXT_PUBLIC_APP_URL=https://app.cruiseraviation.com
```

### Nginx Configuration
```nginx
# WebSocket upgrade
location /ws {
    proxy_pass http://localhost:3003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Testing

### 1. Start Both Servers
```bash
npm run dev:ws
```

### 2. Open Community Board
- Navigate to `/community-board`
- Check connection status indicator
- Should show "Live" with green WiFi icon

### 3. Test Real-time Updates
- Create a new post
- Check browser console for WebSocket notifications
- Verify post appears in real-time

### 4. Test WebSocket Server
```bash
# Health check
curl http://localhost:3003/health

# Statistics
curl http://localhost:3003/stats
```

## Troubleshooting

### Connection Issues
1. Check WebSocket server is running
2. Verify environment variables
3. Check browser console for errors
4. Verify token authentication

### Performance Issues
1. Monitor connection count
2. Check memory usage
3. Review WebSocket server logs
4. Optimize message frequency

## Security Considerations

### Authentication
- All WebSocket connections require valid JWT token
- Tokens are validated on connection
- Unauthorized connections are immediately closed

### Rate Limiting
- Consider implementing rate limiting for WebSocket messages
- Monitor for spam or abuse
- Implement connection limits per user

### Data Validation
- Validate all incoming WebSocket messages
- Sanitize data before broadcasting
- Log suspicious activity

## Future Enhancements

### Planned Features
- Message encryption
- User presence indicators
- Typing indicators
- Read receipts
- Push notifications

### Scalability
- Redis pub/sub for multiple server instances
- Load balancing for WebSocket connections
- Message queuing for offline users
