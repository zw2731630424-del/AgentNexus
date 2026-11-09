using System;
using System.Collections.Generic;
namespace AgentNexus.CredentialBoundary
{
    internal static class ObserveProcesses
    {
        private static int Main(string[] args)
        {
            try
            {
                Json.Require(args.Length > 0 && args.Length <= 8, "OBSERVE_ARGUMENTS");
                List<object> rows = new List<object>();
                foreach (string argument in args)
                {
                    uint pid; Json.Require(UInt32.TryParse(argument, out pid) && pid > 0, "OBSERVE_PID");
                    using (ProcessFacts process = ProcessFacts.Open(pid))
                    {
                        TokenFacts token = process.Token;
                        rows.Add(new Dictionary<string, object> { { "pid", pid }, { "image", process.Path }, { "start_id", process.StartId },
                            { "sid", token.Sid }, { "session_id", token.SessionId }, { "elevated", token.Elevated }, { "integrity", token.Integrity },
                            { "appcontainer", token.AppContainer }, { "logon_id", token.LogonId } });
                    }
                }
                Console.WriteLine(Json.Encode(new Dictionary<string, object> { { "observations", rows }, { "read_only", true }, { "os_qualification", "NOT_RUN" } }));
                return 0;
            }
            catch { Console.Error.WriteLine("PROCESS_OBSERVATION_FAILED"); return 78; }
        }
    }
}
