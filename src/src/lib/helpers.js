export function formatDate(dateText) {
  if (!dateText) return '-';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(`${dateText}T00:00:00`));
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
