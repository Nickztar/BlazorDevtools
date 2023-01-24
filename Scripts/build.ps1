param(
    [string] $VersionSuffix
)
Push-Location $PSScriptRoot

function Write-Message{
    param([string]$message)
    Write-Host
    Write-Host $message
    Write-Host
}
function Confirm-PreviousCommand {
    param([string]$errorMessage)
    if ( $LASTEXITCODE -ne 0) { 
        if( $errorMessage) {
            Write-Message $errorMessage
        }    
        exit $LASTEXITCODE 
    }
}

function Confirm-Process {
    param ([System.Diagnostics.Process]$process,[string]$errorMessage)
    $process.WaitForExit()
    if($process.ExitCode -ne 0){
        Write-Host $process.ExitCode
        if( $errorMessage) {
            Write-Message $errorMessage
        }    
        exit $process.ExitCode 
    }
}

Write-Host "Parameters"
Write-Host "=========="
Write-Host "Version suffix: $VersionSuffix"

Write-Message "Building ..."
dotnet build ../lib/BlazorDevtools.Tasks/BlazorDevtools.Tasks.csproj -c Release
dotnet build ../lib/BlazorDevtools/BlazorDevtools.csproj -c Release /p:VersionSuffix="$VersionSuffix"
Confirm-PreviousCommand

Write-Message "Creating nuget package ..."
dotnet pack ../lib/BlazorDevtools/BlazorDevtools.csproj -c Release /p:VersionSuffix="$VersionSuffix" -o ../artifacts/nuget
Confirm-PreviousCommand

Write-Message "Build completed successfully"