// Test frontend accessibility for HOD teacher management
// Run this in browser console while logged in as HOD

console.log('=== Frontend HOD Teacher Management Test ===');

// Check if we're logged in
const token = localStorage.getItem('token');
if (!token) {
  console.log('❌ No token found. Please login first.');
} else {
  console.log('✅ Token found:', token.substring(0, 20) + '...');
}

// Check current location
console.log('Current URL:', window.location.href);

// Test API calls that the HODTeachers page makes
async function testAPICalls() {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('\n1. Testing HOD dashboard...');
  try {
    const dashResponse = await fetch('/api/hod/dashboard', { headers });
    const dashData = await dashResponse.json();
    if (dashResponse.ok) {
      console.log('✅ Dashboard OK:', dashData.department?.name);
    } else {
      console.log('❌ Dashboard failed:', dashData.message);
    }
  } catch (e) {
    console.log('❌ Dashboard error:', e.message);
  }

  console.log('\n2. Testing HOD teachers...');
  try {
    const teachersResponse = await fetch('/api/hod/teachers', { headers });
    const teachersData = await teachersResponse.json();
    if (teachersResponse.ok) {
      console.log('✅ Teachers OK:', teachersData.length, 'teachers');
      teachersData.forEach(t => console.log('  -', t.name, '(' + t.email + ')'));
    } else {
      console.log('❌ Teachers failed:', teachersData.message);
    }
  } catch (e) {
    console.log('❌ Teachers error:', e.message);
  }

  console.log('\n3. Navigation test...');
  if (window.location.pathname === '/hod/teachers') {
    console.log('✅ Already on HOD teachers page');
  } else {
    console.log('Current path:', window.location.pathname);
    console.log('Navigate to /hod/teachers to test the page');
  }
}

if (token) {
  testAPICalls();
}

console.log('\n=== Instructions ===');
console.log('1. Make sure you are logged in as HOD (123@gmail.com)');
console.log('2. Navigate to: http://localhost:3000/hod/teachers');
console.log('3. Check browser console for any errors');
console.log('4. The page should show "Faculty Members (1)" with Sourav listed');