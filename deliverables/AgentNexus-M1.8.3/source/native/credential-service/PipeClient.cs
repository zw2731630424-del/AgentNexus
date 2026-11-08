using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Security.Principal;
using System.Threading;

namespace AgentNexus.CredentialBoundary
{
    internal static class ClientProgram
    {
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length == 1 && args[0] == "--self-test") return PureTests.Run();
                Json.Require(args.Length == 1 && args[0] == "--stdio", "FIXED_STDIO_MODE_REQUIRED");
                Console.OutputEncoding = Fixed.Utf8;
                using (ManualResetEvent stop = new ManualResetEvent(false))
                using (Deployment deployment = Deployment.Load())
                {
                    TokenFacts.RequireOperator(TokenFacts.Current(), deployment.OperatorSid);
                    using (ProcessFacts self = ProcessFacts.Open((uint)Process.GetCurrentProcess().Id))
                        Json.Require(String.Equals(self.Path, Fixed.ClientExe, StringComparison.OrdinalIgnoreCase), "CLIENT_IMAGE_REJECTED");
                    // Identification is enough for token inspection; no delegation is granted to the server.
                    using (NamedPipeClientStream pipe = new NamedPipeClientStream(".", Fixed.PipeName, PipeDirection.InOut, PipeOptions.Asynchronous, TokenImpersonationLevel.Identification))
                    {
                        pipe.Connect(Fixed.ConnectTimeoutMs);
                        Identity.Server(pipe, deployment, null);
                        string serverStart = Identity.ServerStart(pipe);
                        Identity.Server(pipe, deployment, serverStart);
                        Frames pipeFrames = new Frames(pipe, stop);
                        Frames standardInput = new Frames(Console.OpenStandardInput(), stop);
                        Frames standardOutput = new Frames(Console.OpenStandardOutput(), stop);
                        Exception failed = null;
                        Thread receive = new Thread(delegate()
                        {
                            try
                            {
                                for (;;)
                                {
                                    string response = pipeFrames.Read(Timeout.Infinite);
                                    if (response == null) break;
                                    Identity.Server(pipe, deployment, serverStart);
                                    Json.Object(response);
                                    standardOutput.WriteText(response);
                                }
                            }
                            catch (Exception error) { failed = error; }
                            finally { stop.Set(); try { pipe.Dispose(); } catch { } }
                        });
                        receive.IsBackground = true;
                        receive.Start();
                        try
                        {
                            for (;;)
                            {
                                string request = standardInput.Read(Timeout.Infinite);
                                if (request == null) break;
                                Identity.Server(pipe, deployment, serverStart);
                                pipeFrames.Write(Json.Request(request));
                            }
                        }
                        finally { stop.Set(); pipe.Dispose(); receive.Join(1000); }
                        Json.Require(failed == null, "PIPE_SERVER_DISCONNECTED");
                    }
                }
                return 0;
            }
            catch (PolicyException error) { Console.Error.WriteLine("CREDENTIAL_CLIENT_BLOCKED:" + error.Code); return 78; }
            catch { Console.Error.WriteLine("CREDENTIAL_CLIENT_BLOCKED:TRANSPORT_FAILED"); return 78; }
        }
    }
}
