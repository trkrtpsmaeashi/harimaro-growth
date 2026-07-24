export function getMediaUrl(media) {
  return media?.media_url || media?.photo_url || '';
}

export function getMediaPath(media) {
  return media?.media_path || media?.photo_path || '';
}

export function getMediaType(media) {
  if (media?.media_type) return media.media_type;
  if (media?.mime_type?.startsWith('video/')) return 'video';
  return 'image';
}

export function isVideoMedia(media) {
  return getMediaType(media) === 'video';
}

export function mediaExtension(media, fallback = 'jpg') {
  const url = getMediaUrl(media);
  const clean = url.split('?')[0];
  const extension = clean.includes('.') ? clean.split('.').pop() : '';
  return extension && extension.length <= 5 ? extension : fallback;
}
