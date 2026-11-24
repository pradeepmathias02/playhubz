// Email clients need inline, email-safe equivalents of the app's theme tokens.
export const emailBrand = {
  primary: '#FF4F8B',
  foreground: '#171717',
  muted: '#55575d',
  background: '#ffffff',
};
export const brandHeader = {
  color: emailBrand.primary,
  fontSize: '26px',
  fontWeight: 'bold' as const,
  margin: '0 0 32px',
};