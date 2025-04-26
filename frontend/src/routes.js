/** 
  All of the routes for the Vision UI Dashboard React are added here,
  You can add a new route, customize the routes and delete the routes here.

  Once you add a new route on this file it will be visible automatically on
  the Sidenav.

  For adding a new route you can follow the existing routes in the routes array.
  1. The `type` key with the `collapse` value is used for a route.
  2. The `type` key with the `title` value is used for a title inside the Sidenav. 
  3. The `type` key with the `divider` value is used for a divider between Sidenav items.
  4. The `name` key is used for the name of the route on the Sidenav.
  5. The `key` key is used for the key of the route (It will help you with the key prop inside a loop).
  6. The `icon` key is used for the icon of the route on the Sidenav, you have to add a node.
  7. The `collapse` key is used for making a collapsible item on the Sidenav that has other routes
  inside (nested routes), you need to pass the nested routes inside an array as a value for the `collapse` key.
  8. The `route` key is used to store the route location which is used for the react router.
  9. The `href` key is used to store the external links location.
  10. The `title` key is only for the item with the type of `title` and its used for the title text on the Sidenav.
  10. The `component` key is used to store the component of its route.
*/

// Vision UI Dashboard React layouts
import Dashboard from "layouts/dashboard";
import Admins from "layouts/admin";
import Clients from "layouts/clients";
import Loans from "layouts/loans"; // Import new Loans component
import Installments from "layouts/installments"; // Import new Installments component
import SignIn from "layouts/authentication/sign-in"; // Make sure SignIn is imported
import SignUp from "layouts/authentication/sign-up"; // Make sure SignUp is imported

// Vision UI Dashboard React icons
import { BsCreditCardFill } from "react-icons/bs";
import { IoHome } from "react-icons/io5";
import { MdAdminPanelSettings } from "react-icons/md";
import { IoPeople } from "react-icons/io5";
import { IoLogOut } from "react-icons/io5"; // Import logout icon
import { IoWalletOutline, IoReceiptOutline } from "react-icons/io5"; // Added IoWalletOutline, IoReceiptOutline

const routes = [
  {
    type: "collapse",
    name: "Dashboard",
    key: "dashboard",
    route: "/dashboard",
    icon: <IoHome size="15px" color="inherit" />,
    component: Dashboard,
    noCollapse: true,
    protected: true, // Mark as protected
  },
  {
    type: "collapse",
    name: "Billing",
    key: "billing",
    route: "/billing", // Keep route for parent collapse identification
    icon: <BsCreditCardFill size="15px" color="inherit" />, // Keep inherit for parent
    collapse: [ // Add collapse array for sub-items
      {
        type: "collapse", // Sub-items are also type collapse but with noCollapse: true
        name: "Loans",
        key: "loans",
        route: "/billing/loans",
        icon: <IoWalletOutline size="15px" color="inherit" />, // Remove color="inherit"
        component: Loans,
        noCollapse: true,
      },
      {
        type: "collapse", // Sub-items are also type collapse but with noCollapse: true
        name: "Installments",
        key: "installments",
        route: "/billing/installments",
        icon: <IoReceiptOutline size="15px" color="inherit" />, // Remove color="inherit"
        component: Installments,
        noCollapse: true,
      },
    ],
  },

  { type: "title", title: "Admin Pages", key: "account-pages" },
  // {
  //   type: "collapse",
  //   name: "Profile",
  //   key: "profile",
  //   route: "/profile",
  //   icon: <BsFillPersonFill size="15px" color="inherit" />,
  //   component: Profile,
  //   noCollapse: true,
  // },
  {
    type: "collapse",
    name: "Clients",
    key: "clients",
    route: "/clients",
    icon: <IoPeople size="15px" color="inherit" />,
    component: Clients,
    noCollapse: true,
    protected: true, // Mark as protected
  },
  {
    type: "collapse",
    name: "Admins",
    key: "admins",
    route: "/admins",
    icon: <MdAdminPanelSettings size="15px" color="inherit" />,
    component: Admins,
    noCollapse: true,
    protected: true, // Mark as protected
  },
  // --- Add Logout Action ---
  {
    type: "action", // Use a distinct type or key
    name: "Logout",
    key: "logout",
    icon: <IoLogOut size="15px" color="inherit" />, // Add icon
    // No route or component needed, will be handled by onClick
  },
  // --- Public routes (keep for routing but hide from Sidenav) ---
  {
    // type: "collapse", // Keep commented or remove
    // name: "Sign In", // Keep commented or remove
    key: "sign-in",
    route: "/authentication/sign-in",
    // icon: <IoIosDocument size="15px" color="inherit" />, // Keep commented or remove
    component: SignIn, // Ensure component is defined
    noCollapse: true,
    protected: false, // Mark as public
  },
  {
    // type: "collapse", // Keep commented or remove
    // name: "Sign Up", // Keep commented or remove
    key: "sign-up",
    route: "/authentication/sign-up",
    // icon: <IoRocketSharp size="15px" color="inherit" />, // Keep commented or remove
    component: SignUp, // Ensure component is defined
    noCollapse: true,
    protected: false, // Mark as public
  },
];

export default routes;
