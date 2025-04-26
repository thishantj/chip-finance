import PropTypes from "prop-types";

// @mui material components
import Collapse from "@mui/material/Collapse";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Icon from "@mui/material/Icon";
import List from "@mui/material/List"; // Add this import
import ExpandLess from '@mui/icons-material/ExpandLess'; // Import icons for collapse
import ExpandMore from '@mui/icons-material/ExpandMore'; // Import icons for collapse

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";

// Custom styles for the SidenavCollapse
import {
  collapseItem,
  collapseIconBox,
  collapseIcon,
  collapseText,
} from "examples/Sidenav/styles/sidenavCollapse";

// Vision UI Dashboard React context
import { useVisionUIController } from "context";

// Added onClick prop
function SidenavCollapse({ color, icon, name, children, active, noCollapse, open, onClick, ...rest }) {
  const [controller] = useVisionUIController();
  const { miniSidenav, transparentSidenav } = controller;

  return (
    <>
      {/* Use ListItemButton for better click handling and styling */}
      <ListItem component="li" sx={{ p: 0 }}>
        {/* Pass onClick to VuiBox */}
        <VuiBox
          {...rest}
          onClick={onClick} // Attach onClick handler here
          sx={(theme) => collapseItem(theme, { active, transparentSidenav })}
        >
          <ListItemIcon
            sx={(theme) => collapseIconBox(theme, { active, transparentSidenav, color })}
          >
            {typeof icon === "string" ? (
              <Icon sx={(theme) => collapseIcon(theme, { active })}>{icon}</Icon>
            ) : (
              icon
            )}
          </ListItemIcon>

          <ListItemText
            primary={name}
            sx={(theme) => collapseText(theme, { miniSidenav, transparentSidenav, active })}
          />
          {/* Add dropdown arrow only if it's collapsible (has children and noCollapse is false) */}
          {!noCollapse && children && (
             <Icon sx={{ color: active ? "white" : "grey.600", mr: 1 }}>
               {open ? <ExpandLess /> : <ExpandMore />}
             </Icon>
          )}
        </VuiBox>
      </ListItem>
      {/* Render children within MUI Collapse, controlled by the open prop */}
      {children && (
        <Collapse in={open} timeout="auto" unmountOnExit sx={{ pl: miniSidenav ? 0 : 3 /* Indent children when not mini */ }}>
          <List component="div" disablePadding>
            {children}
          </List>
        </Collapse>
      )}
    </>
  );
}

// Setting default values for the props of SidenavCollapse
SidenavCollapse.defaultProps = {
  color: "info",
  active: false,
  noCollapse: false,
  children: false,
  open: false,
  onClick: () => {}, // Add default empty function for onClick
};

// Typechecking props for the SidenavCollapse
SidenavCollapse.propTypes = {
  color: PropTypes.oneOf(["info", "success", "warning", "error", "dark"]),
  icon: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
  children: PropTypes.node,
  active: PropTypes.bool,
  noCollapse: PropTypes.bool,
  open: PropTypes.bool,
  onClick: PropTypes.func, // Add prop type for onClick
};

export default SidenavCollapse;
