/* Read-only native boundary preparation. Linux execution/qualification NOT_RUN. */
#define _GNU_SOURCE
#include <errno.h>
#include <stdint.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>
struct nexus_peer { pid_t pid; uid_t uid; gid_t gid; };
int nexus_unix_peer(int connected_socket, struct nexus_peer *out) {
    struct ucred peer;
    socklen_t length = sizeof(peer);
    if (!out) { errno = EINVAL; return -1; }
    if (getsockopt(connected_socket, SOL_SOCKET, SO_PEERCRED, &peer, &length) != 0) return -1;
    if (length != sizeof(peer) || peer.pid <= 0) { errno = EPROTO; return -1; }
    out->pid = peer.pid; out->uid = peer.uid; out->gid = peer.gid;
    /* Caller must additionally pin pidfd + /proc start ticks and immutable image.
       Credentials do not by themselves establish a Runtime or authorize execution. */
    return 0;
}
