export function safeAuthDestination(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/minhas-peladas";
  return value;
}