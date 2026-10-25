import 'server-only';

const PLACEHOLDER_VALUES = ['your_', 'your-', 'example', 'placeholder', 'changeme', '...'];

export function hasUsableValue(value: string | undefined): value is string {
  return Boolean(
    value && value.trim() && !PLACEHOLDER_VALUES.some((placeholder) => value.includes(placeholder))
  );
}

export const isProduction = process.env.NODE_ENV === 'production';

export function getRequiredProductionEnv(name: string): string {
  const value = process.env[name];
  if (!hasUsableValue(value)) {
    throw new Error(`${name} must be configured in production.`);
  }
  return value;
}

export function getApplicationOrigin(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (hasUsableValue(configured)) {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && isProduction) {
      throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS in production.');
    }
    return url.origin;
  }

  if (isProduction) {
    throw new Error('NEXT_PUBLIC_APP_URL must be configured in production.');
  }

  if (!request) return 'http://localhost:3000';
  return new URL(request.url).origin;
}
