export default function FeedItem({ userId, content, type, media, createdAt }) {
  return (
    <div className="feed-item">
      <strong>{userId}</strong>
      <div>{content}</div>
      {media && <img src={media} alt="media" />}
      <div>{type} | {new Date(createdAt).toLocaleString()}</div>
    </div>
  );
}
