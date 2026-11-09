// Production Helper only. Changes its own live kernel objects after full
// deployment/identity verification, before a pipe or any credential input.
// This does not revoke preexisting handles or close startup races. It is not
// proof of memory isolation, and is excluded from the synthetic UI executable.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text.RegularExpressions;

namespace AgentNexus.CredentialBoundary
{
    internal static class HelperObjectSecurity
    {
        internal const int ServiceProcessRights = 0x00101000; // QUERY_LIMITED_INFORMATION | SYNCHRONIZE
        internal const int ServiceTokenRights = 0x00000008; // TOKEN_QUERY; no duplicate/impersonate/adjust
        private const string AdminSid = "S-1-5-32-544", SystemSid = "S-1-5-18";
        private const uint OwnerAndDacl = 0x00000005, ProtectedOwnerAndDacl = 0x80000005;

        internal static bool AssignableAdminOwner(uint attributes)
        {
            // SE_GROUP_ENABLED | SE_GROUP_OWNER, and never DENY_ONLY.
            return (attributes & 0x0c) == 0x0c && (attributes & 0x10) == 0;
        }
        private static int AdminRights(string kind)
        {
            if (kind == "PROCESS" || kind == "THREAD") return 0x001fffff;
            if (kind == "TOKEN") return 0x000f01ff;
            Json.Require(kind == "DEFAULT", "HELPER_OBJECT_KIND_REJECTED");
            return 0x10000000; // Generic all is mapped by each new kernel object's type.
        }
        internal static RawSecurityDescriptor Descriptor(string serviceSid, string kind)
        {
            Json.Require(serviceSid != null && Regex.IsMatch(serviceSid, @"\AS-1-5-80-[0-9]+-[0-9]+-[0-9]+-[0-9]+-[0-9]+\z", RegexOptions.CultureInvariant), "HELPER_SERVICE_SID_REJECTED");
            Json.Require(new SecurityIdentifier(serviceSid).Value == serviceSid, "HELPER_SERVICE_SID_REJECTED");
            int all = AdminRights(kind);
            string acl = "O:BAD:P(A;;0x" + all.ToString("x8", CultureInfo.InvariantCulture) + ";;;SY)(A;;0x" + all.ToString("x8", CultureInfo.InvariantCulture) + ";;;BA)";
            if (kind == "PROCESS" || kind == "TOKEN")
                acl += "(A;;0x" + (kind == "PROCESS" ? ServiceProcessRights : ServiceTokenRights).ToString("x8", CultureInfo.InvariantCulture) + ";;;" + serviceSid + ")";
            return new RawSecurityDescriptor(acl);
        }
        internal static void RequireDescriptor(RawSecurityDescriptor descriptor, string serviceSid, string kind)
        {
            Json.Require(descriptor != null && descriptor.Owner != null && descriptor.Owner.Value == AdminSid && (descriptor.ControlFlags & ControlFlags.DiscretionaryAclProtected) != 0, "HELPER_OBJECT_OWNER_OR_DACL_REJECTED");
            RequireAcl(descriptor.DiscretionaryAcl, serviceSid, kind);
        }
        private static void RequireAcl(RawAcl acl, string serviceSid, string kind)
        {
            Dictionary<string, int> expected = new Dictionary<string, int> { { SystemSid, AdminRights(kind) }, { AdminSid, AdminRights(kind) } };
            if (kind == "PROCESS" || kind == "TOKEN") expected.Add(serviceSid, kind == "PROCESS" ? ServiceProcessRights : ServiceTokenRights);
            Json.Require(acl != null && acl.Count == expected.Count, "HELPER_OBJECT_DACL_REJECTED");
            foreach (GenericAce raw in acl)
            {
                CommonAce ace = raw as CommonAce;
                int rights;
                Json.Require(ace != null && ace.AceQualifier == AceQualifier.AccessAllowed && ace.AceFlags == AceFlags.None && expected.TryGetValue(ace.SecurityIdentifier.Value, out rights) && ace.AccessMask == rights, "HELPER_OBJECT_DACL_REJECTED");
                expected.Remove(ace.SecurityIdentifier.Value);
            }
            Json.Require(expected.Count == 0, "HELPER_OBJECT_DACL_REJECTED");
        }

