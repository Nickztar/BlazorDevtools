using Microsoft.Build.Framework;
using Microsoft.Build.Utilities;
using System;
using System.IO;
using System.IO.Compression;
using System.Text;

namespace BlazorDevtools.Tasks
{
    public class UpdateBlazorScript : Task
    {
        [Required]
        public string? BuildDir { get; set; }

        [Required]
        public string? Version { get; set; }

        public bool DisableDevtools { get; set; }
        public override bool Execute()
        {
            if (DisableDevtools)
            {
                Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Skipping activation of devtools");
                return true;
            }
            Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Selecting script for framework: {Version}");
            var script = Version == "v7.0" ? Net7Script.Script : NET6Script.Script;
            //var startTime = DateTime.UtcNow;
            Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Updating blazor script.");
            var blazorScriptPath = Path.Combine(BuildDir, "wwwroot", "_framework", "blazor.webassembly.js");
            //var newScript = File.ReadAllText("./devScript.js");
            Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Updating \"{blazorScriptPath}\"");
            File.WriteAllText(blazorScriptPath, script);

            Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Updating \"{blazorScriptPath}.gz\"");
            using (MemoryStream inStream = GenerateStreamFromString(script))
            using (FileStream outFile = File.Open(blazorScriptPath + ".gz", FileMode.OpenOrCreate))
            using (GZipStream Compress = new GZipStream(outFile, CompressionMode.Compress))
            {
                byte[] buffer = new byte[65536];
                int numRead;
                while ((numRead = inStream.Read(buffer, 0, buffer.Length)) != 0)
                {
                    Compress.Write(buffer, 0, numRead);
                }
            }
            return true;
        }


        public static MemoryStream GenerateStreamFromString(string value)
        {
            return new MemoryStream(Encoding.UTF8.GetBytes(value ?? ""));
        }

    }
}
