export function hashString(str) {
  if (!str.length) return '0';
  let hash = 0;
  for (let i = 0, char; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash + '';
}