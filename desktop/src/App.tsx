import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import {
  FitnessCenter,
  Assessment,
  CalendarMonth,
  Settings,
  Menu as MenuIcon,
} from '@mui/icons-material';

// Screens
import TemplatesScreen from './screens/TemplatesScreen';

const DRAWER_WIDTH = 240;

type Screen = 'templates' | 'analytics' | 'schedule' | 'settings';

interface NavItem {
  id: Screen;
  label: string;
  icon: React.ReactElement;
}

const navItems: NavItem[] = [
  { id: 'templates', label: 'Templates', icon: <FitnessCenter /> },
  { id: 'analytics', label: 'Analytics', icon: <Assessment /> },
  { id: 'schedule', label: 'Schedule', icon: <CalendarMonth /> },
  { id: 'settings', label: 'Settings', icon: <Settings /> },
];

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('templates');
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'templates':
        return <TemplatesScreen />;
      case 'analytics':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5">Analytics</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Workout analytics and progress charts coming soon...
            </Typography>
          </Box>
        );
      case 'schedule':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5">Schedule</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Workout scheduling and planning coming soon...
            </Typography>
          </Box>
        );
      case 'settings':
        return (
          <Box sx={{ p: 3 }}>
            <Typography variant="h5">Settings</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              App settings coming soon...
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
          Lifted
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={currentScreen === item.id}
              onClick={() => setCurrentScreen(item.id)}
            >
              <ListItemIcon
                sx={{
                  color: currentScreen === item.id ? 'primary.main' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar (for mobile) */}
      <AppBar
        position="fixed"
        sx={{
          display: { sm: 'none' },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Lifted
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar sx={{ display: { sm: 'none' } }} />
        {renderScreen()}
      </Box>
    </Box>
  );
}

export default App;
