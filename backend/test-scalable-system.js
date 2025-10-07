/**
 * Test Scalable Live Class System
 * Validates that all scalable services are properly integrated
 */

const axios = require('axios');
const io = require('socket.io-client');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_CONFIG = {
  testUsers: 10, // Number of test users to simulate
  classTitle: 'Scalable System Test Class',
  duration: 30000, // Test duration in milliseconds
};

class ScalableSystemTester {
  constructor() {
    this.results = {
      healthCheck: false,
      serviceAvailability: {},
      classCreation: false,
      scalableJoin: false,
      webrtcTransport: false,
      socketConnection: false,
      loadTest: false,
      errors: [],
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testHealthCheck() {
    this.log('Testing system health check...');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      
      if (response.data.status === 'healthy') {
        this.results.healthCheck = true;
        this.results.serviceAvailability = response.data.services;
        this.log('Health check passed', 'success');
        this.log(`Available services: ${JSON.stringify(response.data.services)}`);
      } else {
        this.results.errors.push('Health check failed: ' + response.data.message);
        this.log('Health check failed', 'error');
      }
    } catch (error) {
      this.results.errors.push('Health check error: ' + error.message);
      this.log(`Health check error: ${error.message}`, 'error');
    }
  }

  async testServiceMetrics() {
    this.log('Testing system metrics...');
    try {
      const response = await axios.get(`${BASE_URL}/metrics`);
      this.log('Metrics retrieved successfully', 'success');
      this.log(`Active classes: ${response.data.activeClasses || 0}`);
      this.log(`Memory usage: ${response.data.memoryUsage || 'Unknown'}`);
      return true;
    } catch (error) {
      this.results.errors.push('Metrics error: ' + error.message);
      this.log(`Metrics error: ${error.message}`, 'error');
      return false;
    }
  }

  async createTestUser() {
    this.log('Creating test user...');
    try {
      const userData = {
        name: 'Test Teacher',
        email: `test-teacher-${Date.now()}@test.com`,
        password: 'testpassword123',
        role: 'teacher',
      };

      const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
      
      if (response.data.success) {
        this.log('Test user created successfully', 'success');
        return response.data;
      } else {
        throw new Error(response.data.message || 'User creation failed');
      }
    } catch (error) {
      // If user already exists, try to login
      try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: `test-teacher-${Date.now()}@test.com`,
          password: 'testpassword123',
        });
        
        if (loginResponse.data.success) {
          this.log('Using existing test user', 'success');
          return loginResponse.data;
        }
      } catch (loginError) {
        this.results.errors.push('User creation/login error: ' + error.message);
        this.log(`User creation error: ${error.message}`, 'error');
        return null;
      }
    }
  }

  async testScalableJoin(token, classId) {
    this.log('Testing scalable class join...');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/live-classes/scalable/${classId}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        this.results.scalableJoin = true;
        this.log('Scalable join successful', 'success');
        this.log(`Scalability mode: ${response.data.data.scalabilityMode}`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Scalable join failed');
      }
    } catch (error) {
      this.results.errors.push('Scalable join error: ' + error.message);
      this.log(`Scalable join error: ${error.message}`, 'error');
      return null;
    }
  }

  async testWebRTCTransport(token, classId) {
    this.log('Testing WebRTC transport creation...');
    try {
      const response = await axios.post(
        `${BASE_URL}/api/live-classes/scalable/${classId}/createTransport`,
        { direction: 'send' },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        this.results.webrtcTransport = true;
        this.log('WebRTC transport created successfully', 'success');
        this.log(`Transport ID: ${response.data.transport.id}`);
        return response.data.transport;
      } else {
        throw new Error(response.data.message || 'Transport creation failed');
      }
    } catch (error) {
      this.results.errors.push('WebRTC transport error: ' + error.message);
      this.log(`WebRTC transport error: ${error.message}`, 'error');
      return null;
    }
  }

  async testSocketConnection(token, classId) {
    this.log('Testing Socket.IO connection...');
    
    return new Promise((resolve) => {
      const socket = io(BASE_URL, {
        auth: {
          token: token,
        },
        transports: ['websocket'],
      });

      socket.on('connect', () => {
        this.results.socketConnection = true;
        this.log('Socket.IO connection successful', 'success');
        
        // Join class room
        socket.emit('joinClass', { classId, role: 'teacher' });
        
        // Test real-time messaging
        socket.emit('classMessage', {
          classId,
          message: 'Test message from scalable system test',
          timestamp: Date.now(),
        });
        
        socket.disconnect();
        resolve(true);
      });

      socket.on('connect_error', (error) => {
        this.results.errors.push('Socket connection error: ' + error.message);
        this.log(`Socket connection error: ${error.message}`, 'error');
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        socket.disconnect();
        resolve(false);
      }, 5000);
    });
  }

  async simulateLoad(token, classId, userCount = 10) {
    this.log(`Testing load with ${userCount} simulated users...`);
    
    const connections = [];
    let successfulConnections = 0;

    for (let i = 0; i < userCount; i++) {
      try {
        const socket = io(BASE_URL, {
          auth: {
            token: token,
          },
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          successfulConnections++;
          socket.emit('joinClass', { classId, role: 'student' });
        });

        connections.push(socket);
        
        // Small delay between connections
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        this.results.errors.push(`Load test error (user ${i}): ${error.message}`);
      }
    }

    // Wait for all connections to establish
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Disconnect all
    connections.forEach(socket => socket.disconnect());

    const successRate = (successfulConnections / userCount) * 100;
    this.results.loadTest = successRate >= 80; // 80% success rate required

    if (this.results.loadTest) {
      this.log(`Load test passed: ${successfulConnections}/${userCount} connections (${successRate.toFixed(1)}%)`, 'success');
    } else {
      this.log(`Load test failed: ${successfulConnections}/${userCount} connections (${successRate.toFixed(1)}%)`, 'error');
    }

    return successRate;
  }

  async runFullTest() {
    this.log('🚀 Starting Scalable System Test Suite...');
    console.log('='.repeat(60));

    // 1. Health Check
    await this.testHealthCheck();
    await this.testServiceMetrics();

    // 2. Authentication Test
    const userAuth = await this.createTestUser();
    if (!userAuth || !userAuth.token) {
      this.log('Cannot proceed without authentication', 'error');
      return this.generateReport();
    }

    // 3. Class Creation (using existing endpoint)
    this.log('Creating test class...');
    try {
      const classData = {
        title: TEST_CONFIG.classTitle,
        description: 'Test class for scalable system validation',
        scheduledAt: new Date(Date.now() + 60000), // 1 minute from now
        sections: [], // Empty sections for test
      };

      const classResponse = await axios.post(
        `${BASE_URL}/api/live-classes/schedule`,
        classData,
        {
          headers: {
            Authorization: `Bearer ${userAuth.token}`,
          },
        }
      );

      if (classResponse.data.success) {
        this.results.classCreation = true;
        this.log('Test class created successfully', 'success');
        
        const classId = classResponse.data.data._id;

        // Start the class
        await axios.patch(
          `${BASE_URL}/api/live-classes/${classId}/start`,
          {},
          {
            headers: {
              Authorization: `Bearer ${userAuth.token}`,
            },
          }
        );

        // 4. Test Scalable Features
        await this.testScalableJoin(userAuth.token, classId);
        await this.testWebRTCTransport(userAuth.token, classId);
        await this.testSocketConnection(userAuth.token, classId);
        await this.simulateLoad(userAuth.token, classId, TEST_CONFIG.testUsers);

        // Clean up - end the class
        await axios.patch(
          `${BASE_URL}/api/live-classes/${classId}/end`,
          {},
          {
            headers: {
              Authorization: `Bearer ${userAuth.token}`,
            },
          }
        );

      } else {
        throw new Error(classResponse.data.message || 'Class creation failed');
      }
    } catch (error) {
      this.results.errors.push('Class creation error: ' + error.message);
      this.log(`Class creation error: ${error.message}`, 'error');
    }

    return this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    this.log('📊 SCALABLE SYSTEM TEST REPORT');
    console.log('='.repeat(60));

    const tests = [
      { name: 'System Health Check', passed: this.results.healthCheck },
      { name: 'Service Availability', passed: Object.keys(this.results.serviceAvailability).length > 0 },
      { name: 'Class Creation', passed: this.results.classCreation },
      { name: 'Scalable Join', passed: this.results.scalableJoin },
      { name: 'WebRTC Transport', passed: this.results.webrtcTransport },
      { name: 'Socket.IO Connection', passed: this.results.socketConnection },
      { name: 'Load Test', passed: this.results.loadTest },
    ];

    let passedTests = 0;
    tests.forEach(test => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${test.name.padEnd(30)} ${status}`);
      if (test.passed) passedTests++;
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`Overall Score: ${passedTests}/${tests.length} (${((passedTests/tests.length)*100).toFixed(1)}%)`);
    
    if (this.results.serviceAvailability.mediasoup && this.results.serviceAvailability.redis) {
      console.log('🚀 SCALABLE SERVICES: ACTIVE');
    } else {
      console.log('⚠️  SCALABLE SERVICES: LIMITED (Basic mode active)');
    }

    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (passedTests === tests.length) {
      console.log('\n🎉 ALL TESTS PASSED! Your scalable system is ready for production.');
    } else if (passedTests >= tests.length * 0.8) {
      console.log('\n⚠️  MOST TESTS PASSED. Check errors and retry failed tests.');
    } else {
      console.log('\n❌ MULTIPLE TEST FAILURES. Please review configuration and dependencies.');
    }

    console.log('='.repeat(60));
    return this.results;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new ScalableSystemTester();
  
  tester.runFullTest()
    .then((results) => {
      process.exit(results.healthCheck && results.scalableJoin ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = ScalableSystemTester;