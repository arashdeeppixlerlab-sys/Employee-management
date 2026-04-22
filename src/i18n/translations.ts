export type SupportedLocale = 'en-US' | 'hi-IN' | 'es-ES';

export const FALLBACK_LOCALE: SupportedLocale = 'en-US';

export const LANGUAGE_OPTIONS: Array<{ label: string; locale: SupportedLocale }> = [
  { label: 'English', locale: 'en-US' },
  { label: 'Hindi', locale: 'hi-IN' },
  { label: 'Spanish', locale: 'es-ES' },
];

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
  'settings.language': 'Language',
  'settings.timezone': 'Timezone',
  'settings.preview': 'Preview',
  'settings.selectLanguage': 'Select Language',
  'settings.selectTimezone': 'Select Timezone',
  'settings.saveSettings': 'Save Settings',
  'settings.role': 'Role',
  'settings.noEmail': 'No email',
  'settings.unknown': 'Unknown',
  'settings.shortcutDescription': 'Open password settings directly from here.',
  'settings.validationRequired': 'Language and timezone are required',
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

const hiIN: TranslationMap = {
  ...enUS,
  'app.login': 'लॉगिन',
  'app.employeeDashboard': 'कर्मचारी डैशबोर्ड',
  'app.uploadDocument': 'दस्तावेज़ अपलोड करें',
  'app.helpSupport': 'सहायता और समर्थन',
  'app.termsPrivacy': 'नियम और गोपनीयता',
  'app.reports': 'रिपोर्ट्स',
  'settings.title': 'सेटिंग्स',
  'settings.subtitle': 'खाता और ऐप प्राथमिकताएं प्रबंधित करें',
  'settings.section.notifications': 'सूचनाएं',
  'settings.section.localization': 'भाषा और क्षेत्र',
  'settings.language': 'भाषा',
  'settings.timezone': 'समय क्षेत्र',
  'settings.saveSettings': 'सेटिंग्स सहेजें',
  'security.title': 'सुरक्षा',
  'security.section.changePassword': 'पासवर्ड बदलें',
  'security.currentPassword': 'वर्तमान पासवर्ड',
  'security.newPassword': 'नया पासवर्ड',
  'security.confirmNewPassword': 'नए पासवर्ड की पुष्टि करें',
  'security.changePassword': 'पासवर्ड बदलें',
};

const esES: TranslationMap = {
  ...enUS,
  'app.login': 'Iniciar sesion',
  'app.employeeDashboard': 'Panel de empleado',
  'app.uploadDocument': 'Subir documento',
  'app.helpSupport': 'Ayuda y soporte',
  'app.termsPrivacy': 'Terminos y privacidad',
  'app.reports': 'Reportes',
  'settings.title': 'Configuracion',
  'settings.subtitle': 'Administra tu cuenta y preferencias de la app',
  'settings.section.notifications': 'Notificaciones',
  'settings.section.localization': 'Idioma y region',
  'settings.language': 'Idioma',
  'settings.timezone': 'Zona horaria',
  'settings.saveSettings': 'Guardar configuracion',
  'security.title': 'Seguridad',
  'security.section.changePassword': 'Cambiar contrasena',
  'security.currentPassword': 'Contrasena actual',
  'security.newPassword': 'Nueva contrasena',
  'security.confirmNewPassword': 'Confirmar nueva contrasena',
  'security.changePassword': 'Cambiar contrasena',
};

const dictionaries: Record<SupportedLocale, TranslationMap> = {
  'en-US': enUS,
  'hi-IN': hiIN,
  'es-ES': esES,
};

export const normalizeLocale = (value?: string | null): SupportedLocale => {
  if (!value) return FALLBACK_LOCALE;
  if (value === 'English') return 'en-US';
  if (value === 'Hindi') return 'hi-IN';
  if (value === 'Spanish') return 'es-ES';
  if (value in dictionaries) return value as SupportedLocale;
  return FALLBACK_LOCALE;
};

export const getLanguageLabel = (locale: SupportedLocale): string => {
  return LANGUAGE_OPTIONS.find((option) => option.locale === locale)?.label ?? 'English';
};

export const translate = (locale: SupportedLocale, key: string): string => {
  return dictionaries[locale][key] ?? dictionaries[FALLBACK_LOCALE][key] ?? key;
};
