using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.AccessControl;

namespace AgentNexus.CredentialBoundary
{
    internal static class HelperTests
    {
        private const string Operation = "11111111-1111-4111-8111-111111111111";
        private const string Target = "key.22222222-2222-4222-8222-222222222222";
        private const string Ticket = "33333333-3333-4333-8333-333333333333";
        private static int passed;
        internal static string[] Args(string action)
        {
            List<string> values = new List<string> { "--action", action, "--provider-id", "deepseek", "--operation-id", Operation, "--name", "Synthetic Key", "--model-ids", "deepseek-flash" };
            if (action != "ADD") values.AddRange(new[] { "--credential-id", Target });
            return values.ToArray();
        }
        private static string[] Change(string[] args, string option, string value)
        {
            string[] copy = (string[])args.Clone();
            int at = Array.IndexOf(copy, option); copy[at + 1] = value; return copy;
        }
        private static void Check(bool value) { if (!value) throw new PolicyException("HELPER_PURE_TEST_FAILED"); passed++; }
        private static void Reject(Action action)
        {
            try { action(); } catch (PolicyException) { passed++; return; }
            throw new PolicyException("HELPER_PURE_TEST_EXPECTED_REJECTION");
        }
        internal static int Run()
        {
            try
            {
#if !SYNTHETIC_HELPER_UI
                const string serviceSid = "S-1-5-80-1-2-3-4-5";
                foreach (string kind in new[] { "PROCESS", "TOKEN", "THREAD", "DEFAULT" })
                {
                    HelperObjectSecurity.RequireDescriptor(HelperObjectSecurity.Descriptor(serviceSid, kind), serviceSid, kind); Check(true);
                }
                Check(HelperObjectSecurity.ServiceProcessRights == 0x00101000 && HelperObjectSecurity.ServiceTokenRights == 0x00000008);
                Check(HelperObjectSecurity.AssignableAdminOwner(0x0c));
                foreach (uint attributes in new uint[] { 0, 4, 8, 0x1c }) Check(!HelperObjectSecurity.AssignableAdminOwner(attributes));
                foreach (string sid in new[] { null, "S-1-5-18", "S-1-5-32-544", "S-1-5-21-1-2-3-1001", "S-1-5-80-1-2-3-4-5)(A;;GA;;;WD)" })
                    Reject(delegate { HelperObjectSecurity.Descriptor(sid, "PROCESS"); });
                foreach (string invalid in new[] {
                    "O:BAD:P(A;;0x001fffff;;;SY)(A;;0x001fffff;;;BA)(A;;GA;;;" + serviceSid + ")",
                    "O:SYD:P(A;;0x001fffff;;;SY)(A;;0x001fffff;;;BA)(A;;0x00101000;;;" + serviceSid + ")",
                    "O:BAD:(A;;0x001fffff;;;SY)(A;;0x001fffff;;;BA)(A;;0x00101000;;;" + serviceSid + ")",
                    "O:BAD:P(A;;0x001fffff;;;SY)(A;;0x001fffff;;;BA)(A;;0x00101000;;;" + serviceSid + ")(A;;GA;;;WD)"
                }) Reject(delegate { HelperObjectSecurity.RequireDescriptor(new RawSecurityDescriptor(invalid), serviceSid, "PROCESS"); });
#endif
                foreach (string action in new[] { "ADD", "ROTATE", "ENABLE", "DISABLE", "DELETE", "MODELS" })
                {
                    HelperIntent intent = HelperIntent.Parse(Args(action));
                    Check(intent.Action == action && intent.Provider == "deepseek" && intent.OperationId == Operation && intent.ImportsSecret == (action == "ADD" || action == "ROTATE"));
                }
                foreach (string[] args in new[] {
                    new string[0], new[] { "--stdio" }, new[] { "--synthetic-ui-worker" }, Args("ADD").Concat(new[] { "--synthetic-ui-worker", "true" }).ToArray(), Args("ADD").Concat(new[] { "--secret", "synthetic-test-never-accepted-here" }).ToArray(),
                    Args("ADD").Concat(new[] { "--stdin", "true" }).ToArray(), Args("ADD").Concat(new[] { "--path", "C:\\temp\\fixture" }).ToArray(),
                    Args("ADD").Concat(new[] { "--url", "https://example.invalid" }).ToArray(), Args("ADD").Concat(new[] { "--command", "cmd" }).ToArray(),
                    Args("ADD").Concat(new[] { "--script", "fixture.ps1" }).ToArray(), Args("ADD").Concat(new[] { "--method", "broker.execute" }).ToArray(),
                    Args("ADD").Concat(new[] { "--env", "TOKEN" }).ToArray(), Args("ADD").Concat(new[] { "--name", "duplicate" }).ToArray(),
                    Args("ADD").Take(9).ToArray(), Args("ADD").Concat(new[] { "--credential-id", Target }).ToArray(), Args("ROTATE").Take(10).ToArray()
                }) Reject(delegate { HelperIntent.Parse(args); });
                foreach (string action in new[] { "add", "REVOKE", "BROKER", "credential.save", "ADD --stdio", "DELETE&cmd" })
                    Reject(delegate { HelperIntent.Parse(Change(Args("ADD"), "--action", action)); });
                foreach (string provider in new[] { "openai", "compatible", "DeepSeek", "https://api.deepseek.com", "deepseek\r\n" })
                    Reject(delegate { HelperIntent.Parse(Change(Args("ADD"), "--provider-id", provider)); });
                foreach (string model in new[] { "deepseek-chat", "deepseek-reasoner", "DeepSeek-Flash", "deepseek-flash,deepseek-flash", "deepseek-flash,", "../deepseek-flash", "deepseek:deepseek-flash", "deepseek-flash --secret" })
                    Reject(delegate { HelperIntent.Parse(Change(Args("ADD"), "--model-ids", model)); });
                Check(HelperIntent.Parse(Change(Args("ADD"), "--model-ids", "deepseek-v4-pro,deepseek-flash")).Models.SequenceEqual(HelperIntent.AllowedModels));
                foreach (string action in new[] { "DISABLE", "DELETE", "MODELS" }) Check(HelperIntent.Parse(Change(Args(action), "--model-ids", "")).Models.Length == 0);
                foreach (string action in new[] { "ADD", "ROTATE", "ENABLE" }) Reject(delegate { HelperIntent.Parse(Change(Args(action), "--model-ids", "")); });
                foreach (string action in new[] { "DISABLE", "DELETE", "MODELS" }) Check(HelperIntent.Parse(Change(Args(action), "--model-ids", "")).ConfirmedScope(new string[0]).Length == 0);
                foreach (string action in new[] { "ADD", "ROTATE" }) Reject(delegate { HelperIntent.Parse(Args(action)).ConfirmedScope(new string[0]); });
                Check(HelperIntent.Parse(Args("ENABLE")).ConfirmedScope(new string[0]).SequenceEqual(new[] { "deepseek-flash" }));
                foreach (string id in new[] { "00000000-0000-0000-0000-000000000000", "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA", "{11111111-1111-4111-8111-111111111111}", "not-a-uuid", Operation + " ", "file:///tmp/x" })
                    Reject(delegate { HelperIntent.Parse(Change(Args("ADD"), "--operation-id", id)); });
                foreach (string name in new[] { "", "   ", " Synthetic", "Synthetic ", "name\r\nvalue", "name\n", "name\r", "name\"quoted", "C:\\secret", "$TOKEN", "name;cmd", new string('a', 81) })
                    Reject(delegate { HelperIntent.Parse(Change(Args("ADD"), "--name", name)); });
                Check(HelperIntent.ValidName("合成凭据 2026_A-1"));
                Check(!HelperIntent.IsCredentialId(Operation) && !HelperIntent.IsCredentialId("key.AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA"));
                Check(!HelperIntent.IsUuid(Operation + "\n") && !HelperIntent.IsCredentialId(Target + "\n"));
                Reject(delegate { HelperIntent.Parse(Change(Args("ROTATE"), "--credential-id", "../key.fixture")); });
                Check(HelperIntent.ValidSecret("synthetic-test-helper-fixture-12345", true));
                Check(!HelperIntent.ValidSecret("synthetic-test-\nfixture-value", true));
                Check(!HelperIntent.ValidSecret("synthetic-test-helper\tfixture-123", false));
                Check(!HelperIntent.ValidSecret("synthetic-test-太短的样例", true));
                Check(!HelperIntent.ValidSecret(new string('a', 4097), false));
                Check(!HelperIntent.ValidSecret(new string('a', 23), false));

                HelperIntent add = HelperIntent.Parse(Args("ADD"));
                Dictionary<string, object> metadata = add.Metadata("Synthetic Key", new[] { "deepseek-flash" });
                const string canonical = "{\"max_concurrency\":1,\"model_wire_ids\":{\"deepseek-flash\":\"deepseek-flash\"},\"models\":[\"deepseek-flash\"],\"name\":\"Synthetic Key\",\"notes\":\"\",\"provider_id\":\"deepseek\",\"requests_per_minute\":120}";
                Check(HelperCanonical.Encode(metadata) == canonical);
                Check(HelperCanonical.Hash(metadata) == Digests.Bytes(Fixed.Utf8.GetBytes(canonical)));
                Check(HelperIntent.Parse(Args("ROTATE")).Metadata("Synthetic Key", add.Models).ContainsKey("rotate_id"));
                Reject(delegate { HelperCanonical.Encode(1.5); });
                Check(HelperCanonical.Encode(new Dictionary<string, object> { { "b", true }, { "a", "\"\\\n" } }) == "{\"a\":\"\\\"\\\\\\n\",\"b\":true}");

                long now = 1700000000000L;
                Dictionary<string, object> ticket = new Dictionary<string, object> { { "ticket_id", Ticket }, { "operation_id", Operation }, { "expires_at", now + 30000 } };
                HelperTicket parsed = HelperTicket.Parse(ticket, Operation, now);
                Check(parsed.Current && parsed.Id == Ticket && parsed.Cancellation().Count == 2 && (string)parsed.Cancellation()["operation_id"] == Operation);
                ticket["expires_at"] = now; Reject(delegate { HelperTicket.Parse(ticket, Operation, now); });
                ticket["expires_at"] = now + 30001; Reject(delegate { HelperTicket.Parse(ticket, Operation, now); });
                ticket["expires_at"] = "1700000030000"; Reject(delegate { HelperTicket.Parse(ticket, Operation, now); });
                ticket["expires_at"] = now + 30000;
                Reject(delegate { HelperTicket.Parse(ticket, "44444444-4444-4444-8444-444444444444", now); });
                ticket["extra"] = false; Reject(delegate { HelperTicket.Parse(ticket, Operation, now); });

                string response = Json.Encode(new Dictionary<string, object> { { "id", Operation }, { "ok", true }, { "value", new Dictionary<string, object> { { "saved", true } } } });
                HelperResponses.Completed("MODELS", HelperResponses.Success(response, Operation)); Check(true);
                Reject(delegate { HelperResponses.Success(response, Ticket); });
                Reject(delegate { HelperResponses.Success("{\"id\":\"" + Operation + "\",\"ok\":true,\"value\":{},\"event\":\"delta\"}", Operation); });
                Reject(delegate { HelperResponses.Completed("ADD", new Dictionary<string, object> { { "stored", true }, { "key_id", Target }, { "classification", "UNKNOWN" } }); });
                HelperResponses.Completed("ADD", new Dictionary<string, object> { { "stored", true }, { "key_id", Target }, { "classification", "SYNTHETIC" } }); Check(true);
                Reject(delegate { HelperResponses.Completed("DELETE", new Dictionary<string, object> { { "deleted", false } }); });
                HelperTarget before = new HelperTarget { Id = Target, Name = "Synthetic Key", State = "ACTIVE", Models = add.Models };
                HelperTarget after = new HelperTarget { Id = Target, Name = "Synthetic Key", State = "DISABLED", Models = add.Models };
                Check(!TrustedCredentialForm.SameTarget(before, after));
                Check(TrustedCredentialForm.SameTarget(null, null));
                Check(!TrustedCredentialForm.SameTarget(before, null));
                Deployment simulated = new Deployment { Mode = "QUALIFICATION_ONLY", PolicyEpoch = 1, RealImportEnabled = false };
                // Exact current broker.snapshot() and DAILY_QUALIFICATION JSON
                // shape, including independent blocked Daily gateway status.
                const string actualBrokerSnapshot = @"{""qualification"":{""live"":""BLOCKED"",""credential_service"":""BLOCKED"",""real_key_entry"":false,""synthetic_key_entry"":true,""mode"":""SIMULATED"",""reason"":""SYNTHETIC_PROCESS_ONLY_NO_OS_QUALIFICATION""},""keys"":[],""usage"":{""global"":{""id"":""m181-deepseek"",""owner"":""CREDENTIAL_SERVICE"",""assurance"":""SIMULATED"",""limit"":100000000,""used"":0,""held"":0,""remaining_tokens"":100000000,""unknown"":0,""requests"":0,""state"":""OPEN""},""real"":{""input_tokens"":0,""output_tokens"":0,""cached_tokens"":null,""reasoning_tokens"":null,""requests"":0,""failed_requests"":0,""estimated_cost_micros"":0,""actual_cost_micros"":null},""simulated"":{""input_tokens"":0,""output_tokens"":0,""cached_tokens"":null,""reasoning_tokens"":null,""requests"":0,""failed_requests"":0,""estimated_cost_micros"":0,""actual_cost_micros"":null},""simulated_budget"":{""limits"":{""tokens"":100000000},""used"":{""tokens"":0},""held"":{""tokens"":0}},""by_provider"":[],""by_model"":[],""by_agent"":[],""by_task"":[],""records"":[]},""policy_epoch"":1,""service_instance"":""403dd4d4-a774-454f-9e8f-db09752d69e3"",""daily_gateway"":{""status"":""BLOCKED"",""reason"":""DAILY_NATIVE_RUNTIME_AUTHENTICATION_NOT_IMPLEMENTED"",""medium_listener_created"":false,""uac_required"":false,""synthetic_protocol_available"":true}}";
                Check(HelperResponses.Snapshot(Json.Object(actualBrokerSnapshot), add, simulated) == null);
                Dictionary<string, object> qualification = new Dictionary<string, object> { { "live", "BLOCKED" }, { "credential_service", "BLOCKED" }, { "real_key_entry", false }, { "synthetic_key_entry", true }, { "mode", "SIMULATED" }, { "reason", "SYNTHETIC_PROCESS_ONLY_NO_OS_QUALIFICATION" } };
                Dictionary<string, object> daily = new Dictionary<string, object> { { "status", "BLOCKED" }, { "reason", "DAILY_SERVICE_DEPLOYMENT_NOT_VERIFIED" }, { "medium_listener_created", false }, { "uac_required", false }, { "synthetic_protocol_available", true } };
                Dictionary<string, object> snapshot = new Dictionary<string, object> {
                    { "qualification", qualification }, { "keys", new object[0] }, { "usage", new Dictionary<string, object>() }, { "policy_epoch", 1 }, { "service_instance", Operation }, { "daily_gateway", daily }
                };
                Check(HelperResponses.Snapshot(Json.Object(Json.Encode(snapshot)), add, simulated) == null);
                daily["status"] = "QUALIFIED"; Reject(delegate { HelperResponses.Snapshot(snapshot, add, simulated); }); daily["status"] = "BLOCKED";
                daily["medium_listener_created"] = true; Reject(delegate { HelperResponses.Snapshot(snapshot, add, simulated); }); daily["medium_listener_created"] = false;
                daily["protocol"] = "SIMULATED"; Reject(delegate { HelperResponses.Snapshot(snapshot, add, simulated); }); daily.Remove("protocol");
                snapshot.Remove("daily_gateway"); Reject(delegate { HelperResponses.Snapshot(snapshot, add, simulated); }); snapshot["daily_gateway"] = daily;
                snapshot["policy_epoch"] = 2; Reject(delegate { HelperResponses.Snapshot(snapshot, add, simulated); }); snapshot["policy_epoch"] = 1;
                qualification["mode"] = "REAL"; Reject(delegate { HelperResponses.Snapshot(snapshot, add, simulated); }); qualification["mode"] = "SIMULATED";
                qualification["synthetic_key_entry"] = false; Reject(delegate { HelperResponses.Snapshot(snapshot, add, simulated); }); qualification["synthetic_key_entry"] = true;
                Dictionary<string, object> key = new Dictionary<string, object> { { "key_id", Target }, { "provider_id", "deepseek" }, { "name", "Synthetic Key" }, { "state", "ACTIVE" }, { "models", new object[] { "deepseek-flash" } } };
                snapshot["keys"] = new object[] { key };
                HelperIntent rotate = HelperIntent.Parse(Args("ROTATE"));
                Check(HelperResponses.Snapshot(snapshot, rotate, simulated).Id == Target);
                key["provider_id"] = "openai"; Reject(delegate { HelperResponses.Snapshot(snapshot, rotate, simulated); }); key["provider_id"] = "deepseek";
                key["name"] = "Prod: Key 🚀"; key["models"] = new object[0];
                HelperTarget legacy = HelperResponses.Snapshot(snapshot, rotate, simulated);
                Check(legacy.Name == "Prod: Key 🚀" && legacy.Models.Length == 0 && legacy.DisplayName.Contains("Prod: Key"));
                Check(!HelperTarget.VisibleName("Prod\n\u202eLabel").Contains("\n") && HelperTarget.VisibleName("Prod\n\u202eLabel").Contains("\\u202e"));
                key["models"] = new object[] { "registry.legacy-model-id" }; Check(HelperResponses.Snapshot(snapshot, rotate, simulated).Models[0] == "registry.legacy-model-id");
                key["models"] = new object[] { "bad\r\nscope" }; Reject(delegate { HelperResponses.Snapshot(snapshot, rotate, simulated); }); key["models"] = new object[] { "deepseek-flash" };
                key["name"] = "Synthetic Key";
                snapshot["keys"] = new object[] { key, key }; Reject(delegate { HelperResponses.Snapshot(snapshot, rotate, simulated); });
                snapshot["keys"] = new object[0]; Reject(delegate { HelperResponses.Snapshot(snapshot, rotate, simulated); });
                // All data above is fixed/synthetic. No UI, token query, pipe,
                // deployment load, clipboard, UAC, service or network is used.
                Console.WriteLine(Json.Encode(new Dictionary<string, object> {
                    { "suite", "M1.8.3-Q3_HELPER_PURE" }, { "passed", passed }, { "failed", 0 },
                    { "windows_boundary_qualified", false }, { "uac_executed", false }, { "network_used", false },
                    { "canonical_metadata_sha256", HelperCanonical.Hash(metadata) }
                }));
                return 0;
            }
            catch
            {
                Console.WriteLine(Json.Encode(new Dictionary<string, object> { { "suite", "M1.8.3-Q3_HELPER_PURE" }, { "passed", passed }, { "failed", 1 }, { "windows_boundary_qualified", false } }));
                return 1;
            }
        }
    }
}
