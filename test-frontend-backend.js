// Test script to verify frontend-backend connection
console.log('🧪 Testing Frontend-Backend Connection...\n');

// Test the backend directly
fetch('https://localhost:5000', {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
  }
})
.then(response => {
  console.log('✅ Direct backend connection successful!');
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(error => {
  console.error('❌ Direct backend connection failed:', error.message);
});

// Test through proxy (this would work in the browser)
console.log('\n📋 To test in browser console:');
console.log('1. Open Developer Tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Run: fetch("/api").then(r => r.json()).then(console.log)');
console.log('\n🌐 Your app should now work at: https://10.20.49.165:3000');