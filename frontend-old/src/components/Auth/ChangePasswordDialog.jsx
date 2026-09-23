import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useAuth } from '../../utils/authContext';
import dataService from '../../services/dataService';

/**
 * Simple password change dialog for mock-mode authentication.
 * Updates the user's password in localStorage and refreshes auth context.
 */
const ChangePasswordDialog = ({ open, onClose }) => {
  const { currentUser, login } = useAuth();
  const [userRecord, setUserRecord] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresCurrentPassword = useMemo(() => Boolean(userRecord?.password), [userRecord]);

  useEffect(() => {
    if (open && currentUser?.id) {
      try {
        const latestUser = dataService.getById('users', currentUser.id);
        setUserRecord(latestUser || currentUser);
      } catch (error) {
        console.error('[ChangePasswordDialog] Unable to load user', error);
      }
    }

    if (!open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback(null);
      setIsSubmitting(false);
    }
  }, [open, currentUser]);

  const handleSubmit = () => {
    if (!userRecord?.id) {
      setFeedback({ type: 'error', message: 'Unable to identify the current user.' });
      return;
    }

    if (requiresCurrentPassword && currentPassword !== (userRecord.password || '')) {
      setFeedback({ type: 'error', message: 'Current password is incorrect.' });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword === (userRecord.password || '')) {
      setFeedback({ type: 'error', message: 'New password must be different from the current password.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedUser = dataService.update('users', userRecord.id, {
        password: newPassword,
        passwordLastUpdated: new Date().toISOString()
      });

      if (!updatedUser) {
        throw new Error('User update failed');
      }

      login(updatedUser);
      setFeedback({ type: 'success', message: 'Password updated successfully.' });

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 600);
    } catch (error) {
      console.error('[ChangePasswordDialog] Failed to update password', error);
      setFeedback({ type: 'error', message: 'Unable to update password. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Change Password</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {requiresCurrentPassword
              ? 'Enter your current password and a new password.'
              : 'This account does not have a password yet. Set one now to secure access.'}
          </Typography>

          {requiresCurrentPassword && (
            <TextField
              label="Current Password"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          )}

          <TextField
            label="New Password"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Minimum 6 characters"
            autoComplete="new-password"
          />

          <TextField
            label="Confirm New Password"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {feedback && (
            <Alert severity={feedback.type}>
              {feedback.message}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !newPassword ||
            newPassword.length < 6 ||
            newPassword !== confirmPassword ||
            (requiresCurrentPassword && !currentPassword)
          }
        >
          Save Password
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChangePasswordDialog;
