import axios from 'axios';

const isDevelopment = process.env.NODE_ENV === 'development';
const API_BASE_URL = isDevelopment ? 'https://192.168.7.20:5000/api' : `${process.env.REACT_APP_API_URL || 'https://192.168.7.20:5000'}/api`;

class EnhancedLiveClassAPI {
  constructor() {
    console.log('🔧 Enhanced API Base URL:', API_BASE_URL);
    console.log('🔧 Environment REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('🔧 Environment NODE_ENV:', process.env.NODE_ENV);
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000
    });
    
    // Add token interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          window.location.href = '/login';
        }
        throw error;
      }
    );
  }
  
  // Enhanced Live Class Operations
  
  /**
   * Create a new live class with multi-section support
   */
  async createLiveClass(classData, token) {
    try {
      const response = await this.client.post('/live-classes', classData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error creating live class:', error);
      throw error;
    }
  }
  
  /**
   * Schedule a merged class with multiple sections
   */
  async scheduleMergedClass(mergedClassData, token) {
    try {
      const response = await this.client.post('/live-classes/merged', mergedClassData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error scheduling merged class:', error);
      throw error;
    }
  }
  
  /**
   * Enhanced join by token with multi-role support
   */
  async joinByToken(data, token) {
    try {
      // Use public endpoint if no token (guest access)
      const endpoint = token ? '/live-classes/join-by-token' : '/live-classes/public/join-by-token';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await this.client.post(endpoint, data, { headers });
      return response;
    } catch (error) {
      console.error('Error joining class by enhanced token:', error);
      throw error;
    }
  }
  
  /**
   * Legacy join by token (for backward compatibility)
   */
  async joinClassByToken(accessToken, token, password = null) {
    try {
      const data = { accessToken };
      if (password) {
        data.password = password;
      }
      
      const response = await this.client.post('/live-classes/join-by-token', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error joining class by token:', error);
      throw error;
    }
  }
  
  /**
   * Join class by ID (legacy support)
   */
  async joinClass(classId, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/join`, 
        {}, 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response;
    } catch (error) {
      console.error('Error joining class:', error);
      throw error;
    }
  }
  
  /**
   * Get class details by ID (legacy support)
   */
  async getClassDetails(classId, token) {
    try {
      const response = await this.client.get(`/live-classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error getting class details:', error);
      throw error;
    }
  }
  
  /**
   * Update class settings
   */
  async updateClassSettings(classId, settingsData, token) {
    try {
      const response = await this.client.patch(`/live-classes/${classId}/settings`, settingsData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error updating class settings:', error);
      throw error;
    }
  }
  
  /**
   * Get waiting room participants
   */
  async getWaitingRoomParticipants(classId, token) {
    try {
      const response = await this.client.get(`/live-classes/${classId}/waiting-room`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error getting waiting room participants:', error);
      throw error;
    }
  }
  
  /**
   * Handle waiting room requests
   */
  async handleWaitingRoomRequest(classId, requestData, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/waiting-room/handle`, requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error handling waiting room request:', error);
      throw error;
    }
  }
  
  /**
   * Start class recording
   */
  async startRecording(classId, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/recording/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }
  
  /**
   * Stop class recording
   */
  async stopRecording(classId, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/recording/stop`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }
  
  /**
   * Get class recordings
   */
  async getClassRecordings(classId, token) {
    try {
      const response = await this.client.get(`/live-classes/${classId}/recordings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error getting class recordings:', error);
      throw error;
    }
  }
  
  /**
   * Get class analytics
   */
  async getClassAnalytics(classId, token) {
    try {
      const response = await this.client.get(`/live-classes/${classId}/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error getting class analytics:', error);
      throw error;
    }
  }
  
  /**
   * End live class
   */
  async endLiveClass(classId, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error ending live class:', error);
      throw error;
    }
  }
  
  /**
   * Get teacher's live classes
   */
  async getTeacherLiveClasses(token, params = {}) {
    try {
      console.log('🚀 Enhanced API: Getting teacher live classes with baseURL:', this.client.defaults.baseURL);
      // Temporarily use full URL to bypass base URL issue
      const response = await axios.get('https://192.168.7.20:5000/api/live-classes/teacher/classes', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      console.log('✅ Enhanced API: Teacher classes response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Enhanced API: Error getting teacher live classes:', error);
      console.error('❌ Enhanced API: Error response:', error.response?.data);
      console.error('❌ Enhanced API: Error status:', error.response?.status);
      throw error;
    }
  }
  
  /**
   * Get student's live classes
   */
  async getStudentLiveClasses(token, params = {}) {
    try {
      const response = await this.client.get('/live-classes/student/classes', {
        params
      });
      return response;
    } catch (error) {
      console.error('Error getting student live classes:', error);
      throw error;
    }
  }
  
  /**
   * Update participant permissions
   */
  async updateParticipantPermissions(classId, participantData, token) {
    try {
      const response = await this.client.patch(`/live-classes/${classId}/participants`, participantData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error updating participant permissions:', error);
      throw error;
    }
  }
  
  /**
   * Remove participant from class
   */
  async removeParticipant(classId, userId, token) {
    try {
      const response = await this.client.delete(`/live-classes/${classId}/participants/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error removing participant:', error);
      throw error;
    }
  }
  
  /**
   * Send class announcement
   */
  async sendAnnouncement(classId, announcement, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/announcements`, announcement, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error sending announcement:', error);
      throw error;
    }
  }
  
  /**
   * Upload class material
   */
  async uploadClassMaterial(classId, formData, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/materials`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    } catch (error) {
      console.error('Error uploading class material:', error);
      throw error;
    }
  }
  
  /**
   * Get class materials
   */
  async getClassMaterials(classId, token) {
    try {
      const response = await this.client.get(`/live-classes/${classId}/materials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error getting class materials:', error);
      throw error;
    }
  }
  
  /**
   * Save whiteboard as note
   */
  async saveWhiteboardNote(classId, noteData, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/whiteboard-notes`, noteData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error saving whiteboard note:', error);
      throw error;
    }
  }
  
  /**
   * Get whiteboard notes
   */
  async getWhiteboardNotes(classId, token) {
    try {
      const response = await this.client.get(`/live-classes/${classId}/whiteboard-notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error getting whiteboard notes:', error);
      throw error;
    }
  }
  
  /**
   * Save whiteboard state (legacy)
   */
  async saveWhiteboardState(classId, whiteboardData, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/whiteboard`, whiteboardData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error saving whiteboard state:', error);
      throw error;
    }
  }
  
  /**
   * Get whiteboard state
   */
  async getWhiteboardState(classId, token) {
    try {
      const response = await this.client.get(`/live-classes/${classId}/whiteboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error getting whiteboard state:', error);
      throw error;
    }
  }
  
  /**
   * Generate class report
   */
  async generateClassReport(classId, token) {
    try {
      const response = await this.client.post(`/live-classes/${classId}/report`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error generating class report:', error);
      throw error;
    }
  }
  
  /**
   * Update class password
   */
  async updateClassPassword(classId, passwordData, token) {
    try {
      const response = await this.client.patch(`/live-classes/${classId}/password`, passwordData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error updating class password:', error);
      throw error;
    }
  }
  
  /**
   * Get available sections for teacher
   */
  async getAvailableSections(token) {
    try {
      console.log('🚀 Enhanced API: Getting available sections with baseURL:', this.client.defaults.baseURL);
      // Temporarily use full URL to bypass base URL issue
      const response = await axios.get('https://192.168.7.20:5000/api/live-classes/teacher/sections-courses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Enhanced API: Sections response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Enhanced API: Error getting available sections:', error);
      console.error('❌ Enhanced API: Error response:', error.response?.data);
      console.error('❌ Enhanced API: Error status:', error.response?.status);
      throw error;
    }
  }
  
  /**
   * Get class attendance report
   */
  async getAttendanceReport(classId, token) {
    try {
      const response = await this.client.get(`/live-classes/${classId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response;
    } catch (error) {
      console.error('Error getting attendance report:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const enhancedLiveClassAPI = new EnhancedLiveClassAPI();
export default enhancedLiveClassAPI;