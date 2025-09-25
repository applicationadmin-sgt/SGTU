// Debug current user JWT token
console.log('🔍 Current JWT Token Analysis');

const token = localStorage.getItem('token');
if (token) {
  try {
    const parseJwt = (token) => {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    };

    const decoded = parseJwt(token);
    console.log('📋 Decoded JWT Payload:');
    console.log('User ID:', decoded._id);
    console.log('Email:', decoded.email);
    console.log('Name:', decoded.name);
    console.log('Legacy Role:', decoded.role);
    console.log('Primary Role:', decoded.primaryRole);
    console.log('Roles Array:', decoded.roles);
    console.log('School:', decoded.school);
    console.log('Department:', decoded.department);
    console.log('Departments:', decoded.departments);
    console.log('Token Expiry:', new Date(decoded.exp * 1000));
    
    // Check if token has multiple roles
    const roleCount = decoded.roles ? decoded.roles.length : (decoded.role ? 1 : 0);
    console.log(`\n🎯 Role Analysis:`);
    console.log(`Total Roles: ${roleCount}`);
    console.log(`Is Multi-Role: ${roleCount > 1}`);
    console.log(`Should Show Role Switcher: ${roleCount > 1}`);
    
  } catch (error) {
    console.error('❌ Error parsing token:', error);
  }
} else {
  console.log('❌ No token found in localStorage');
}

// Run this in browser console to see current token content