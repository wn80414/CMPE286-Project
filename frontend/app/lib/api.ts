const configuredApiBase =
  process.env.NEXT_PUBLIC_API_URL || 'https://cmpe286-project.onrender.com';

export const API_BASE = configuredApiBase.replace(/\/+$/, '');
export const WS_URL = API_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws');
