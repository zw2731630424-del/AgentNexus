// Cross-language pure contract probe against an actual synthetic broker snapshot.
// No Deployment.Load, token/ACL query, named pipe, UI, UAC, service or network.
using System;
using System.Collections.Generic;
using System.IO;
namespace AgentNexus.CredentialBoundary
{
    internal static class SnapshotContractProbe
    {
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length != 1) return 2;
                Dictionary<string, object> value = Json.Object(File.ReadAllText(args[0], Fixed.Utf8));
                HelperIntent intent = HelperIntent.Parse(new[] {
                    "--action", "ADD", "--provider-id", "deepseek", "--operation-id", "11111111-1111-4111-8111-111111111111",
                    "--name", "Independent Synthetic", "--model-ids", "deepseek-flash"
                });
                Deployment deployment = new Deployment { Mode = "QUALIFICATION_ONLY", PolicyEpoch = 1, RealImportEnabled = false };
                Json.Require(HelperResponses.Snapshot(value, intent, deployment) == null, "INDEPENDENT_SNAPSHOT_CONTRACT_FAILED");
                object[] keys = value["keys"] as object[];
                Json.Require(keys != null && keys.Length == 1, "INDEPENDENT_SYNTHETIC_KEY_REQUIRED");
                Dictionary<string, object> existing = keys[0] as Dictionary<string, object>;
                Json.Require(existing != null, "INDEPENDENT_SYNTHETIC_KEY_REQUIRED");
                existing["name"] = "Legacy: key \ud83d\udd11\n\u202e";
                existing["models"] = new object[0];
                HelperIntent deletion = HelperIntent.Parse(new[] {
                    "--action", "DELETE", "--provider-id", "deepseek", "--operation-id", "22222222-2222-4222-8222-222222222222",
                    "--name", "Manage DeepSeek Credential", "--model-ids", "", "--credential-id", Json.String(existing, "key_id")
                });
                HelperTarget target = HelperResponses.Snapshot(value, deletion, deployment);
                Json.Require(target != null && target.Models.Length == 0 && target.Name == (string)existing["name"] && target.DisplayName.Contains("\\u000a") && target.DisplayName.Contains("\\u202e"), "INDEPENDENT_LEGACY_TARGET_FAILED");
                int rejected = 0;
                value.Add("unexpected", true);
                try { HelperResponses.Snapshot(value, intent, deployment); }
                catch (PolicyException) { rejected++; }
                value.Remove("unexpected");
                value.Remove("daily_gateway");
                try { HelperResponses.Snapshot(value, intent, deployment); }
                catch (PolicyException) { rejected++; }
                Json.Require(rejected == 2, "INDEPENDENT_SNAPSHOT_SCHEMA_NOT_EXACT");
                Console.WriteLine("{\"suite\":\"INDEPENDENT_CROSS_LANGUAGE_SNAPSHOT\",\"pass\":4,\"fail\":0,\"windows_boundary_qualified\":false,\"ui_or_uac_started\":false,\"network_used\":false}");
                return 0;
            }
            catch
            {
                Console.WriteLine("{\"suite\":\"INDEPENDENT_CROSS_LANGUAGE_SNAPSHOT\",\"pass\":0,\"fail\":1,\"windows_boundary_qualified\":false}");
                return 1;
            }
        }
    }
}
