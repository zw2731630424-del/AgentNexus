// M1.5 native bootstrap. Owns temporary handles only; never provisions an account,
// changes an ACL/profile/logon right, or upgrades a primitive to qualification.
using System;
using System.Collections;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Win32.SafeHandles;

public static partial class AgentNexusNativeRuntime {
    const int BootstrapPayloadLimit = 24576;
    const int BootstrapOwnerLimit = 4;
    const int BootstrapLeaseMs = 300000;
    const uint BootstrapClientRights = 0x0012019b; // No FILE_CREATE_PIPE_INSTANCE (4).
    const uint BootstrapOwnerRights = 0x001f01ff;
    static readonly object BootstrapGate = new object();
    static readonly Dictionary<string,BootstrapEndpoint> BootstrapEndpoints = new Dictionary<string,BootstrapEndpoint>(StringComparer.Ordinal);
    static readonly Dictionary<string,BootstrapChannel> BootstrapChannels = new Dictionary<string,BootstrapChannel>(StringComparer.Ordinal);
    static readonly Dictionary<string,BootstrapPins> BootstrapPinLeases = new Dictionary<string,BootstrapPins>(StringComparer.Ordinal);
    static int BootstrapRequests;
    static int BootstrapChannelReservations;
    static int BootstrapPinReservations;
    static int BootstrapIssuedIds;
    static IntPtr BootstrapParentHandle;
    static uint BootstrapParentPid;
    static IDictionary BootstrapParentIdentity;
    static bool BootstrapStopped;
    static bool BootstrapProductionRevoked;
    static readonly Timer BootstrapExpiry = new Timer(delegate(object state) {
        try {
            lock(BootstrapGate) {
                if(BootstrapStopped)return;
                if(BootstrapParentHandle!=IntPtr.Zero && WaitForSingleObject(BootstrapParentHandle,0)!=258) {
                    BootstrapShutdown();
                    // Closing this helper also closes every KILL_ON_JOB_CLOSE
                    // handle. It is termination, never an exit proof.
                    Environment.Exit(125);
                }
            }
            BootstrapExpire();
        } catch { BootstrapShutdown();Environment.Exit(126); }
    }, null, 250, 250);

    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool QueryFullProcessImageNameW(IntPtr process, uint flags, StringBuilder path, ref uint length);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
    static extern bool WaitNamedPipeW(string name, uint milliseconds);

    sealed class BootstrapExpected {
        public string sid, image, hash;
        public IDictionary exact;
        public bool test;
    }
    sealed class BootstrapPeer : IDisposable {
        public IntPtr process;
        public uint pid;
        public IDictionary identity;
        public BootstrapExpected expected;
        public AnchoredPath image;
        public string imageId;
        public void Dispose() {
            if (image != null) { image.Dispose(); image=null; }
            if (process != IntPtr.Zero) { CloseHandle(process); process=IntPtr.Zero; }
        }
    }
    sealed class BootstrapEndpoint : IDisposable {
        public string id, name, sddl;
        public BootstrapExpected expected;
        public NamedPipeServerStream listener;
        public readonly object gate = new object();
        public readonly Stopwatch clock = Stopwatch.StartNew();
        public bool closed, accepting;
        public void Dispose() {
            closed=true;
            if (listener != null) { listener.Dispose(); listener=null; }
        }
    }
    sealed class BootstrapChannel : IDisposable {
        public string id, endpoint, name, sddl;
        public bool server, test, closed;
        public PipeStream pipe;
        public BootstrapPeer peer;
        public readonly object gate = new object();
        public readonly Stopwatch clock = Stopwatch.StartNew();
        public void Dispose() {
            closed=true;
            if (pipe != null) { pipe.Dispose(); pipe=null; }
            if (peer != null) { peer.Dispose(); peer=null; }
        }
    }
    sealed class BootstrapPinnedFile : IDisposable {
        public string path, hash, sddl, owner, id;
        public bool directory;
        public AnchoredPath anchor;
        public IntPtr security;
        public void Dispose() {
            if (security != IntPtr.Zero) { CloseHandle(security); security=IntPtr.Zero; }
            if (anchor != null) { anchor.Dispose(); anchor=null; }
        }
    }
    sealed class BootstrapPins : IDisposable {
        public string id, sid;
        public bool test, closed;
        public BootstrapPeer parent;
        public readonly List<BootstrapPinnedFile> pins = new List<BootstrapPinnedFile>();
        public readonly Stopwatch clock = Stopwatch.StartNew();
        public readonly object gate = new object();
        public void Dispose() {
            closed=true;
            foreach (var pin in pins) pin.Dispose();
            pins.Clear();
            if (parent != null) { parent.Dispose(); parent=null; }
        }
    }

