import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL, // Use the base URL from environment variables
});

// Function to clear token and redirect
const handleLogout = () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    // Redirect to login page. Using window.location.href for simplicity outside React Router context if needed,
    // but ideally, you'd use useHistory or useNavigate hook if this logic is placed within a component
    // or pass the history object to this module. For a global interceptor, window.location is often practical.
    window.location.href = '/authentication/sign-in';
};

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response) {
      // Check if it's a 401 Unauthorized error
      if (error.response.status === 401) {
        // Check specific messages that indicate token issues requiring logout
        const message = error.response.data?.message?.toLowerCase() || '';
        if (message.includes('token expired') || message.includes('invalid token') || message.includes('no token provided')) {
          console.warn('Authentication error detected. Logging out.', error.response.data);
          handleLogout();
          // Return a rejected promise to prevent further processing in the original catch block
          // Optionally, you could return a specific error object or message
          return Promise.reject(new Error('Session expired. Please log in again.'));
        }
      }
    }
    // For other errors, just reject the promise so they can be handled locally
    return Promise.reject(error);
  }
);

export default axiosInstance;
