# Coastal Guard - Frontend-Backend Connection Setup

## Overview
This guide explains how to connect your Flutter frontend with the Node.js backend.

## Backend Setup

### 1. Start the Backend Server
```bash
cd backend
npm install
npm start
```

The server will start on port 3000 and listen on all network interfaces (0.0.0.0).

### 2. Verify Backend is Running
- Local access: http://localhost:3000/api/health
- Network access: http://YOUR_IP:3000/api/health

## Frontend Setup

### 1. Update IP Address
The Flutter app is configured to connect to your local network IP. If your IP changes:

1. Find your current IP:
   ```bash
   # Windows
   ipconfig | findstr "IPv4"
   
   # macOS/Linux
   ifconfig | grep "inet "
   ```

2. Update `frontend/lib/services/auth_service.dart`:
   ```dart
   static const String baseUrl = 'http://YOUR_IP:3000';
   ```

### 2. Test Connection
- Use the "Test Server Connection" button on the login page
- Check the console logs for connection status
- The app automatically tests connection on startup

## Network Requirements

### 1. Same Network
- Both devices (computer running backend + mobile device) must be on the same WiFi network
- No firewall blocking port 3000

### 2. Port Access
- Port 3000 must be accessible from your mobile device
- Windows Firewall may need to allow Node.js through

## Troubleshooting

### Connection Refused
1. Check if backend is running: `npm start`
2. Verify IP address is correct
3. Check Windows Firewall settings
4. Ensure both devices are on same network

### Timeout Errors
1. Check network stability
2. Verify no antivirus blocking connections
3. Try restarting both devices

### SSL/TLS Errors
- The app uses HTTP (not HTTPS) for local development
- Ensure you're not trying to connect to HTTPS endpoints

## Development vs Production

### Development (Current Setup)
- HTTP on local network
- No SSL certificates required
- IP-based addressing

### Production
- HTTPS with proper SSL certificates
- Domain-based addressing
- Environment variables for configuration

## Quick Test Commands

```bash
# Test localhost
curl http://localhost:3000/api/health

# Test network IP (replace with your IP)
curl http://YOUR_IP:3000/api/health

# Check if port is listening
netstat -an | findstr :3000
```

## Support
If you continue having issues:
1. Check the console logs in both Flutter and Node.js
2. Verify network configuration
3. Test with a simple HTTP client (Postman, curl)
4. Ensure no VPN or proxy interference
