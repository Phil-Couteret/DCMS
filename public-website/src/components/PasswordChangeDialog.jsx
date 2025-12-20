import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Alert,
  Box
} from '@mui/material';
import passwordMigrationService from '../services/passwordMigrationService';

const PasswordChangeDialog = ({ open, customer, onClose, onSuccess }) => {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const daysRemaining = customer ? passwordMigrationService.getDaysUntilDeletion(customer) : null;

  const handleChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate fields
      if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }

      // Verify current password
      const isValid = await passwordMigrationService.verifyPassword(
        passwordForm.currentPassword,
        customer.password
      );

      if (!isValid) {
        setError('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Check password length
      if (passwordForm.newPassword.length < 6) {
        setError('New password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      // Check passwords match
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setError('New passwords do not match');
        setLoading(false);
        return;
      }

      // Check if new password is same as current (for hashed passwords, we'll allow it)
      // For plaintext, we can compare directly
      if (passwordForm.newPassword === passwordForm.currentPassword) {
        setError('New password must be different from current password');
        setLoading(false);
        return;
      }

      // Change password
      await passwordMigrationService.changePassword(customer.email, passwordForm.newPassword);

      setSuccess(true);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      // Call success callback after a brief delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
      }, 1500);

    } catch (err) {
      setError(err.message || 'Error changing password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !success) {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setError('');
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={loading || success}
    >
      <DialogTitle>
        Password Change Required
      </DialogTitle>
      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Password changed successfully! You can now continue to your account.
          </Alert>
        ) : (
          <>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Security Update Required</strong>
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                For security reasons, you must change your password. 
                {daysRemaining !== null && daysRemaining > 0 && (
                  <> You have <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> remaining.</>
                )}
                {daysRemaining === 0 && (
                  <> <strong>This is your last chance</strong> to change your password.</>
                )}
              </Typography>
            </Alert>

            <form onSubmit={handleSubmit}>
              <TextField
                label="Current Password"
                type="password"
                fullWidth
                required
                sx={{ mb: 2 }}
                value={passwordForm.currentPassword}
                onChange={(e) => handleChange('currentPassword', e.target.value)}
                disabled={loading}
                autoFocus
              />

              <TextField
                label="New Password"
                type="password"
                fullWidth
                required
                sx={{ mb: 2 }}
                value={passwordForm.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                disabled={loading}
                helperText="Must be at least 6 characters long"
              />

              <TextField
                label="Confirm New Password"
                type="password"
                fullWidth
                required
                sx={{ mb: 2 }}
                value={passwordForm.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                disabled={loading}
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </form>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {!success && (
          <>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PasswordChangeDialog;

