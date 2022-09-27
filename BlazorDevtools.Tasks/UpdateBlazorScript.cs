using Microsoft.Build.Framework;
using Microsoft.Build.Utilities;
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;

namespace BlazorDevtools.Tasks
{
    public class UpdateBlazorScript : Task
    {
        [Required]
        public string? BuildDir { get; set; }

        public bool DisableDevtools { get; set; }

        public override bool Execute()
        {
            if (DisableDevtools)
            {
                Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Skipping activation of devtools");
                return true;
            }
            var startTime = DateTime.UtcNow;
            Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Updating blazor script.");
            var blazorScriptPath = Path.Combine(BuildDir, "_framwork", "blazor.webassembly.js");
            var blazorScripts = Directory.GetFiles(blazorScriptPath);
            var newScript = File.ReadAllText("./devScript.js");
            foreach(var blazorScript in blazorScripts)
            {
                Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Updating \"{blazorScript}\"");
                File.WriteAllText(blazorScript, newScript);
            }
            var timeRan = DateTime.UtcNow - startTime;
            Log.LogMessage(MessageImportance.High, $"BlazorDevtools: Updating blazor script finished in: {timeRan:mm:ss}");

            return true;
        }
    }
}