    static void BootstrapFields(IDictionary p, params string[] allowed) {
        var names = new HashSet<string>(allowed, StringComparer.Ordinal);
        foreach (object key in p.Keys) Require(key is string && names.Contains((string)key), "BOOTSTRAP_FIELDS", "Unknown bootstrap parameter");
    }
    static string BootstrapSid(string sid) {
        Require(sid != null && sid.Length <= 184, "BOOTSTRAP_SID", "An explicit trusted SID is required");
        var parsed = new SecurityIdentifier(sid);
        Require(parsed.Value == sid, "BOOTSTRAP_SID", "Expected a canonical SID");
        return sid;
    }
    static string BootstrapImage(string path) {
        string drive; RootComponents(path, out drive);
        return Path.GetFullPath(path);
    }
    static string BootstrapDigest(string hash) {
        Require(hash != null && Regex.IsMatch(hash, "^[a-f0-9]{64}$"), "BOOTSTRAP_HASH", "An explicit lowercase image SHA256 is required");
        return hash;
    }
    static string BootstrapName(IDictionary p) {
        string name=S(p,"name");
        Require(name != null && name.Length <= 128 && Regex.IsMatch(name,"^AgentNexus-M15-[A-Za-z0-9-]+$"), "BOOTSTRAP_PIPE_NAME", "Invalid M1.5 pipe name");
        return name;
    }
    static string BootstrapNewId(string kind) {
        lock(BootstrapGate) {
            Require(BootstrapIssuedIds<128,"BOOTSTRAP_ID_LIMIT","Helper-local ID ledger exhausted; restart through trusted bootstrap");
            BootstrapIssuedIds++;
            return "M15-"+kind+"-"+Guid.NewGuid().ToString("N");
        }
    }
    static void BootstrapReserveChannel() {
        lock(BootstrapGate) {
            Require(BootstrapChannels.Count+BootstrapChannelReservations<BootstrapOwnerLimit,"BOOTSTRAP_CHANNEL_LIMIT","Live and pending native connections fill this owner");
            BootstrapChannelReservations++;
        }
    }
    static void BootstrapWatchParent() {
        lock(BootstrapGate) {
            Require(!BootstrapStopped,"BOOTSTRAP_CLOSED","Bootstrap owner is closed");
            if(BootstrapParentHandle==IntPtr.Zero) {
                uint pid=ParentPid(GetCurrentProcess());IntPtr handle=OpenProcess(QUERY|SYNCHRONIZE,false,pid);Check(handle!=IntPtr.Zero,"Pin actual bootstrap parent");
                try { var identity=Identity(handle,pid,true);Require(WaitForSingleObject(handle,0)==258,"PEER_EXITED","Actual parent has exited");BootstrapParentIdentity=identity;BootstrapParentPid=pid;BootstrapParentHandle=handle;handle=IntPtr.Zero; }
                finally { if(handle!=IntPtr.Zero)CloseHandle(handle); }
            }
            Require(WaitForSingleObject(BootstrapParentHandle,0)==258,"BOOTSTRAP_PARENT_EXITED","Pinned Node owner exited");
            Match(BootstrapParentIdentity,Identity(BootstrapParentHandle,BootstrapParentPid,false));
        }
    }
    static void BootstrapRequireAttested() {
        BootstrapWatchParent();BootstrapExpire();var selected=new List<BootstrapPins>();
        lock(BootstrapGate) {
            Require(!BootstrapProductionRevoked,"BOOTSTRAP_ATTESTATION_REVOKED","A production pin lease was lost; restart through trusted bootstrap");
            foreach(var lease in BootstrapPinLeases.Values)if(!lease.test && !lease.closed)selected.Add(lease);
        }
        Require(selected.Count>0,"BOOTSTRAP_ATTESTATION_REQUIRED","A live production parent/config pin attestation is required");
        foreach(var lease in selected)lock(lease.gate) {
            try { BootstrapPinsResult(lease); }
            catch { lock(BootstrapGate) { BootstrapProductionRevoked=true;BootstrapPinLeases.Remove(lease.id); }lease.Dispose();throw; }
        }
    }
    static BootstrapExpected BootstrapExpectedPeer(IDictionary p, bool test) {
        // A JSON flag can never switch production into the primitive route.
        if (p.Contains("allow_test_appcontainer")) Require(Get(p,"allow_test_appcontainer") is bool && !(bool)p["allow_test_appcontainer"], "BOOTSTRAP_TEST_FLAG", "Production cannot allow an AppContainer by parameter");
        var expected=new BootstrapExpected { sid=BootstrapSid(S(p,"peer_sid")), image=BootstrapImage(S(p,"peer_image")), hash=BootstrapDigest(S(p,"peer_image_sha256")), test=test };
        if (p.Contains("expected_peer")) {
            expected.exact=Get(p,"expected_peer") as IDictionary;
            Require(expected.exact != null, "EXPECTED_IDENTITY", "Invalid pinned expected peer");
            BootstrapFields(expected.exact,"os","principal","pid","start_id","os_session");
            Require(S(expected.exact,"principal")==expected.sid,"BOOTSTRAP_SID","Expected tuple and configured SID differ");
        }
        return expected;
    }
    static bool BootstrapStandard(IDictionary identity, bool test) {
        var token=Get(identity,"token") as IDictionary;
        Require(token != null,"BOOTSTRAP_TOKEN","Detailed native token observation required");
        bool standard=!(bool)token["is_appcontainer"] && !(bool)token["elevated"] && !(bool)token["ui_access"];
        foreach (IDictionary group in (IList)token["groups"]) if (S(group,"sid")=="S-1-5-32-544") standard=false;
        if (!test) Require(standard,"BOOTSTRAP_STANDARD_ACCOUNT","Production bootstrap refuses AppContainer, elevation, Administrators membership or UI access");
        return standard;
    }
    static string BootstrapProcessImage(IntPtr process) {
        var path=new StringBuilder(32768);uint length=(uint)path.Capacity;
        Check(QueryFullProcessImageNameW(process,0,path,ref length),"Query actual bootstrap peer image");
        Require(length>0 && length<32768,"BOOTSTRAP_IMAGE","Invalid process image length");
        return BootstrapImage(path.ToString());
    }
    static string BootstrapHashFile(IntPtr handle) {
        // Repeated checks start at zero; HashFile's shared kernel pointer otherwise
        // remains at EOF after the first hash of a retained image handle.
        using (var file=new FileStream(new SafeFileHandle(handle,false),FileAccess.Read,8192,false))
        using (var sha=SHA256.Create()) {
            Require(file.Length<=512L*1024*1024,"EXECUTABLE_LIMIT","Bootstrap image exceeds 512MiB");
            file.Position=0;
            string hash=BitConverter.ToString(sha.ComputeHash(file)).Replace("-","").ToLowerInvariant();
            file.Position=0;
            return hash;
        }
    }
    static BootstrapPeer BootstrapPinPeer(uint pid, BootstrapExpected expected) {
        var peer=new BootstrapPeer { pid=pid, expected=expected };
        try {
            peer.process=OpenProcess(QUERY|SYNCHRONIZE,false,pid);Check(peer.process!=IntPtr.Zero,"Pin bootstrap peer process");
            var identity=Identity(peer.process,pid,true);
            Require(S(identity,"principal")==expected.sid,"BOOTSTRAP_PEER_SID","Kernel peer SID differs from trusted configuration");
            BootstrapStandard(identity,expected.test);
            if (expected.exact!=null) Match(expected.exact,identity);
            Require(WaitForSingleObject(peer.process,0)==258,"PEER_EXITED","Bootstrap peer exited");
            Require(String.Equals(BootstrapProcessImage(peer.process),expected.image,StringComparison.OrdinalIgnoreCase),"BOOTSTRAP_PEER_IMAGE","Kernel peer image path differs from trusted configuration");
            peer.image=Anchor(expected.image,false);
            peer.imageId=FileId(FileInfo(peer.image.Leaf,false));
            Require(BootstrapHashFile(peer.image.Leaf)==expected.hash,"BOOTSTRAP_PEER_IMAGE_HASH","Pinned peer image bytes differ from trusted configuration");
            peer.identity=identity;
            return peer;
        } catch { peer.Dispose();throw; }
    }
    static IDictionary BootstrapRecheckPeer(BootstrapPeer peer) {
        Require(peer!=null && peer.process!=IntPtr.Zero,"BOOTSTRAP_CLOSED","Peer pin is closed");
        Require(WaitForSingleObject(peer.process,0)==258,"PEER_EXITED","Pinned peer exited");
        var actual=Identity(peer.process,peer.pid,true);Match(peer.identity,actual);
        BootstrapStandard(actual,peer.expected.test);
        var old=(IDictionary)peer.identity["token"];var current=(IDictionary)actual["token"];
        Require(S(old,"token_id")==S(current,"token_id") && S(old,"modified_id")==S(current,"modified_id"),"BOOTSTRAP_TOKEN_CHANGED","Pinned peer token changed");
        Require(String.Equals(BootstrapProcessImage(peer.process),peer.expected.image,StringComparison.OrdinalIgnoreCase),"BOOTSTRAP_PEER_IMAGE","Pinned peer image changed");
        Require(FileId(FileInfo(peer.image.Leaf,false))==peer.imageId && BootstrapHashFile(peer.image.Leaf)==peer.expected.hash,"BOOTSTRAP_PEER_IMAGE_HASH","Pinned image version changed");
        return actual;
    }
    static RawSecurityDescriptor BootstrapSecurity(IntPtr handle, int kind, bool requireProtected=true) {
        IntPtr owner,group,dacl,sacl,descriptor;
        uint error=GetSecurityInfo(handle,kind,7,out owner,out group,out dacl,out sacl,out descriptor);
        if(error!=0)throw new Win32Exception((int)error,"Read exact bootstrap owner/group/DACL");
        try {
            uint length=GetSecurityDescriptorLength(descriptor);Require(length>0 && length<=65536,"BOOTSTRAP_DACL","Security descriptor exceeds bound");
            var bytes=new byte[length];Marshal.Copy(descriptor,bytes,0,(int)length);
            var result=new RawSecurityDescriptor(bytes,0);
            Require(result.DiscretionaryAcl!=null && (!requireProtected || (result.ControlFlags&ControlFlags.DiscretionaryAclProtected)!=0),"BOOTSTRAP_DACL","A non-null DACL and any required protection are mandatory");
            return result;
        } finally { LocalFree(descriptor); }
    }
    static string BootstrapPipeDacl(IntPtr handle,string selfSid,string peerSid) {
        var descriptor=BootstrapSecurity(handle,6);var acl=descriptor.DiscretionaryAcl;
        Require(acl.Count==2,"BOOTSTRAP_PIPE_DACL","Pipe must have exactly the configured owner/client ACEs");
        string[] principals={selfSid,peerSid};uint[] rights={BootstrapOwnerRights,BootstrapClientRights};
        for(int i=0;i<2;i++) {
            var ace=acl[i] as CommonAce;
            Require(ace!=null && ace.AceQualifier==AceQualifier.AccessAllowed && ace.AceFlags==AceFlags.None && !ace.IsCallback && ace.SecurityIdentifier.Value==principals[i] && unchecked((uint)ace.AccessMask)==rights[i],"BOOTSTRAP_PIPE_DACL","Unexpected pipe ACE, inherited permission, principal or instance right");
        }
        return descriptor.GetSddlForm(AccessControlSections.Access);
    }
    static NamedPipeServerStream BootstrapNewListener(BootstrapEndpoint endpoint,bool first) {
        var self=Identity(GetCurrentProcess(),GetCurrentProcessId(),true);BootstrapStandard(self,endpoint.expected.test);
        string selfSid=S(self,"principal");
        if(!endpoint.expected.test)Require(selfSid!=endpoint.expected.sid,"BOOTSTRAP_DISTINCT_SID","Production pipe requires distinct trusted account SIDs");
        string sddl="D:P(A;;0x001f01ff;;;"+selfSid+")(A;;0x0012019b;;;"+endpoint.expected.sid+")";
        IntPtr descriptor;uint bytes;Check(ConvertStringSecurityDescriptorToSecurityDescriptorW(sddl,1,out descriptor,out bytes),"Create explicit M1.5 pipe descriptor");
        SafePipeHandle safe=null;
        try {
            var attributes=new SECURITY_ATTRIBUTES { size=Marshal.SizeOf<SECURITY_ATTRIBUTES>(),descriptor=descriptor,inherit=false };
            uint mode=3|0x40000000|(first?0x80000u:0u);
            IntPtr handle=CreateNamedPipeW("\\\\.\\pipe\\"+endpoint.name,mode,8,4,BootstrapPayloadLimit+4,BootstrapPayloadLimit+4,0,ref attributes);
            Check(handle!=Invalid,"Create protected M1.5 local pipe instance");safe=new SafePipeHandle(handle,true);
            endpoint.sddl=BootstrapPipeDacl(handle,selfSid,endpoint.expected.sid);
            var stream=new NamedPipeServerStream(PipeDirection.InOut,true,false,safe);safe=null;return stream;
        } finally { if(safe!=null)safe.Dispose();LocalFree(descriptor); }
    }
    static void BootstrapExpire() {
        lock(BootstrapGate) {
            var endpoints=new List<string>();foreach(var pair in BootstrapEndpoints)if(pair.Value.clock.ElapsedMilliseconds>=BootstrapLeaseMs)endpoints.Add(pair.Key);
            foreach(string id in endpoints)BootstrapDropEndpoint(id);
            var channels=new List<string>();foreach(var pair in BootstrapChannels)if(pair.Value.clock.ElapsedMilliseconds>=BootstrapLeaseMs)channels.Add(pair.Key);
            foreach(string id in channels)BootstrapDropChannel(id);
            var pins=new List<string>();foreach(var pair in BootstrapPinLeases)if(pair.Value.clock.ElapsedMilliseconds>=BootstrapLeaseMs)pins.Add(pair.Key);
            foreach(string id in pins) { if(!BootstrapPinLeases[id].test)BootstrapProductionRevoked=true;BootstrapPinLeases[id].Dispose();BootstrapPinLeases.Remove(id); }
        }
    }
    static void BootstrapDropChannel(string id) {
        BootstrapChannel channel;if(BootstrapChannels.TryGetValue(id,out channel)) { BootstrapChannels.Remove(id);channel.Dispose(); }
    }
    static void BootstrapDropEndpoint(string id) {
        BootstrapEndpoint endpoint;if(!BootstrapEndpoints.TryGetValue(id,out endpoint))return;
        BootstrapEndpoints.Remove(id);endpoint.Dispose();
        var channels=new List<string>();foreach(var pair in BootstrapChannels)if(pair.Value.endpoint==id)channels.Add(pair.Key);
        foreach(string channel in channels)BootstrapDropChannel(channel);
    }
    static BootstrapChannel BootstrapGetChannel(IDictionary p,bool test) {
        BootstrapExpire();string id=S(p,"channel_id");BootstrapChannel channel;
        lock(BootstrapGate) { Require(id!=null && BootstrapChannels.TryGetValue(id,out channel),"BOOTSTRAP_CHANNEL_UNKNOWN","Unknown or revoked helper-local channel");channel=BootstrapChannels[id]; }
        Require(channel.test==test,"BOOTSTRAP_MODE","Primitive and production channels cannot be interchanged");
        return channel;
    }
    static void BootstrapCheckChannel(BootstrapChannel channel) {
        BootstrapWatchParent();if(!channel.test)BootstrapRequireAttested();
        Require(!channel.closed && channel.clock.ElapsedMilliseconds<BootstrapLeaseMs && channel.pipe!=null,"BOOTSTRAP_CLOSED","Channel is closed or expired");
        uint pid,session;
        if(channel.server) { Check(GetNamedPipeClientProcessId(channel.pipe.SafePipeHandle,out pid),"Read persistent client PID");Check(GetNamedPipeClientSessionId(channel.pipe.SafePipeHandle,out session),"Read persistent client session"); }
        else { Check(GetNamedPipeServerProcessId(channel.pipe.SafePipeHandle,out pid),"Read persistent server PID");Check(GetNamedPipeServerSessionId(channel.pipe.SafePipeHandle,out session),"Read persistent server session"); }
        Require(pid==channel.peer.pid,"BOOTSTRAP_PEER_PID","Kernel pipe peer PID changed");
        var actual=BootstrapRecheckPeer(channel.peer);
        Require(S(actual,"os_session")==session.ToString(),"PEER_SESSION","Kernel pipe session changed");
        if(channel.server) {
            var self=Identity(GetCurrentProcess(),GetCurrentProcessId(),true);BootstrapStandard(self,channel.test);
            BootstrapPipeDacl(channel.pipe.SafePipeHandle.DangerousGetHandle(),S(self,"principal"),channel.peer.expected.sid);
        }
        channel.clock.Restart();
        lock(BootstrapGate) {
            BootstrapEndpoint endpoint;if(channel.endpoint!=null && BootstrapEndpoints.TryGetValue(channel.endpoint,out endpoint))endpoint.clock.Restart();
            if(!channel.test)foreach(var lease in BootstrapPinLeases.Values)if(!lease.test && !lease.closed)lease.clock.Restart();
        }
    }
    static object BootstrapChannelResult(BootstrapChannel channel) {
        BootstrapCheckChannel(channel);
        var self=Identity(GetCurrentProcess(),GetCurrentProcessId(),true);
        return Obj("channel_id",channel.id,"endpoint_id",channel.endpoint,"peer",Identity(channel.peer.process,channel.peer.pid,false),"self",Identity(GetCurrentProcess(),GetCurrentProcessId(),false),"peer_image",channel.peer.expected.image,"peer_image_sha256",channel.peer.expected.hash,"peer_authenticated",true,"process_handle_pinned",true,"image_handle_pinned",true,"payload_identity_trusted",false,"standard_account_verified",!channel.test && BootstrapStandard(self,false),"peer_client_rights",BootstrapClientRights,"client_create_instance_right",false,"dacl_sddl",channel.sddl,"max_payload_bytes",BootstrapPayloadLimit,"connection_limit",BootstrapOwnerLimit,"lease_remaining_ms",Math.Max(0,BootstrapLeaseMs-channel.clock.ElapsedMilliseconds),"source",channel.test?"REAL_WINDOWS_PRIMITIVE":"REAL_WINDOWS_BOOTSTRAP_CANDIDATE","release_authority",false);
    }
    static object BootstrapListen(IDictionary p,bool test) {
        if(!test)BootstrapRequireAttested();
        BootstrapFields(p,"name","peer_sid","peer_image","peer_image_sha256","allow_test_appcontainer");
        var endpoint=new BootstrapEndpoint { id=BootstrapNewId("endpoint"),name=BootstrapName(p),expected=BootstrapExpectedPeer(p,test) };
        lock(BootstrapGate) {
            BootstrapExpire();Require(BootstrapEndpoints.Count<BootstrapOwnerLimit,"BOOTSTRAP_ENDPOINT_LIMIT","Native endpoint table is full");
            foreach(var existing in BootstrapEndpoints.Values)Require(existing.name!=endpoint.name,"BOOTSTRAP_PIPE_EXISTS","Owner already has this endpoint");
            try { endpoint.listener=BootstrapNewListener(endpoint,true);BootstrapEndpoints.Add(endpoint.id,endpoint); }
            catch { endpoint.Dispose();throw; }
        }
        return Obj("endpoint_id",endpoint.id,"name",endpoint.name,"dacl_sddl",endpoint.sddl,"first_pipe_instance",true,"remote_clients_rejected",true,"peer_client_rights",BootstrapClientRights,"client_create_instance_right",false,"connection_limit",BootstrapOwnerLimit,"max_payload_bytes",BootstrapPayloadLimit,"lease_ms",BootstrapLeaseMs,"source",test?"REAL_WINDOWS_PRIMITIVE":"REAL_WINDOWS_BOOTSTRAP_CANDIDATE","release_authority",false);
    }
    static object BootstrapAccept(IDictionary p,int deadline,bool test) {
        if(!test)BootstrapRequireAttested();
        BootstrapFields(p,"endpoint_id");BootstrapExpire();BootstrapEndpoint endpoint;string id=S(p,"endpoint_id");
        lock(BootstrapGate) { Require(id!=null && BootstrapEndpoints.TryGetValue(id,out endpoint),"BOOTSTRAP_ENDPOINT_UNKNOWN","Unknown or revoked endpoint");endpoint=BootstrapEndpoints[id];Require(!endpoint.accepting,"BOOTSTRAP_BUSY","An accept is already pending");BootstrapReserveChannel();endpoint.accepting=true; }
        NamedPipeServerStream listener=null;BootstrapChannel channel=null;
        try {
            Require(endpoint.expected.test==test,"BOOTSTRAP_MODE","Primitive endpoint cannot become production");
            lock(endpoint.gate) { Require(!endpoint.closed && endpoint.listener!=null,"BOOTSTRAP_CLOSED","Endpoint is closed");listener=endpoint.listener;endpoint.listener=null; }
            using(var cancel=new CancellationTokenSource(deadline))listener.WaitForConnectionAsync(cancel.Token).GetAwaiter().GetResult();
            uint pid,session;Check(GetNamedPipeClientProcessId(listener.SafePipeHandle,out pid),"Read accepted kernel client PID");Check(GetNamedPipeClientSessionId(listener.SafePipeHandle,out session),"Read accepted kernel client session");
            channel=new BootstrapChannel { id=BootstrapNewId("channel"),endpoint=endpoint.id,name=endpoint.name,sddl=endpoint.sddl,server=true,test=test,pipe=listener };listener=null;
            channel.peer=BootstrapPinPeer(pid,endpoint.expected);Require(S(channel.peer.identity,"os_session")==session.ToString(),"PEER_SESSION","Accepted peer session differs");
            lock(BootstrapGate) {
                Require(!endpoint.closed && endpoint.clock.ElapsedMilliseconds<BootstrapLeaseMs,"BOOTSTRAP_CLOSED","Endpoint was revoked during accept");
                Require(BootstrapChannels.Count<BootstrapOwnerLimit,"BOOTSTRAP_CHANNEL_LIMIT","Native connection table filled during accept");
                BootstrapChannels.Add(channel.id,channel);
                // At four accepted channels, all native instances are occupied.
                // The next listener is created after a channel is closed.
                if(BootstrapChannels.Count<BootstrapOwnerLimit)endpoint.listener=BootstrapNewListener(endpoint,false);
            }
            var result=BootstrapChannelResult(channel);channel=null;return result;
        } catch {
            if(channel!=null) { lock(BootstrapGate)BootstrapDropChannel(channel.id);channel.Dispose(); }
            throw;
        } finally {
            if(listener!=null)listener.Dispose();
            lock(BootstrapGate) {
                BootstrapChannelReservations--;
                endpoint.accepting=false;
                if(!endpoint.closed && endpoint.listener==null && BootstrapChannels.Count<BootstrapOwnerLimit) {
                    // Retain the first-instance anchor through accepted channels;
                    // if all instances were lost, FIRST_PIPE_INSTANCE is required.
                    bool any=false;foreach(var c in BootstrapChannels.Values)if(c.endpoint==endpoint.id)any=true;
                    try { endpoint.listener=BootstrapNewListener(endpoint,!any); }
                    catch { BootstrapDropEndpoint(endpoint.id); }
                }
            }
        }
    }
    static object BootstrapConnect(IDictionary p,int deadline,bool test) {
        if(!test)BootstrapRequireAttested();
        BootstrapFields(p,"name","peer_sid","peer_image","peer_image_sha256","expected_peer","allow_test_appcontainer");BootstrapExpire();
        string name=BootstrapName(p);var expected=BootstrapExpectedPeer(p,test);
        var self=Identity(GetCurrentProcess(),GetCurrentProcessId(),true);BootstrapStandard(self,test);
        if(!test)Require(S(self,"principal")!=expected.sid,"BOOTSTRAP_DISTINCT_SID","Production connection requires distinct account SIDs");
        BootstrapReserveChannel();
        var timer=Stopwatch.StartNew();IntPtr handle=Invalid;SafePipeHandle safe=null;BootstrapChannel channel=null;
        try {
            while(handle==Invalid) {
                Require(timer.ElapsedMilliseconds<deadline,"DEADLINE","Named pipe connection deadline");
                // Explicit access avoids GENERIC_WRITE's create-instance bit.
                // SQOS_PRESENT | SECURITY_ANONYMOUS prevents impersonation.
                handle=CreateFileW("\\\\.\\pipe\\"+name,BootstrapClientRights,0,IntPtr.Zero,3,0x40000000|0x00100000,IntPtr.Zero);
                if(handle==Invalid) {
                    int error=Marshal.GetLastWin32Error();if(error!=231 && error!=2)throw new Win32Exception(error,"Open explicit-rights local pipe client");
                    int remaining=Math.Max(1,deadline-(int)timer.ElapsedMilliseconds);
                    if(!WaitNamedPipeW("\\\\.\\pipe\\"+name,(uint)Math.Min(remaining,100))) {
                        int waitError=Marshal.GetLastWin32Error();if(waitError!=121 && waitError!=2 && waitError!=231)throw new Win32Exception(waitError,"Wait for protected pipe instance");
                        Thread.Sleep(Math.Min(5,remaining));
                    }
                }
            }
            safe=new SafePipeHandle(handle,true);handle=Invalid;
            var stream=new NamedPipeClientStream(PipeDirection.InOut,true,true,safe);safe=null;
            channel=new BootstrapChannel { id=BootstrapNewId("channel"),name=name,server=false,test=test,pipe=stream };
            uint pid,session;Check(GetNamedPipeServerProcessId(stream.SafePipeHandle,out pid),"Read connected kernel server PID");Check(GetNamedPipeServerSessionId(stream.SafePipeHandle,out session),"Read connected kernel server session");
            channel.peer=BootstrapPinPeer(pid,expected);Require(S(channel.peer.identity,"os_session")==session.ToString(),"PEER_SESSION","Connected peer session differs");
            Require(timer.ElapsedMilliseconds<deadline,"DEADLINE","Peer validation exceeded connection deadline");
            lock(BootstrapGate) { Require(BootstrapChannels.Count<BootstrapOwnerLimit,"BOOTSTRAP_CHANNEL_LIMIT","Native connection table filled during connect");BootstrapChannels.Add(channel.id,channel); }
            var result=BootstrapChannelResult(channel);channel=null;return result;
        } catch { if(channel!=null) { lock(BootstrapGate)BootstrapDropChannel(channel.id);channel.Dispose(); }throw; }
        finally { lock(BootstrapGate)BootstrapChannelReservations--;if(safe!=null)safe.Dispose();if(handle!=Invalid)CloseHandle(handle); }
    }
    static async Task BootstrapReadExact(Stream stream,byte[] bytes,CancellationToken cancel) {
        int offset=0;while(offset<bytes.Length) { int read=await stream.ReadAsync(bytes,offset,bytes.Length-offset,cancel).ConfigureAwait(false);Require(read>0,"BOOTSTRAP_PIPE_EOF","Peer disconnected inside a frame");offset+=read; }
    }
    static object BootstrapReadWrite(IDictionary p,int deadline,bool test,bool write) {
        BootstrapFields(p,write?new[]{"channel_id","payload_base64"}:new[]{"channel_id"});
        var channel=BootstrapGetChannel(p,test);bool entered=Monitor.TryEnter(channel.gate);
        Require(entered,"BOOTSTRAP_BUSY","Only one request may own this channel");
        try {
            BootstrapCheckChannel(channel);
            using(var cancel=new CancellationTokenSource(deadline)) {
                if(write) {
                    string encoded=S(p,"payload_base64");Require(encoded!=null && encoded.Length<=32768,"BOOTSTRAP_FRAME_LIMIT","Pipe payload exceeds 24KiB");
                    byte[] payload=Convert.FromBase64String(encoded);Require(payload.Length<=BootstrapPayloadLimit && Convert.ToBase64String(payload)==encoded,"BOOTSTRAP_FRAME_LIMIT","Noncanonical or oversized pipe payload");
                    var frame=new byte[payload.Length+4];frame[0]=(byte)(payload.Length>>24);frame[1]=(byte)(payload.Length>>16);frame[2]=(byte)(payload.Length>>8);frame[3]=(byte)payload.Length;Buffer.BlockCopy(payload,0,frame,4,payload.Length);
                    channel.pipe.WriteAsync(frame,0,frame.Length,cancel.Token).GetAwaiter().GetResult();channel.pipe.FlushAsync(cancel.Token).GetAwaiter().GetResult();
                    BootstrapCheckChannel(channel);return Obj("channel_id",channel.id,"bytes",payload.Length,"written",true,"peer_authenticated",true,"source",test?"REAL_WINDOWS_PRIMITIVE":"REAL_WINDOWS_BOOTSTRAP_CANDIDATE","release_authority",false);
                }
                byte[] length=new byte[4];BootstrapReadExact(channel.pipe,length,cancel.Token).GetAwaiter().GetResult();
                uint size=((uint)length[0]<<24)|((uint)length[1]<<16)|((uint)length[2]<<8)|length[3];Require(size<=BootstrapPayloadLimit,"BOOTSTRAP_FRAME_LIMIT","Incoming pipe frame exceeds 24KiB");
                byte[] bytes=new byte[size];BootstrapReadExact(channel.pipe,bytes,cancel.Token).GetAwaiter().GetResult();
                BootstrapCheckChannel(channel);return Obj("channel_id",channel.id,"payload_base64",Convert.ToBase64String(bytes),"bytes",bytes.Length,"peer_authenticated",true,"source",test?"REAL_WINDOWS_PRIMITIVE":"REAL_WINDOWS_BOOTSTRAP_CANDIDATE","release_authority",false);
            }
        } catch {
            // Cancellation/EOF/invalid frames revoke this connection. A timeout
            // never leaves a partially consumed frame available for retry.
            lock(BootstrapGate)BootstrapDropChannel(channel.id);throw;
        } finally { Monitor.Exit(channel.gate); }
    }
    static object BootstrapClose(IDictionary p,bool test) {
        BootstrapFields(p,"channel_id","endpoint_id");string channelId=S(p,"channel_id"),endpointId=S(p,"endpoint_id");
        Require((channelId!=null) != (endpointId!=null),"BOOTSTRAP_FIELDS","Close exactly one channel or endpoint");
        lock(BootstrapGate) {
            if(channelId!=null) {
                BootstrapChannel channel;Require(BootstrapChannels.TryGetValue(channelId,out channel),"BOOTSTRAP_CHANNEL_UNKNOWN","Unknown or revoked channel");Require(channel.test==test,"BOOTSTRAP_MODE","Primitive channel cannot use production close");string owner=channel.endpoint;BootstrapDropChannel(channelId);
                BootstrapEndpoint endpoint;if(owner!=null && BootstrapEndpoints.TryGetValue(owner,out endpoint) && endpoint.listener==null && !endpoint.accepting && !endpoint.closed) {
                    bool any=false;foreach(var c in BootstrapChannels.Values)if(c.endpoint==owner)any=true;
                    try { endpoint.listener=BootstrapNewListener(endpoint,!any); }catch { BootstrapDropEndpoint(owner);throw; }
                }
            } else {
                BootstrapEndpoint endpoint;Require(BootstrapEndpoints.TryGetValue(endpointId,out endpoint),"BOOTSTRAP_ENDPOINT_UNKNOWN","Unknown or revoked endpoint");Require(endpoint.expected.test==test,"BOOTSTRAP_MODE","Primitive endpoint cannot use production close");BootstrapDropEndpoint(endpointId);
            }
        }
        return Obj("closed",true,"channel_id",channelId,"endpoint_id",endpointId,"source",test?"REAL_WINDOWS_PRIMITIVE":"REAL_WINDOWS_BOOTSTRAP_CANDIDATE","release_authority",false);
    }
    static BootstrapPinnedFile BootstrapPinFile(IDictionary p) {
        BootstrapFields(p,"path","sha256","directory","sddl","owner_sid");
        Require(Get(p,"directory") is bool,"BOOTSTRAP_PIN","Pin directory kind must be explicit");
        var pin=new BootstrapPinnedFile { path=BootstrapImage(S(p,"path")),directory=(bool)p["directory"],owner=BootstrapSid(S(p,"owner_sid")) };
        if(!pin.directory)pin.hash=BootstrapDigest(S(p,"sha256"));else Require(Get(p,"sha256")==null,"BOOTSTRAP_PIN","A directory has no content SHA256");
        string supplied=S(p,"sddl");Require(supplied!=null && supplied.Length<=16384,"BOOTSTRAP_DACL","Exact protected owner/group/DACL is required");
        var expected=new RawSecurityDescriptor(supplied);
        Require(expected.Owner!=null && expected.Group!=null && expected.Owner.Value==pin.owner && expected.DiscretionaryAcl!=null && (expected.ControlFlags&ControlFlags.DiscretionaryAclProtected)!=0 && expected.SystemAcl==null,"BOOTSTRAP_DACL","Pin requires exact O/G/protected DACL and no unverifiable SACL");
        pin.sddl=expected.GetSddlForm(AccessControlSections.Owner|AccessControlSections.Group|AccessControlSections.Access);
        try {
            pin.anchor=Anchor(pin.path,pin.directory);pin.id=FileId(FileInfo(pin.anchor.Leaf,pin.directory));
            // Anchor prevents component rename/write/delete; this separate handle
            // adds READ_CONTROL without changing the existing Relative contract.
            pin.security=CreateFileW(pin.path,0x00120080,1,IntPtr.Zero,3,0x02000000|0x00200000,IntPtr.Zero);Check(pin.security!=Invalid,"Open read-control security pin");
            BootstrapCheckPin(pin);return pin;
        } catch { if(pin.security==Invalid)pin.security=IntPtr.Zero;pin.Dispose();throw; }
    }
    static void BootstrapCheckPin(BootstrapPinnedFile pin) {
        Require(FileId(FileInfo(pin.anchor.Leaf,pin.directory))==pin.id && FileId(FileInfo(pin.security,pin.directory))==pin.id,"BOOTSTRAP_PIN_CHANGED","Security handle and anchored object differ");
        Require(String.Equals(FinalPath(pin.anchor.Leaf),FinalPath(pin.security),StringComparison.OrdinalIgnoreCase),"BOOTSTRAP_PIN_CHANGED","Security and anchored paths differ");
        var descriptor=BootstrapSecurity(pin.security,1);
        Require(descriptor.Owner!=null && descriptor.Owner.Value==pin.owner && descriptor.GetSddlForm(AccessControlSections.Owner|AccessControlSections.Group|AccessControlSections.Access)==pin.sddl,"BOOTSTRAP_DACL_CHANGED","Pinned exact owner/group/protected DACL differs");
        if(!pin.directory)Require(BootstrapHashFile(pin.anchor.Leaf)==pin.hash,"BOOTSTRAP_PIN_HASH","Pinned file hash differs");
    }
    static object BootstrapAttest(IDictionary p,bool test) {
        BootstrapFields(p,"expected_sid","process_id","pins");BootstrapExpire();
        if(!test)Require(!BootstrapProductionRevoked,"BOOTSTRAP_ATTESTATION_REVOKED","A production pin lease was lost; use a fresh trusted helper");
        string sid=BootstrapSid(S(p,"expected_sid"));uint parent=(uint)N(p,"process_id",0,1,Int32.MaxValue);
        Require(ParentPid(GetCurrentProcess())==parent,"BOOTSTRAP_PARENT_PID","Requested process is not this helper's actual kernel parent");
        var self=Identity(GetCurrentProcess(),GetCurrentProcessId(),true);Require(S(self,"principal")==sid,"BOOTSTRAP_PEER_SID","Helper SID differs from trusted configuration");BootstrapStandard(self,test);
        var requested=Get(p,"pins") as IList;Require(requested!=null && requested.Count>0 && requested.Count<=64,"BOOTSTRAP_PIN_LIMIT","Attestation needs one to sixty-four exact pins within the bounded RPC frame");
        var lease=new BootstrapPins { id=BootstrapNewId("pins"),sid=sid,test=test };
        lock(BootstrapGate) { Require(BootstrapPinLeases.Count+BootstrapPinReservations<BootstrapOwnerLimit,"BOOTSTRAP_PIN_LIMIT","Live and pending pin leases fill this owner");BootstrapPinReservations++; }
        try {
            IntPtr parentHandle=OpenProcess(QUERY|SYNCHRONIZE,false,parent);Check(parentHandle!=IntPtr.Zero,"Observe actual Node parent");string image;
            try { var identity=Identity(parentHandle,parent,true);Require(S(identity,"principal")==sid,"BOOTSTRAP_PEER_SID","Kernel parent SID differs");BootstrapStandard(identity,test);image=BootstrapProcessImage(parentHandle); }
            finally { CloseHandle(parentHandle); }
            string imageHash=null;var paths=new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach(object entry in requested) {
                var definition=entry as IDictionary;Require(definition!=null,"BOOTSTRAP_PIN","Invalid pin object");var pin=BootstrapPinFile(definition);
                if(!paths.Add(pin.path)) { pin.Dispose();throw new BoundaryException("BOOTSTRAP_PIN","Duplicate pinned path"); }
                lease.pins.Add(pin);
                if(!pin.directory && String.Equals(pin.path,image,StringComparison.OrdinalIgnoreCase))imageHash=pin.hash;
            }
            Require(imageHash!=null,"BOOTSTRAP_PARENT_IMAGE_PIN_REQUIRED","Pins must include the actual parent Node image and expected hash");
            lease.parent=BootstrapPinPeer(parent,new BootstrapExpected { sid=sid,image=image,hash=imageHash,test=test });
            lock(BootstrapGate) { Require(BootstrapPinLeases.Count<BootstrapOwnerLimit,"BOOTSTRAP_PIN_LIMIT","Native pin table filled during attestation");BootstrapPinLeases.Add(lease.id,lease); }
            var result=BootstrapPinsResult(lease);lease=null;return result;
        } catch { if(lease!=null) { lock(BootstrapGate) { if(!test)BootstrapProductionRevoked=true;BootstrapPinLeases.Remove(lease.id); }lease.Dispose(); }throw; }
        finally { lock(BootstrapGate)BootstrapPinReservations--; }
    }
    static object BootstrapPinsResult(BootstrapPins lease) {
        BootstrapWatchParent();
        Require(!lease.closed && lease.clock.ElapsedMilliseconds<BootstrapLeaseMs,"BOOTSTRAP_CLOSED","Pin lease expired or revoked");
        BootstrapRecheckPeer(lease.parent);var pins=new List<object>();
        foreach(var pin in lease.pins) { BootstrapCheckPin(pin);pins.Add(Obj("directory",pin.directory,"sha256",pin.hash,"file_id",pin.id,"security_verified",true,"handles_pinned",true)); }
        lease.clock.Restart();
        return Obj("pin_id",lease.id,"process",Identity(lease.parent.process,lease.parent.pid,false),"helper",Identity(GetCurrentProcess(),GetCurrentProcessId(),false),"os_version",Environment.OSVersion.VersionString,"image_path",lease.parent.expected.image,"image_sha256",lease.parent.expected.hash,"standard_account_verified",!lease.test,"pin_count",pins.Count,"pins",pins,"lease_remaining_ms",Math.Max(0,BootstrapLeaseMs-lease.clock.ElapsedMilliseconds),"source",lease.test?"REAL_WINDOWS_PRIMITIVE":"REAL_WINDOWS_BOOTSTRAP_CANDIDATE","release_authority",false);
    }

