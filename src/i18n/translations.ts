export type SupportedLocale = 'en-US';

export const FALLBACK_LOCALE: SupportedLocale = 'en-US';

type TranslationMap = Record<string, string>;

const enUS: TranslationMap = {
  'app.title': 'Employee Management',
  'app.login': 'Login',
  'app.employeeDashboard': 'Employee Dashboard',
  'app.uploadDocument': 'Upload Document',
  'app.helpSupport': 'Help & Support',
  'app.termsPrivacy': 'Terms & Privacy',
  'app.reports': 'Reports',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.validation': 'Validation',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.reset': 'Reset',
  'settings.title': 'Settings',
  'settings.subtitle': 'Manage working account and app preferences',
  'settings.section.account': 'Account',
  'settings.section.notifications': 'Notifications',
  'settings.section.localization': 'Localization',
  'settings.section.securityShortcut': 'Security Shortcut',
  'settings.openSecurity': 'Open Security',
  'settings.emailNotifications': 'Email Notifications',
  'settings.pushNotifications': 'Push Notifications',
  'settings.timezone': 'Timezone',
  'settings.preview': 'Preview',
  'settings.selectTimezone': 'Select Timezone',
  'settings.saveSettings': 'Save Settings',
  'settings.role': 'Role',
  'settings.noEmail': 'No email',
  'settings.unknown': 'Unknown',
  'settings.shortcutDescription': 'Open password settings directly from here.',
  'settings.validationRequired': 'Timezone is required',
  'settings.updatedSuccess': 'Settings updated successfully',
  'settings.saveFailed': 'Failed to save settings',
  'settings.userNotAuthenticated': 'User not authenticated',
  'security.title': 'Security',
  'security.section.changePassword': 'Change Password',
  'security.currentPassword': 'Current Password',
  'security.newPassword': 'New Password',
  'security.confirmNewPassword': 'Confirm New Password',
  'security.requirement': 'Password must be at least 8 characters.',
  'security.changePassword': 'Change Password',
  'security.fillAll': 'Please fill all fields',
  'security.minLength': 'New password must be at least 8 characters',
  'security.passwordMismatch': 'New password and confirm password do not match',
  'security.passwordDifferent': 'New password must be different from current password',
  'security.changeFailed': 'Failed to change password',
  'security.changedSuccess': 'Password changed successfully',
};

const dictionaries: Record<SupportedLocale, TranslationMap> = {
  'en-US': enUS,
};

export const translate = (locale: SupportedLocale, key: string): string => {
  return dictionaries[locale][key] ?? dictionaries[FALLBACK_LOCALE][key] ?? key;
};
