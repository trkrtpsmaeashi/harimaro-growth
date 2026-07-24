export default function PhotoModal({ url, onClose }) {
  if (!url) return null;

  return (
    <div className="photo-modal" onClick={onClose}>
      <button className="photo-modal-close" onClick={onClose}>×</button>
      <img src={url} alt="はりまろ" onClick={(event) => event.stopPropagation()} />
    </div>
  );
}