    // Storage inspection reads security metadata only. File data handles are
    // never pinned: SQLite/-wal/-shm may remain mutable by the trusted Host.
    // Directory handles fix every traversed ancestor, and children are opened
    // by NtCreateFile relative to that exact parent handle, without following
    // reparse points. The allowed principals (including the Host) form the TCB;
    // this is a bounded security snapshot, not an atomic filesystem snapshot.
    sealed class BootstrapStorageState : IDisposable {
        public int objects,deadline,discovered=1;
        public string owner;
        public readonly Stopwatch clock=Stopwatch.StartNew();
        public HashSet<string> allowed;
        public readonly IncrementalHash manifest=IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        public void Dispose() { manifest.Dispose(); }
        public void CheckDeadline() { Require(clock.ElapsedMilliseconds<deadline,"DEADLINE","Private storage ACL inspection exceeded its deadline"); }
        public void Field(string value) {
            byte[] bytes=Utf8.GetBytes(value);uint size=(uint)bytes.Length;
            manifest.AppendData(new[]{(byte)(size>>24),(byte)(size>>16),(byte)(size>>8),(byte)size});manifest.AppendData(bytes);
        }
    }
    static void BootstrapStoragePinnedRoot(string root) {
        bool found=false;
        lock(BootstrapGate)foreach(var lease in BootstrapPinLeases.Values) {
            if(lease.test || lease.closed || lease.clock.ElapsedMilliseconds>=BootstrapLeaseMs)continue;
            foreach(var pin in lease.pins)if(pin.directory && String.Equals(pin.path,root,StringComparison.OrdinalIgnoreCase))found=true;
        }
        Require(found,"BOOTSTRAP_STORAGE_ROOT_PIN","Private storage root must have a live exact production directory pin");
    }
    static IntPtr BootstrapStorageRelative(IntPtr parent,string name,bool directoryPin) {
        Require(Components(name).Length==1,"BOOTSTRAP_STORAGE_PATH","Storage entry must be one safe relative component");
        IntPtr text=Marshal.StringToHGlobalUni(name),unicode=Marshal.AllocHGlobal(Marshal.SizeOf<UNICODE_STRING>());
        try {
            var value=new UNICODE_STRING { length=(ushort)(name.Length*2),maximum=(ushort)(name.Length*2+2),buffer=text };Marshal.StructureToPtr(value,unicode,false);
            var attributes=new OBJECT_ATTRIBUTES { length=(uint)Marshal.SizeOf<OBJECT_ATTRIBUTES>(),root=parent,name=unicode,attributes=0x40|0x1000 };
            IO_STATUS_BLOCK status;IntPtr handle;
            // READ_CONTROL | SYNCHRONIZE | FILE_READ_ATTRIBUTES, no data/write.
            // Temporary file metadata handles share R/W/D for live SQLite. A
            // directory is reopened with share-read only before descending.
            int result=NtCreateFile(out handle,0x00120080,ref attributes,out status,IntPtr.Zero,0x80,directoryPin?1u:7u,1,0x200000|0x20|(directoryPin?1u:0u),IntPtr.Zero,0);
            if(result<0)throw new Win32Exception((int)RtlNtStatusToDosError(result),"Open root-relative storage metadata without following links");
            return handle;
        } finally { Marshal.FreeHGlobal(unicode);Marshal.FreeHGlobal(text); }
    }
    static BY_HANDLE_FILE_INFORMATION BootstrapStorageInfo(IntPtr handle) {
        BY_HANDLE_FILE_INFORMATION info;Check(GetFileInformationByHandle(handle,out info),"Read storage object identity");
        Require(GetFileType(handle)==1 && (info.attributes&0x400)==0,"BOOTSTRAP_STORAGE_LINK","Storage object is not a plain disk object or is a reparse point");
        if((info.attributes&0x10)==0)Require(info.links==1,"BOOTSTRAP_STORAGE_HARDLINK","Storage files must have exactly one hard link");
        return info;
    }
    static string BootstrapStorageDescriptor(IntPtr handle,BootstrapStorageState state,out string owner) {
        var descriptor=BootstrapSecurity(handle,1,false);
        Require(descriptor.Owner!=null && state.allowed.Contains(descriptor.Owner.Value),"BOOTSTRAP_STORAGE_OWNER","Storage owner is outside the trusted principal set");owner=descriptor.Owner.Value;
        foreach(GenericAce raw in descriptor.DiscretionaryAcl) {
            var ace=raw as CommonAce;
            Require(ace!=null && !ace.IsCallback && ace.SecurityIdentifier!=null && (ace.AceQualifier==AceQualifier.AccessAllowed || ace.AceQualifier==AceQualifier.AccessDenied) && (((int)ace.AceFlags)&~31)==0,"BOOTSTRAP_STORAGE_ACE","Unknown, callback, object, conditional or audit ACE is not accepted");
            // Inherit-only ALLOWs also grant descendants and must be trusted.
            // A normal DENY for another SID grants no access and is permitted.
            if(ace.AceQualifier==AceQualifier.AccessAllowed && ace.AccessMask!=0)Require(state.allowed.Contains(ace.SecurityIdentifier.Value),"BOOTSTRAP_STORAGE_ACL","Storage DACL grants an untrusted principal access");
        }
        return descriptor.GetSddlForm(AccessControlSections.Owner|AccessControlSections.Group|AccessControlSections.Access);
    }
    static void BootstrapStorageWalk(IntPtr handle,string relative,int depth,BootstrapStorageState state) {
        state.CheckDeadline();Require(depth<=64,"BOOTSTRAP_STORAGE_DEPTH","Private storage exceeds bounded traversal depth");
        Require(state.objects<4096,"BOOTSTRAP_STORAGE_LIMIT","Private storage exceeds 4096 objects");
        var before=BootstrapStorageInfo(handle);bool directory=(before.attributes&0x10)!=0;
        string owner;string sddl=BootstrapStorageDescriptor(handle,state,out owner);state.CheckDeadline();state.objects++;
        if(relative==".")state.owner=owner;
        state.Field(relative);state.Field(directory?"DIRECTORY":"FILE");state.Field(FileId(before));state.Field(sddl);state.Field(owner);
        if(directory) {
            var names=new List<string>();
            // This pathname comes from the retained native directory handle;
            // its ancestry cannot be renamed/deleted while enumeration runs.
            foreach(string entry in Directory.EnumerateFileSystemEntries(FinalPath(handle))) {
                state.CheckDeadline();Require(state.discovered<4096,"BOOTSTRAP_STORAGE_LIMIT","Private storage exceeds 4096 discovered objects");state.discovered++;
                string name=Path.GetFileName(entry);Require(Components(name).Length==1,"BOOTSTRAP_STORAGE_PATH","Invalid enumerated child component");names.Add(name);
            }
            names.Sort(StringComparer.Ordinal);
            foreach(string name in names) {
                state.CheckDeadline();IntPtr child=BootstrapStorageRelative(handle,name,false);
                try {
                    var observed=BootstrapStorageInfo(child);
                    if((observed.attributes&0x10)!=0) {
                        IntPtr pinned=BootstrapStorageRelative(handle,name,true);
                        try { Require(FileId(BootstrapStorageInfo(pinned))==FileId(observed),"BOOTSTRAP_STORAGE_CHANGED","Storage directory changed before ancestor pinning"); }
                        catch { CloseHandle(pinned);throw; }
                        CloseHandle(child);child=pinned;
                    }
                    BootstrapStorageWalk(child,relative=="."?name:relative+"/"+name,depth+1,state);
                } finally { CloseHandle(child); }
            }
        }
        state.CheckDeadline();var after=BootstrapStorageInfo(handle);string afterOwner;string afterSddl=BootstrapStorageDescriptor(handle,state,out afterOwner);
        Require(FileId(before)==FileId(after) && before.creation.Value==after.creation.Value && before.attributes==after.attributes && before.links==after.links && owner==afterOwner && sddl==afterSddl,"BOOTSTRAP_STORAGE_CHANGED","Storage object identity/type/links/owner/DACL changed during inspection");
        // Data size and last-write time are intentionally not content evidence:
        // this owner-only RPC never reads mutable database or artifact bytes.
        state.CheckDeadline();
    }
    static object BootstrapStorageInspect(IDictionary p,int deadline) {
        var requestClock=Stopwatch.StartNew();BootstrapFields(p,"root","allowed_principals");BootstrapRequireAttested();
        string root=BootstrapImage(S(p,"root"));BootstrapStoragePinnedRoot(root);
        var principals=Get(p,"allowed_principals") as IList;Require(principals!=null && principals.Count>0 && principals.Count<=16,"BOOTSTRAP_STORAGE_PRINCIPALS","One to sixteen explicit trusted principals are required");
        var allowed=new HashSet<string>(StringComparer.Ordinal);
        foreach(object principal in principals) { Require(principal is string,"BOOTSTRAP_STORAGE_PRINCIPALS","Storage principals must be SID strings");Require(allowed.Add(BootstrapSid((string)principal)),"BOOTSTRAP_STORAGE_PRINCIPALS","Duplicate trusted storage principal"); }
        int remaining=deadline-(int)requestClock.ElapsedMilliseconds;Require(remaining>0,"DEADLINE","Storage attestation and parameter validation exhausted the deadline");
        using(var state=new BootstrapStorageState { allowed=allowed,deadline=remaining })
        using(var anchor=Anchor(root,true)) {
            state.Field("agentnexus/storage-acl/1");state.Field(root);
            IntPtr security=CreateFileW(root,0x00120080,1,IntPtr.Zero,3,0x02000000|0x00200000,IntPtr.Zero);Check(security!=Invalid,"Open pinned storage root security metadata");
            try {
                Require(FileId(BootstrapStorageInfo(security))==FileId(FileInfo(anchor.Leaf,true)) && String.Equals(FinalPath(security),FinalPath(anchor.Leaf),StringComparison.OrdinalIgnoreCase),"BOOTSTRAP_STORAGE_CHANGED","Storage root metadata handle differs from its anchor");
                BootstrapStorageWalk(security,".",0,state);
                BootstrapRequireAttested();BootstrapStoragePinnedRoot(root);state.CheckDeadline();
                string manifest=BitConverter.ToString(state.manifest.GetHashAndReset()).Replace("-","").ToLowerInvariant();
                return Obj("safe",true,"objects",state.objects,"manifest_sha256",manifest,"owner_sid",state.owner,"security_sections","OWNER_GROUP_DACL","snapshot_basis","Root/code pins retained; allowed principals and the same Host account are trusted mutators; no untrusted path/ACL writer is admitted; not an atomic filesystem/content snapshot","manifest_format","SHA256 length-prefixed UTF-8 fields; depth-first ordinal sibling order; relative path/type/file_id/normalized O-G-D SDDL/owner","source","REAL_WINDOWS_BOOTSTRAP_CANDIDATE","release_authority",false);
            } finally { CloseHandle(security); }
        }
    }
    public static object BootstrapDispatch(IDictionary request) {
        string op=S(request,"op");int deadline=N(request,"deadline_ms",5000,1,30000);var p=Get(request,"params") as IDictionary;
        Require(p!=null,"BOOTSTRAP_FIELDS","Bootstrap params must be an object");
        if(Interlocked.Increment(ref BootstrapRequests)>8) { Interlocked.Decrement(ref BootstrapRequests);throw new BoundaryException("BOOTSTRAP_REQUEST_LIMIT","At most eight unfinished bootstrap calls"); }
        try {
            BootstrapWatchParent();
            bool test=op!=null && op.StartsWith("bootstrap.testpipe.",StringComparison.Ordinal);
            if(op=="bootstrap.attest")return BootstrapAttest(p,false);
            if(op=="bootstrap.testattest")return BootstrapAttest(p,true);
            if(op=="bootstrap.storage.inspect")return BootstrapStorageInspect(p,deadline);
            if(op=="bootstrap.unpin" || op=="bootstrap.pin.inspect" || op=="bootstrap.testunpin" || op=="bootstrap.testpin.inspect") {
                BootstrapFields(p,"pin_id");BootstrapExpire();string id=S(p,"pin_id");BootstrapPins lease;
                lock(BootstrapGate) { Require(id!=null && BootstrapPinLeases.TryGetValue(id,out lease),"BOOTSTRAP_PIN_UNKNOWN","Unknown or revoked pin lease");lease=BootstrapPinLeases[id]; }
                Require(lease.test==op.StartsWith("bootstrap.test",StringComparison.Ordinal),"BOOTSTRAP_MODE","Primitive pin lease cannot become production");
                lock(lease.gate) {
                    if(op.EndsWith("unpin",StringComparison.Ordinal)) { lock(BootstrapGate) { if(!lease.test)BootstrapProductionRevoked=true;BootstrapPinLeases.Remove(id); }lease.Dispose();return Obj("unpinned",true,"pin_id",id,"release_authority",false); }
                    try { return BootstrapPinsResult(lease); }catch { lock(BootstrapGate) { if(!lease.test)BootstrapProductionRevoked=true;BootstrapPinLeases.Remove(id); }lease.Dispose();throw; }
                }
            }
            Require(op!=null && (test || op.StartsWith("bootstrap.pipe.",StringComparison.Ordinal)),"UNKNOWN_OPERATION","Unknown bootstrap operation");
            string action=op.Substring(test?19:15);
            switch(action) {
                case "listen":return BootstrapListen(p,test);
                case "accept":return BootstrapAccept(p,deadline,test);
                case "connect":return BootstrapConnect(p,deadline,test);
                case "read":return BootstrapReadWrite(p,deadline,test,false);
                case "write":return BootstrapReadWrite(p,deadline,test,true);
                case "peer":BootstrapFields(p,"channel_id");var channel=BootstrapGetChannel(p,test);lock(channel.gate) { try { return BootstrapChannelResult(channel); }catch { lock(BootstrapGate)BootstrapDropChannel(channel.id);throw; } }
                case "close":return BootstrapClose(p,test);
                default:throw new BoundaryException("UNKNOWN_OPERATION","Unknown bootstrap operation");
            }
        } finally { Interlocked.Decrement(ref BootstrapRequests); }
    }
    public static void BootstrapShutdown() {
        lock(BootstrapGate) {
            BootstrapStopped=true;
            foreach(var endpoint in BootstrapEndpoints.Values)endpoint.Dispose();BootstrapEndpoints.Clear();
            foreach(var channel in BootstrapChannels.Values)channel.Dispose();BootstrapChannels.Clear();
            foreach(var lease in BootstrapPinLeases.Values)lease.Dispose();BootstrapPinLeases.Clear();
            if(BootstrapParentHandle!=IntPtr.Zero) { CloseHandle(BootstrapParentHandle);BootstrapParentHandle=IntPtr.Zero; }
        }
    }
}
