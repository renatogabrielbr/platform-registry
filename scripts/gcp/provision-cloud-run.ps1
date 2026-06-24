# Creates or updates Cloud Build triggers for platform services (message-relay, report-relay).
#
# Usage:
#   .\provision-cloud-run.ps1 -Service message-relay -Environment dev
#   .\provision-cloud-run.ps1 -Service report-relay -Environment dev
#   .\provision-cloud-run.ps1 -Service all -Environment dev
#   .\provision-cloud-run.ps1 -Service message-relay,report-relay -Environment dev -DualTrigger
#   .\provision-cloud-run.ps1 -Service all -Environment dev -DryRun

param(
    [Parameter(Mandatory = $true)]
    [string]$Service,

    [Parameter(Mandatory = $true)]
    [string]$Environment,

    [string]$ConfigPath = "$PSScriptRoot\gcp.config.json",

    [switch]$DualTrigger,

    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Invoke-Gcloud {
    param([string[]]$GcloudArgs)
    $cmd = "gcloud $($GcloudArgs -join ' ')"
    if ($DryRun) {
        Write-Host "[dry-run] $cmd" -ForegroundColor DarkGray
        return
    }
    Write-Host ">> $cmd" -ForegroundColor Cyan
    & gcloud @GcloudArgs
    if ($LASTEXITCODE -ne 0) { throw "Failed: $cmd" }
}

function Test-GcloudResource {
    param([string[]]$GcloudArgs)
    if ($DryRun) { return $false }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    & gcloud @GcloudArgs 1>$null 2>$null
    $ok = $LASTEXITCODE -eq 0
    $ErrorActionPreference = $prev
    return $ok
}

function New-TriggerYaml {
    param(
        [string]$TriggerName,
        [string]$Description,
        [string]$CloudbuildFile,
        [string]$GithubOwner,
        [string]$GithubRepo,
        [string]$Branch,
        [string]$ServiceAccount,
        [hashtable]$Substitutions,
        [string[]]$Tags
    )

    $subsBlock = ($Substitutions.GetEnumerator() | Sort-Object Name | ForEach-Object { "  $($_.Key): '$($_.Value)'" }) -join "`n"
    $tagsBlock = ($Tags | ForEach-Object { "  - $_" }) -join "`n"

    return @"
name: $TriggerName
description: $Description
filename: $CloudbuildFile
github:
  owner: $GithubOwner
  name: $GithubRepo
  push:
    branch: $Branch
includeBuildLogs: INCLUDE_BUILD_LOGS_WITH_STATUS
serviceAccount: $ServiceAccount
substitutions:
$subsBlock
tags:
$tagsBlock
"@
}

function Set-CloudBuildTrigger {
    param(
        [string]$TriggerName,
        [string]$YamlContent,
        [string]$Project
    )

    $yamlPath = Join-Path $PSScriptRoot "trigger-patches\$TriggerName.yaml"
    New-Item -ItemType Directory -Force -Path (Split-Path $yamlPath) | Out-Null
    Set-Content -Path $yamlPath -Value $YamlContent -Encoding UTF8

    $exists = Test-GcloudResource @("builds", "triggers", "describe", $TriggerName, "--project=$Project")
    if ($exists) {
        Invoke-Gcloud @("builds", "triggers", "update", "github", $TriggerName, "--project=$Project", "--trigger-config=$yamlPath")
    } else {
        Invoke-Gcloud @("builds", "triggers", "create", "github", "--project=$Project", "--trigger-config=$yamlPath")
    }
}

$config = Get-Content -Raw -Path $ConfigPath | ConvertFrom-Json
$project = $config.gcp.projectId
$sa = "projects/$project/serviceAccounts/$($config.gcp.serviceAccount)"

$serviceList = $Service -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
if ($serviceList -contains 'all') {
    $serviceList = @($config.cloudRunApps | ForEach-Object { $_.id })
}

$envList = $Environment -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }

foreach ($serviceId in $serviceList) {
    $app = $config.cloudRunApps | Where-Object { $_.id -eq $serviceId } | Select-Object -First 1
    if (-not $app) { throw "Unknown service: $serviceId" }

    foreach ($envName in $envList) {
        $envProfile = $app.environments.$envName
        if (-not $envProfile) { throw "Unknown environment '$envName' for service '$serviceId'" }

        foreach ($componentName in $app.components) {
            $component = $envProfile.components.$componentName
            if (-not $component) { throw "Missing component '$componentName' for $serviceId / $envName" }

            $triggerName = "$serviceId-$componentName-$envName"
            $subs = @{}
            $component.substitutions.PSObject.Properties | ForEach-Object { $subs[$_.Name] = [string]$_.Value }

            $yaml = New-TriggerYaml `
                -TriggerName $triggerName `
                -Description "Deploy $($component.serviceName) on push to $($envProfile.branch)" `
                -CloudbuildFile $app.cloudbuildFile `
                -GithubOwner $config.github.owner `
                -GithubRepo $app.repo `
                -Branch $envProfile.branch `
                -ServiceAccount $sa `
                -Substitutions $subs `
                -Tags @('gcp-cloud-build-deploy-cloud-run', 'gcp-cloud-build-deploy-cloud-run-managed', $triggerName)

            Write-Host "`n=== $serviceId / $componentName / $envName -> $($component.serviceName) ===" -ForegroundColor Green
            Set-CloudBuildTrigger -TriggerName $triggerName -YamlContent $yaml -Project $project
        }
    }
}

if ($DualTrigger) {
    $dual = $config.dualTrigger
    foreach ($envName in $envList) {
        $dualEnv = $dual.environments.$envName
        if (-not $dualEnv) { throw "Unknown dualTrigger environment: $envName" }

        $triggerName = "$($dual.id)-$envName"
        $subs = @{}
        $dualEnv.substitutions.PSObject.Properties | ForEach-Object { $subs[$_.Name] = [string]$_.Value }

        $yaml = New-TriggerYaml `
            -TriggerName $triggerName `
            -Description "Dual deploy message-relay + report-relay ($envName)" `
            -CloudbuildFile $dual.cloudbuildFile `
            -GithubOwner $config.github.owner `
            -GithubRepo $dual.repo `
            -Branch $dualEnv.branch `
            -ServiceAccount $sa `
            -Substitutions $subs `
            -Tags @('platform-dual-ship', $triggerName)

        Write-Host "`n=== dual trigger / $envName ===" -ForegroundColor Green
        Set-CloudBuildTrigger -TriggerName $triggerName -YamlContent $yaml -Project $project
    }
}

Write-Host "`nNote: Cloud Run services must exist in $project before first deploy." -ForegroundColor Yellow
Write-Host "Done." -ForegroundColor Green
