const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  const { query } = url.parse(request.url, true);
  const token = query.token;
  
  if (!token) {
    ws.close(1008, 'Token required');
    return;
  }

  // Store client connection
  const clientId = generateClientId();
  clients.set(clientId, { ws, token, connectedAt: new Date() });
  
  console.log(`Client connected: ${clientId}`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    data: { clientId, message: 'Connected to Community Board WebSocket' }
  }));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', data: { timestamp: new Date().toISOString() } }));
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', (code, reason) => {
    clients.delete(clientId);
    console.log(`Client disconnected: ${clientId} (${code}: ${reason})`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(clientId);
  });
});

// Broadcast message to all connected clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;
  
  clients.forEach((client, clientId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error);
        clients.delete(clientId);
      }
    }
  });
  
  console.log(`Broadcasted message to ${sentCount} clients`);
  return sentCount;
}

// Broadcast to specific client by token
function broadcastToUser(token, message) {
  let sentCount = 0;
  
  clients.forEach((client, clientId) => {
    if (client.token === token && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        sentCount++;
      } catch (error) {
        console.error(`Error sending to client ${clientId}:`, error);
        clients.delete(clientId);
      }
    }
  });
  
  return sentCount;
}

// Generate unique client ID
function generateClientId() {
  return Math.random().toString(36).substr(2, 9);
}

// Health check endpoint
server.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      connectedClients: clients.size,
      uptime: process.uptime()
    }));
  } else if (req.url === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connectedClients: clients.size,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Start server
const PORT = process.env.WS_PORT || 3003;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Stats: http://localhost:${PORT}/stats`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  wss.close(() => {
    server.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  wss.close(() => {
    server.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  });
});

// Export functions for external use
module.exports = {
  broadcast,
  broadcastToUser,
  getConnectedClients: () => clients.size
};
