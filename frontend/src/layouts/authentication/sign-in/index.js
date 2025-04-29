import { useState } from "react";
import axios from "axios"; // Import axios
import { useHistory } from "react-router-dom"; // Import useHistory

// react-router-dom components
import { Link } from "react-router-dom";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";
import VuiButton from "components/VuiButton";
import VuiSwitch from "components/VuiSwitch";
import GradientBorder from "examples/GradientBorder";

// Vision UI Dashboard assets
import radialGradient from "assets/theme/functions/radialGradient";
import palette from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import bgSignIn from "assets/images/signInImage.png";

function SignIn() {
  const [rememberMe, setRememberMe] = useState(true);
  const [username, setUsername] = useState(""); // State for username
  const [password, setPassword] = useState(""); // State for password
  const [error, setError] = useState(""); // State for error messages
  const history = useHistory(); // Get history object for redirection

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission
    setError(""); // Clear previous errors

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/api/admins/login`, // Use environment variable for base URL
        { username, password }
      );

      if (response.data && response.data.token) {
        const token = response.data.token;
        // Store token based on rememberMe state
        if (rememberMe) {
          localStorage.setItem("authToken", token);
        } else {
          sessionStorage.setItem("authToken", token);
        }
        // Redirect to dashboard
        history.push("/dashboard");
      } else {
        // Handle cases where token is not received even on success (shouldn't happen with JWT)
        setError("Login successful, but no token received.");
      }
    } catch (err) {
      // Handle login errors
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.request) {
        setError("No response from server. Please check your connection.");
      } else {
        setError("Login failed. Please try again.");
      }
      console.error("Login error:", err);
    }
  };


  return (
    <CoverLayout
      title="Nice to see you!"
      color="white"
      description="Enter your username and password to sign in" // Updated description
      // premotto="INSPIRED BY THE FUTURE:"
      motto="SUN PIVOTAL INVESTMENT"
      image={bgSignIn}
      showNavbar={false} // Pass showNavbar={false}
    >
      {/* Use onSubmit on the form */}
      <VuiBox component="form" role="form" onSubmit={handleSubmit}>
        {/* Display error message if present */}
        {error && (
          <VuiBox mb={2} p={1.5} borderRadius="md" sx={{ backgroundColor: palette.error.main }}>
            <VuiTypography variant="button" color="white" fontWeight="medium">
              {error}
            </VuiTypography>
          </VuiBox>
        )}
        <VuiBox mb={2}>
          <VuiBox mb={1} ml={0.5}>
            <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
              Username {/* Changed from Email to Username */}
            </VuiTypography>
          </VuiBox>
          <GradientBorder
            minWidth="100%"
            padding="1px"
            borderRadius={borders.borderRadius.lg}
            backgroundImage={radialGradient(
              palette.gradients.borderLight.main,
              palette.gradients.borderLight.state,
              palette.gradients.borderLight.angle
            )}
          >
            {/* Update input for username */}
            <VuiInput
              type="text" // Changed type to text
              placeholder="Your username..." // Updated placeholder
              fontWeight="500"
              value={username} // Bind value to state
              onChange={(e) => setUsername(e.target.value)} // Update state on change
              required // Make field required
            />
          </GradientBorder>
        </VuiBox>
        <VuiBox mb={2}>
          <VuiBox mb={1} ml={0.5}>
            <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
              Password
            </VuiTypography>
          </VuiBox>
          <GradientBorder
            minWidth="100%"
            borderRadius={borders.borderRadius.lg}
            padding="1px"
            backgroundImage={radialGradient(
              palette.gradients.borderLight.main,
              palette.gradients.borderLight.state,
              palette.gradients.borderLight.angle
            )}
          >
            {/* Update input for password */}
            <VuiInput
              type="password"
              placeholder="Your password..."
              sx={({ typography: { size } }) => ({
                fontSize: size.sm,
              })}
              value={password} // Bind value to state
              onChange={(e) => setPassword(e.target.value)} // Update state on change
              required // Make field required
            />
          </GradientBorder>
        </VuiBox>
        <VuiBox display="flex" alignItems="center">
          <VuiSwitch color="info" checked={rememberMe} onChange={handleSetRememberMe} />
          <VuiTypography
            variant="caption"
            color="white"
            fontWeight="medium"
            onClick={handleSetRememberMe}
            sx={{ cursor: "pointer", userSelect: "none" }}
          >
            &nbsp;&nbsp;&nbsp;&nbsp;Remember me
          </VuiTypography>
        </VuiBox>
        <VuiBox mt={4} mb={1}>
          {/* Change button type to submit */}
          <VuiButton type="submit" color="info" fullWidth>
            SIGN IN
          </VuiButton>
        </VuiBox>
      </VuiBox>
    </CoverLayout>
  );
}

export default SignIn;
