export function profilePathForUser(targetUserId?: string, viewerUserId?: string) {
  if (!targetUserId) {
    return null;
  }
  return targetUserId === viewerUserId ? '/profile' : `/profile/${targetUserId}`;
}
