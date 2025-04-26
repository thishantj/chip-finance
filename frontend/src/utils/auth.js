/**
 * Retrieves the authentication token from localStorage or sessionStorage.
 * @returns {string|null} The token if found, otherwise null.
 */
export const getToken = () => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

// You can add other auth-related utility functions here later, like logout logic.
// export const logout = () => {
//   localStorage.removeItem('authToken');
//   sessionStorage.removeItem('authToken');
//   // Optionally redirect using window.location or history object if passed
// };
