// User Selector - Simple user selection for mock mode
// In production, this would be a login form

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Typography,
  Box,
  Divider
} from '@mui/material';
import {
  Person as PersonIcon,
  VerifiedUser as SuperAdminIcon,
  AdminPanelSettings as AdminIcon,
  DirectionsBoat as BoatIcon,
  PersonPin as GuideIcon,
  School as TrainerIcon,
  Work as InternIcon
} from '@mui/icons-material';
import { useAuth, USER_ROLES, AVAILABLE_PERMISSIONS } from '../../utils/authContext';
import dataService from '../../services/dataService';

const UserSelector = ({ open, onClose }) => {
  const { login } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Load all users - in API mode, this falls back to localStorage for users
    const loadUsers = async () => {
      try {
        const allUsers = await dataService.getAll('users') || [];
        setUsers(Array.isArray(allUsers) ? allUsers : []);
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
      }
    };
    loadUsers();
  }, []);

  const handleUserSelect = (user) => {
    login(user);
    onClose();
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case USER_ROLES.SUPERADMIN:
        return <SuperAdminIcon />;
      case USER_ROLES.ADMIN:
        return <AdminIcon />;
      case USER_ROLES.BOAT_PILOT:
        return <BoatIcon />;
      case USER_ROLES.GUIDE:
        return <GuideIcon />;
      case USER_ROLES.TRAINER:
        return <TrainerIcon />;
      case USER_ROLES.INTERN:
        return <InternIcon />;
      default:
        return <PersonIcon />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case USER_ROLES.SUPERADMIN:
        return 'error'; // Red/prominent color for superadmin
      case USER_ROLES.ADMIN:
        return 'primary';
      case USER_ROLES.BOAT_PILOT:
        return 'info';
      case USER_ROLES.GUIDE:
        return 'secondary';
      case USER_ROLES.TRAINER:
        return 'success';
      case USER_ROLES.INTERN:
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case USER_ROLES.SUPERADMIN:
        return 'Superadmin';
      case USER_ROLES.ADMIN:
        return 'Admin';
      case USER_ROLES.BOAT_PILOT:
        return 'Boat Pilot';
      case USER_ROLES.GUIDE:
        return 'Guide';
      case USER_ROLES.TRAINER:
        return 'Trainer';
      case USER_ROLES.INTERN:
        return 'Intern';
      default:
        return 'User';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select User</DialogTitle>
      <DialogContent>
        {users.length === 0 ? (
          <Typography color="text.secondary">
            No users found. Please create users in Settings.
          </Typography>
        ) : (
          <List>
            {users.map((user, index) => (
              <React.Fragment key={user.id}>
                <ListItem
                  button
                  onClick={() => handleUserSelect(user)}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getRoleColor(user.role) + '.main' }}>
                      {getRoleIcon(user.role)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {user.name}
                        </Typography>
                        {user.role === USER_ROLES.SUPERADMIN ? (
                          <Chip
                            label="Superadmin (Full Access)"
                            size="small"
                            color={getRoleColor(user.role)}
                          />
                        ) : user.permissions && user.permissions.length > 0 ? (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {user.permissions.slice(0, 2).map((perm) => (
                              <Chip
                                key={perm}
                                label={AVAILABLE_PERMISSIONS[perm]}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                            {user.permissions.length > 2 && (
                              <Chip
                                label={`+${user.permissions.length - 2}`}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            )}
                          </Box>
                        ) : (
                          <Chip
                            label="No permissions"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={user.email || user.username}
                  />
                </ListItem>
                {index < users.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserSelector;

