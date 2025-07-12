// Import each CSS module
import navbar from './Nav/Nav.module.css';
import buttons from './Nav/navbar-buttons.module.css';
import dropdowns from './Nav/navbar-dropdowns.module.css';
import notifications from './Nav/navbar-notifications.module.css';
import responsive from './Nav/navbar-responsive.module.css';

// Export individual modules
export { navbar, buttons, dropdowns, notifications, responsive };

// Combined styles object
export const styles = {
  ...navbar,
  ...buttons,
  ...dropdowns,
  ...notifications,
  ...responsive,
};
