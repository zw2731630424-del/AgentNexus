export function authorizedSender(event, contents, expectedURL) {
  return !!contents && !contents.isDestroyed() && event.sender === contents && event.senderFrame === contents.mainFrame && event.senderFrame?.url === expectedURL;
}
