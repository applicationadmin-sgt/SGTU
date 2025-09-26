import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// API utility for live classes
class LiveClassAPI {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/live-classes`;
  }

  // Get authorization headers
  getAuthHeaders(token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  }

  // Schedule a new live class (Teacher)
  async scheduleClass(classData, token) {
    try {
      const response = await axios.post(
        `${this.baseURL}/schedule`,
        classData,
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to schedule class');
    }
  }

  // Get teacher's live classes
  async getTeacherClasses(params = {}, token) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await axios.get(
        `${this.baseURL}/teacher/classes?${queryParams}`,
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get teacher classes');
    }
  }

  // Get student's live classes
  async getStudentClasses(params = {}, token) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await axios.get(
        `${this.baseURL}/student/classes?${queryParams}`,
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get student classes');
    }
  }

  // Get specific class details
  async getClassDetails(classId, token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/${classId}`,
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get class details');
    }
  }

  // Start a live class (Teacher)
  async startClass(classId, token) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/${classId}/start`,
        {},
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to start class');
    }
  }

  // End a live class (Teacher)
  async endClass(classId, token) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/${classId}/end`,
        {},
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to end class');
    }
  }

  // Join a live class (Student)
  async joinClass(classId, token) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${classId}/join`,
        {},
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to join class');
    }
  }

  // Leave a live class (Student)
  async leaveClass(classId, token) {
    try {
      const response = await axios.post(
        `${this.baseURL}/${classId}/leave`,
        {},
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to leave class');
    }
  }

  // Update class settings (Teacher)
  async updateClassSettings(classId, settings, token) {
    try {
      const response = await axios.patch(
        `${this.baseURL}/${classId}/settings`,
        settings,
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update class settings');
    }
  }

  // Get teacher's sections and courses for scheduling
  async getTeacherSectionsAndCourses(token) {
    try {
      const response = await axios.get(
        `${this.baseURL}/teacher/sections-courses`,
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get sections and courses');
    }
  }

  // Delete/cancel a live class (Teacher)
  async deleteClass(classId, token) {
    try {
      const response = await axios.delete(
        `${this.baseURL}/${classId}`,
        this.getAuthHeaders(token)
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete class');
    }
  }

  // Upload recording file
  async uploadRecording(classId, recordingBlob, token) {
    try {
      const formData = new FormData();
      formData.append('recording', recordingBlob, `live-class-${classId}-${Date.now()}.webm`);
      formData.append('classId', classId);

      const response = await axios.post(
        `${this.baseURL}/${classId}/upload-recording`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to upload recording');
    }
  }
}

// Create and export a singleton instance
const liveClassAPI = new LiveClassAPI();
export default liveClassAPI;

// Export individual methods for named imports
export const {
  scheduleClass,
  getTeacherClasses,
  getStudentClasses,
  getClassDetails,
  startClass,
  endClass,
  joinClass,
  leaveClass,
  updateClassSettings,
  getTeacherSectionsAndCourses,
  deleteClass,
  uploadRecording
} = liveClassAPI;