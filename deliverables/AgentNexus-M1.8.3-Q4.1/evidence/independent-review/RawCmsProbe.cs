using System;
using System.IO;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;

internal static class RawCmsProbe
{
    private static string Hash(byte[] bytes)
    {
        using (SHA256 sha = SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-", "").ToLowerInvariant();
    }
    private static int Main(string[] args)
    {
        byte[] external = File.ReadAllBytes(args[0]);
        SignedCms cms = new SignedCms(new ContentInfo(external), true);
        byte[] signature = File.ReadAllBytes(args[1]);
        cms.Decode(signature);
        SignedCms embedded = new SignedCms(); embedded.Decode(signature);
        bool accepted = false; string error = "";
        try { cms.CheckSignature(true); accepted = true; } catch (Exception e) { error = e.GetType().Name; }
        Console.WriteLine("scope=PUBLIC_SIMULATED_CMS_CRYPTO_ONLY");
        Console.WriteLine("external_sha256=" + Hash(external));
        Console.WriteLine("decoded_content_sha256=" + Hash(cms.ContentInfo.Content));
        Console.WriteLine("embedded_content_sha256=" + Hash(embedded.ContentInfo.Content));
        Console.WriteLine("detached_property=" + cms.Detached);
        Console.WriteLine("raw_check_signature_accepted=" + accepted);
        Console.WriteLine("error=" + error);
        return 0;
    }
}
