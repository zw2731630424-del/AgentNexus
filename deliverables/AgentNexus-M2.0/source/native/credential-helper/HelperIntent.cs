// AgentNexus M1.8.3-Q3. Deliverable source, .NET Framework 4.x / C# 5.
// Command-line values are non-secret hints. They confer no authority.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace AgentNexus.CredentialBoundary
{
    internal sealed class HelperIntent
    {
        internal string Action;
        internal string Provider;
        internal string OperationId;
        internal string Name;
        internal string[] Models;
        internal string CredentialId;
        internal bool ImportsSecret { get { return Action == "ADD" || Action == "ROTATE"; } }
        internal static readonly string[] AllowedModels = { "deepseek-flash", "deepseek-v4-pro" };
        private static readonly string[] Actions = { "ADD", "ROTATE", "ENABLE", "DISABLE", "DELETE", "MODELS" };

        internal static HelperIntent Parse(string[] args)
        {
            Json.Require(args != null && (args.Length == 10 || args.Length == 12), "HELPER_INTENT_INVALID");
            Dictionary<string, string> values = new Dictionary<string, string>(StringComparer.Ordinal);
            string[] allowed = { "--action", "--provider-id", "--operation-id", "--name", "--model-ids", "--credential-id" };
            int total = 0;
            for (int i = 0; i < args.Length; i += 2)
            {
                string key = args[i], value = args[i + 1];
                Json.Require(key != null && value != null && allowed.Contains(key) && !values.ContainsKey(key), "HELPER_INTENT_INVALID");
                total += key.Length + value.Length;
                Json.Require((value.Length > 0 || key == "--model-ids") && value.Length <= 256 && total <= 1024, "HELPER_INTENT_INVALID");
                values.Add(key, value);
            }
            Json.Require(values.ContainsKey("--action") && values.ContainsKey("--provider-id") && values.ContainsKey("--operation-id") && values.ContainsKey("--name") && values.ContainsKey("--model-ids"), "HELPER_INTENT_INVALID");
            HelperIntent intent = new HelperIntent {
                Action = values["--action"], Provider = values["--provider-id"],
                OperationId = values["--operation-id"], Name = values["--name"]
            };
            Json.Require(Actions.Contains(intent.Action) && intent.Provider == "deepseek" && IsUuid(intent.OperationId) && ValidName(intent.Name), "HELPER_INTENT_INVALID");
            string[] requestedModels = values["--model-ids"].Length == 0 ? new string[0] : values["--model-ids"].Split(',');
            intent.Models = ModelScope(requestedModels, intent.Action == "DISABLE" || intent.Action == "DELETE" || intent.Action == "MODELS");
            string target;
            values.TryGetValue("--credential-id", out target);
            intent.CredentialId = target;
            Json.Require(intent.Action == "ADD" ? target == null : IsCredentialId(target), "HELPER_TARGET_INVALID");
            return intent;
        }

        internal static bool IsUuid(string value)
        {
            Guid parsed;
            return value != null && value.Length == 36 && Guid.TryParseExact(value, "D", out parsed) && parsed != Guid.Empty && parsed.ToString("D") == value;
        }
        internal static bool IsCredentialId(string value) { return value != null && value.StartsWith("key.", StringComparison.Ordinal) && IsUuid(value.Substring(4)); }
        internal static bool ValidName(string value)
        {
            return !String.IsNullOrWhiteSpace(value) && value.Length <= 80 && value == value.Trim() && Regex.IsMatch(value, @"\A[\p{L}\p{N} ._-]{1,80}\z", RegexOptions.CultureInvariant);
        }
        internal static string[] ModelScope(IEnumerable<string> input) { return ModelScope(input, false); }
        internal static string[] ModelScope(IEnumerable<string> input, bool allowEmpty)
        {
            string[] models = input == null ? new string[0] : input.ToArray();
            Json.Require(models.Length >= (allowEmpty ? 0 : 1) && models.Length <= AllowedModels.Length && models.Distinct(StringComparer.Ordinal).Count() == models.Length && models.All(AllowedModels.Contains), "HELPER_MODEL_INVALID");
            return AllowedModels.Where(models.Contains).ToArray();
        }
        internal Dictionary<string, object> Metadata(string name, string[] models)
        {
            Json.Require(ImportsSecret && ValidName(name), "HELPER_METADATA_INVALID");
            string[] scope = ModelScope(models);
            Dictionary<string, object> wires = scope.ToDictionary(m => m, m => (object)m, StringComparer.Ordinal);
            Dictionary<string, object> metadata = new Dictionary<string, object> {
                { "provider_id", Provider }, { "name", name }, { "notes", "" },
                { "max_concurrency", 1 }, { "requests_per_minute", 120 },
                { "models", scope }, { "model_wire_ids", wires }
            };
            if (Action == "ROTATE") metadata.Add("rotate_id", CredentialId);
            return metadata;
        }
        internal string[] ConfirmedScope(IEnumerable<string> checkedModels)
        {
            if (ImportsSecret || Action == "MODELS") return ModelScope(checkedModels, Action == "MODELS");
            return (string[])Models.Clone(); // State/delete never rewrite model scope.
        }
        internal static bool ValidSecret(string value, bool synthetic)
        {
            if (value == null || value.Length < 24 || value.Length > 4096 || (synthetic && !value.StartsWith("synthetic-test-", StringComparison.Ordinal))) return false;
            foreach (char item in value) if (item < 0x21 || item > 0x7e) return false;
            return true;
        }
    }

    // Matches types.ts canonical() for this bounded metadata subset. Avoids
    // JavaScriptSerializer's additional escaping when calculating the hash.
    internal static class HelperCanonical
    {
        internal static string Encode(object value)
        {
            if (value == null) return "null";
            string text = value as string;
            if (text != null) return Quote(text);
            Dictionary<string, object> map = value as Dictionary<string, object>;
            if (map != null) return "{" + String.Join(",", map.Keys.OrderBy(k => k, StringComparer.Ordinal).Select(k => Quote(k) + ":" + Encode(map[k])).ToArray()) + "}";
            string[] array = value as string[];
            if (array != null) return "[" + String.Join(",", array.Select(Quote).ToArray()) + "]";
            if (value is int) return ((int)value).ToString(CultureInfo.InvariantCulture);
            if (value is bool) return (bool)value ? "true" : "false";
            throw new PolicyException("HELPER_CANONICAL_TYPE_INVALID");
        }
        private static string Quote(string value)
        {
            StringBuilder output = new StringBuilder("\"");
            foreach (char item in value)
            {
                switch (item)
                {
                    case '"': output.Append("\\\""); break;
                    case '\\': output.Append("\\\\"); break;
                    case '\b': output.Append("\\b"); break;
                    case '\f': output.Append("\\f"); break;
                    case '\n': output.Append("\\n"); break;
                    case '\r': output.Append("\\r"); break;
                    case '\t': output.Append("\\t"); break;
                    default:
                        if (item < 0x20) output.Append("\\u" + ((int)item).ToString("x4", CultureInfo.InvariantCulture));
                        else output.Append(item);
                        break;
                }
            }
            return output.Append('"').ToString();
        }
        internal static string Hash(object metadata)
        {
            byte[] bytes = Fixed.Utf8.GetBytes(Encode(metadata));
            try { return Digests.Bytes(bytes); }
            finally { Array.Clear(bytes, 0, bytes.Length); }
        }
    }
}