        internal static void Prepare(Deployment deployment)
        {
            Json.Require(deployment != null, "HELPER_DEPLOYMENT_REQUIRED");
            TokenFacts.RequireOperator(TokenFacts.Current(), deployment.OperatorSid);
            deployment.RequireCurrentApproval();
            // Validate every descriptor before modifying any live object.
            foreach (string kind in new[] { "PROCESS", "TOKEN", "THREAD", "DEFAULT" }) RequireDescriptor(Descriptor(deployment.ServiceSid, kind), deployment.ServiceSid, kind);
            IntPtr token;
            // READ_CONTROL | WRITE_DAC | WRITE_OWNER | TOKEN_ADJUST_DEFAULT | TOKEN_QUERY.
            Win32.Check(Win32.OpenProcessToken(Win32.GetCurrentProcess(), 0x000e0088, out token), "HELPER_OWN_TOKEN_SECURITY_UNAVAILABLE");
            try
            {
                RequireAssignableAdmin(token);
                // Future unnamed WinForms/CLR objects also receive BA/SY-only
                // defaults. This is local token state, not a system policy.
                // The elevated Helper retains full rights through enabled BA.
                SetDefaults(token, deployment.ServiceSid);
                Apply(token, deployment.ServiceSid, "TOKEN");
                Apply(Win32.GetCurrentProcess(), deployment.ServiceSid, "PROCESS");
                using (Process own = Process.GetCurrentProcess())
                {
                    foreach (ProcessThread thread in own.Threads)
                    {
                        using (thread)
                        {
                            IntPtr handle = OpenThread(0x000e0800, false, (uint)thread.Id); // security rights + QUERY_LIMITED_INFORMATION
                            if (handle == IntPtr.Zero)
                            {
                                // A thread that has already exited owns no live
                                // object to protect; all other failures block.
                                Json.Require(Marshal.GetLastWin32Error() == 87, "HELPER_OWN_THREAD_SECURITY_UNAVAILABLE");
                                continue;
                            }
                            try
                            {
                                Json.Require(GetProcessIdOfThread(handle) == (uint)own.Id, "HELPER_THREAD_ID_REUSED");
                                Apply(handle, deployment.ServiceSid, "THREAD");
                            }
                            finally { Win32.CloseHandle(handle); }
                        }
                    }
                }
            }
            finally { Win32.CloseHandle(token); }
        }
        private static void RequireAssignableAdmin(IntPtr token)
        {
            IntPtr groups = Win32.TokenInfo(token, 2);
            try
            {
                int count = Marshal.ReadInt32(groups);
                Json.Require(count > 0 && count <= 4096, "HELPER_ADMIN_OWNER_REQUIRED");
                int offset = (int)Marshal.OffsetOf(typeof(GroupHeader), "First");
                int stride = Marshal.SizeOf(typeof(SidAndAttributes));
                bool found = false;
                for (int index = 0; index < count; index++)
                {
                    SidAndAttributes group = (SidAndAttributes)Marshal.PtrToStructure(IntPtr.Add(groups, offset + index * stride), typeof(SidAndAttributes));
                    if (new SecurityIdentifier(group.Sid).Value == AdminSid && AssignableAdminOwner(group.Attributes)) found = true;
                }
                Json.Require(found, "HELPER_ADMIN_OWNER_REQUIRED");
            }
            finally { Marshal.FreeHGlobal(groups); }
        }
        private static void SetDefaults(IntPtr token, string serviceSid)
        {
            RawSecurityDescriptor descriptor = Descriptor(serviceSid, "DEFAULT");
            byte[] owner = new byte[descriptor.Owner.BinaryLength], acl = new byte[descriptor.DiscretionaryAcl.BinaryLength];
            descriptor.Owner.GetBinaryForm(owner, 0); descriptor.DiscretionaryAcl.GetBinaryForm(acl, 0);
            SetPointerInformation(token, 4, owner); SetPointerInformation(token, 6, acl);
            IntPtr actualOwner = Win32.TokenInfo(token, 4), actualDacl = IntPtr.Zero;
            try
            {
                Json.Require(new SecurityIdentifier(Marshal.ReadIntPtr(actualOwner)).Value == AdminSid, "HELPER_DEFAULT_OWNER_READBACK_FAILED");
                actualDacl = Win32.TokenInfo(token, 6);
                IntPtr pointer = Marshal.ReadIntPtr(actualDacl);
                Json.Require(pointer != IntPtr.Zero, "HELPER_DEFAULT_DACL_READBACK_FAILED");
                int size = (ushort)Marshal.ReadInt16(pointer, 2);
                Json.Require(size >= 8 && size <= 65535, "HELPER_DEFAULT_DACL_READBACK_FAILED");
                byte[] bytes = new byte[size]; Marshal.Copy(pointer, bytes, 0, size);
                RequireAcl(new RawAcl(bytes, 0), serviceSid, "DEFAULT");
            }
            finally { Marshal.FreeHGlobal(actualOwner); if (actualDacl != IntPtr.Zero) Marshal.FreeHGlobal(actualDacl); }
        }
        private static void SetPointerInformation(IntPtr token, int kind, byte[] bytes)
        {
            IntPtr value = Marshal.AllocHGlobal(bytes.Length), information = IntPtr.Zero;
            try
            {
                Marshal.Copy(bytes, 0, value, bytes.Length);
                information = Marshal.AllocHGlobal(IntPtr.Size); Marshal.WriteIntPtr(information, value);
                Win32.Check(SetTokenInformation(token, kind, information, IntPtr.Size), "HELPER_TOKEN_DEFAULT_SECURITY_FAILED");
            }
            finally { Marshal.FreeHGlobal(value); if (information != IntPtr.Zero) Marshal.FreeHGlobal(information); }
        }
        private static void Apply(IntPtr handle, string serviceSid, string kind)
        {
            RawSecurityDescriptor descriptor = Descriptor(serviceSid, kind);
            byte[] bytes = new byte[descriptor.BinaryLength]; descriptor.GetBinaryForm(bytes, 0);
            Win32.Check(SetKernelObjectSecurity(handle, ProtectedOwnerAndDacl, bytes), "HELPER_OBJECT_SECURITY_FAILED");
            int needed;
            GetKernelObjectSecurity(handle, OwnerAndDacl, null, 0, out needed);
            Json.Require(needed > 0 && needed <= 65536, "HELPER_OBJECT_SECURITY_READBACK_FAILED");
            byte[] actual = new byte[needed];
            Win32.Check(GetKernelObjectSecurity(handle, OwnerAndDacl, actual, actual.Length, out needed), "HELPER_OBJECT_SECURITY_READBACK_FAILED");
            RequireDescriptor(new RawSecurityDescriptor(actual, 0), serviceSid, kind);
        }

        [StructLayout(LayoutKind.Sequential)] private struct SidAndAttributes { internal IntPtr Sid; internal uint Attributes; }
        [StructLayout(LayoutKind.Sequential)] private struct GroupHeader { internal uint Count; internal SidAndAttributes First; }
        [DllImport("kernel32.dll", SetLastError = true)] private static extern IntPtr OpenThread(uint access, bool inherit, uint id);
        [DllImport("kernel32.dll", SetLastError = true)] private static extern uint GetProcessIdOfThread(IntPtr thread);
        [DllImport("advapi32.dll", SetLastError = true)] private static extern bool SetTokenInformation(IntPtr token, int kind, IntPtr information, int length);
        [DllImport("advapi32.dll", SetLastError = true)] private static extern bool SetKernelObjectSecurity(IntPtr handle, uint information, byte[] descriptor);
        [DllImport("advapi32.dll", SetLastError = true)] private static extern bool GetKernelObjectSecurity(IntPtr handle, uint information, [Out] byte[] descriptor, int length, out int needed);
    }
}
