import { canonical, invariant, sha256 } from '../types.ts';
import { hash, keys, snapshot } from '../runtime/contracts.ts';

export type UbuntuDeployment={schema:'agentnexus/ubuntu-preparation/1';host_uid:number;host_gid:number;worker_uid:number;worker_gid:number;
  socket_path:string;worker_root:string;read_only_runtime:string;supervisor_path:string;supervisor_sha256:string;
  cgroup_root:string;apparmor_profile:string;seccomp_sha256:string;max_pids:number;memory_bytes:number;cpu_max:{quota:number;period:number};};
export type UnixPeer={pid:number;uid:number;gid:number;start_ticks:string;pidfd_pinned:boolean;executable_sha256:string};
export function ubuntuPreparation(config:UbuntuDeployment){
  const c=snapshot(config);keys(c,['schema','host_uid','host_gid','worker_uid','worker_gid','socket_path','worker_root','read_only_runtime','supervisor_path','supervisor_sha256','cgroup_root','apparmor_profile','seccomp_sha256','max_pids','memory_bytes','cpu_max']);
  invariant(c.schema==='agentnexus/ubuntu-preparation/1','UBUNTU_SCHEMA');
  for(const v of [c.host_uid,c.host_gid,c.worker_uid,c.worker_gid])invariant(Number.isSafeInteger(v)&&v>=1000,'UBUNTU_DISTINCT_UNPRIVILEGED_IDS');
  invariant(c.host_uid!==c.worker_uid&&c.host_gid!==c.worker_gid,'UBUNTU_DISTINCT_UNPRIVILEGED_IDS');
  for(const p of [c.socket_path,c.worker_root,c.read_only_runtime,c.supervisor_path,c.cgroup_root])invariant(/^\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(p)&&!p.split('/').includes('..'),'UBUNTU_PATH');
  hash(c.supervisor_sha256);hash(c.seccomp_sha256);invariant(/^agentnexus\.[A-Za-z0-9_.-]+$/.test(c.apparmor_profile),'UBUNTU_APPARMOR');
  keys(c.cpu_max,['quota','period']);invariant(c.max_pids>=1&&c.max_pids<=16&&Number.isSafeInteger(c.max_pids)&&Number.isSafeInteger(c.memory_bytes)&&c.memory_bytes>=16777216&&Number.isSafeInteger(c.cpu_max.quota)&&c.cpu_max.quota>0&&Number.isSafeInteger(c.cpu_max.period)&&c.cpu_max.period>=1000&&c.cpu_max.period<=1000000&&c.cpu_max.quota<=c.cpu_max.period,'UBUNTU_LIMITS');
  const plan={schema:'agentnexus/ubuntu-launch-plan/1',config:c,required_syscalls:['socket(AF_UNIX)','getsockopt(SO_PEERCRED)','pidfd_open','openat2(RESOLVE_BENEATH|RESOLVE_NO_SYMLINKS|RESOLVE_NO_MAGICLINKS)','clone3(CLONE_NEWUSER|CLONE_NEWNS|CLONE_NEWPID|CLONE_NEWNET)','mount(MS_PRIVATE)','prctl(PR_SET_NO_NEW_PRIVS)','seccomp(SECCOMP_SET_MODE_FILTER)','pidfd_send_signal','waitid(P_PIDFD)'],
    namespaces:{user:'exact subordinate UID/GID maps; deny setgroups before gid_map',mount:'private root; read-only runtime; File Broker handles; no host database mounts',pid:'trusted namespace init reaps every descendant',network:'new empty namespace; loopback disabled; no inherited network sockets'},
    cgroup:{version:2,atomic_assignment:'clone3 CLONE_INTO_CGROUP before untrusted instructions',controllers:['pids.max','memory.max','memory.swap.max','cpu.max'],cpu_time:'cpu.max is bandwidth; cpu.stat accounting alone is not cumulative CPU hard termination'},
    exit:['all pidfds signaled','cgroup.events populated=0','namespace init reaped','stdout/stderr EOF','UDS request ledger drained or UNKNOWN','resource owner + independent adjudication'],deployment:'BLOCKED_REQUIRES_EXPLICIT_UBUNTU_AUTHORIZATION'};
  return snapshot({...plan,plan_sha256:sha256(canonical(plan))});
}
export function verifyUnixPeer(actual:UnixPeer,expected:UnixPeer):void{
  keys(actual,['pid','uid','gid','start_ticks','pidfd_pinned','executable_sha256']);hash(actual.executable_sha256);
  invariant(actual.pidfd_pinned&&actual.pid>0&&/^\d+$/.test(actual.start_ticks)&&canonical(actual)===canonical(expected),'UBUNTU_SO_PEERCRED_OR_PIDFD_MISMATCH');
}
