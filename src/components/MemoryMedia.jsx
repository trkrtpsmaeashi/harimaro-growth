import { getMediaType, getMediaUrl } from '../lib/media';

export default function MemoryMedia({
  media,
  className = '',
  controls = false,
  autoPlay = false,
  muted = false,
  loop = false,
  playsInline = true,
  alt = 'はりまろの思い出',
  onClick,
}) {
  const url = getMediaUrl(media);
  const type = getMediaType(media);

  if (!url) {
    return <div className={`memory-media-empty ${className}`}>🦔</div>;
  }

  if (type === 'video') {
    return (
      <video
        className={className}
        src={url}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline={playsInline}
        preload="metadata"
        onClick={onClick}
      />
    );
  }

  return (
    <img
      className={className}
      src={url}
      alt={alt}
      draggable="false"
      onClick={onClick}
    />
  );
}
