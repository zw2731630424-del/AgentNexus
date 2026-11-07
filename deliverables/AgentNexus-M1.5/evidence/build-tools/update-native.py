from pathlib import Path
p=Path('I:/AI_AgentNexus/deliverables/AgentNexus-M1.5/source/src/agentnexus/production/windows/NativeRuntime.cs')
s=p.read_text('utf-8')
def replace(a,b):
    global s
    assert s.count(a)==1, (s.count(a),a[:100]);s=s.replace(a,b)
replace('item.consumed=true;item.runDeadline=deadline;item.commit.Set();', 'item.bootstrapInput=Convert.FromBase64String(S(p,"bootstrap_input_base64",""));Require(item.bootstrapInput.Length<=16384,"BOOTSTRAP_LIMIT","Private Worker bootstrap exceeds 16KiB");item.consumed=true;item.runDeadline=deadline;item.commit.Set();')
replace('Check(CreatePipe(out inRead,out inWrite,ref sa,4096),"Create stdin pipe")','Check(CreatePipe(out inRead,out inWrite,ref sa,32768),"Create stdin pipe")')
replace(';CloseHandle(inWrite);inWrite=IntPtr.Zero;',';')
replace('Action overflow=delegate{', 'byte[] bootstrap=prepared==null?new byte[0]:prepared.bootstrapInput;using(var input=new FileStream(new SafeFileHandle(inWrite,true),FileAccess.Write,32768,false)){inWrite=IntPtr.Zero;if(bootstrap.Length>0){input.Write(bootstrap,0,bootstrap.Length);input.Flush();}}\n                Action overflow=delegate{')
replace('foreach(var entry in pinned){uint code;', '''var parentIdentities=new Dictionary<uint,IDictionary>();bool parentageComplete=true;
                foreach(var entry in pinned){try{uint parentId=ParentPid(entry.Value);if(entry.Key==pi.pid){Require(parentId==Convert.ToUInt32(self["pid"]),"PARENT_OBSERVATION","Root kernel parent differs from launcher");parentIdentities.Add(entry.Key,self);}else{IntPtr parentHandle;Require(pinned.TryGetValue(parentId,out parentHandle),"PARENT_OBSERVATION","An observed child has an unobserved parent");var parentIdentity=Identity(parentHandle,parentId,false);var childIdentity=Identity(entry.Value,entry.Key,false);Require(Int64.Parse(S(parentIdentity,"start_id"))<=Int64.Parse(S(childIdentity,"start_id")),"PARENT_OBSERVATION","Parent PID was reused");parentIdentities.Add(entry.Key,parentIdentity);}}catch{parentageComplete=false;}}
                foreach(var entry in pinned){uint code;''')
replace('"parent_identity",entry.Key==pi.pid?(object)self:null,"parentage_verified",entry.Key==pi.pid', '"parent_identity",parentIdentities.ContainsKey(entry.Key)?(object)parentIdentities[entry.Key]:null,"parentage_verified",parentIdentities.ContainsKey(entry.Key)')
replace('var cpuUsage=JobGet<JOB_ACCOUNTING>(job,1);uint rootCode;', 'var cpuUsage=JobGet<JOB_ACCOUNTING>(job,1);bool historyComplete=empty&&!snapshotLost&&cpuUsage.activeProcesses==0&&cpuUsage.totalProcesses==(uint)pinned.Count;uint rootCode;')
replace('"membership_complete",false,"membership_basis","bounded current snapshots do not prove historical membership"', '"membership_complete",false,"history_complete_observed",historyComplete,"historical_assigned_processes",cpuUsage.totalProcesses,"historical_pinned_processes",pinned.Count,"active_processes_final",cpuUsage.activeProcesses,"parentage_verified_complete",parentageComplete,"membership_basis","Final Job TotalProcesses must equal all retained pinned identities; missing short-lived members remain unverified"')
p.write_text(s,encoding='utf-8',newline='\n')
print('Updated M1.5 native history and bounded private stdin bootstrap')
