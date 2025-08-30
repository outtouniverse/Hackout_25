const os = require('os');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return '0.0.0.0';
}

const localIP = getLocalIPAddress();
console.log('🌐 Your laptop\'s local IP address is:', localIP);
console.log('📱 To connect your device, use this URL in your Flutter app:');
console.log(`   http://${localIP}:3000`);
console.log('');
console.log('🔧 Make sure:');
console.log('   1. Your device and laptop are on the same WiFi network');
console.log('   2. Your laptop\'s firewall allows connections on port 3000');
console.log('   3. Update your Flutter app\'s AuthService.baseUrl to use this IP');
console.log('');
console.log('📝 Example:');
console.log(`   static const String baseUrl = 'http://${localIP}:3000';`);
