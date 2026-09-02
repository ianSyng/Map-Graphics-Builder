# Local static server for the portable build. Bind loopback only.
# Keep this window open while you use the app.

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Port = 17321
$Prefix = "http://127.0.0.1:$Port/"

$Mime = @{
  ".html"    = "text/html; charset=utf-8"
  ".js"      = "text/javascript; charset=utf-8"
  ".mjs"     = "text/javascript; charset=utf-8"
  ".css"     = "text/css; charset=utf-8"
  ".json"    = "application/json; charset=utf-8"
  ".geojson" = "application/geo+json; charset=utf-8"
  ".svg"     = "image/svg+xml"
  ".png"     = "image/png"
  ".jpg"     = "image/jpeg"
  ".jpeg"    = "image/jpeg"
  ".webp"    = "image/webp"
  ".gif"     = "image/gif"
  ".ico"     = "image/x-icon"
  ".woff"    = "font/woff"
  ".woff2"   = "font/woff2"
  ".ttf"     = "font/ttf"
  ".csv"     = "text/csv; charset=utf-8"
  ".kml"     = "application/vnd.google-earth.kml+xml"
  ".map"     = "application/json"
  ".wasm"    = "application/wasm"
}

function Get-Mime([string]$ext) {
  if ($Mime.ContainsKey($ext)) { return $Mime[$ext] }
  return "application/octet-stream"
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
try {
  $listener.Start()
} catch {
  Write-Host "Already running at $Prefix"
  Start-Process $Prefix
  exit 0
}

Start-Process $Prefix
Write-Host "Map Graphics Builder"
Write-Host "  $Prefix"
Write-Host "Keep this window open. Close it to quit."
Write-Host ""

$rootFull = [IO.Path]::GetFullPath($Root).TrimEnd("\", "/")
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $raw = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
      $sep = [string][IO.Path]::DirectorySeparatorChar
      $rel = $raw.TrimStart("/").Replace("/", $sep)
      if ([string]::IsNullOrWhiteSpace($rel) -or $rel.EndsWith($sep)) {
        $rel = if ([string]::IsNullOrWhiteSpace($rel)) { "index.html" } else { $rel + "index.html" }
      }
      $full = [IO.Path]::GetFullPath((Join-Path $Root $rel))
      $prefix = $rootFull + $sep
      if (-not ($full.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase))) {
        $res.StatusCode = 403
        continue
      }
      if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        $res.StatusCode = 404
        continue
      }
      $bytes = [IO.File]::ReadAllBytes($full)
      $ext = [IO.Path]::GetExtension($full).ToLowerInvariant()
      $res.StatusCode = 200
      $res.ContentType = Get-Mime $ext
      $res.ContentLength64 = $bytes.Length
      $res.Headers.Add("Cache-Control", "no-cache")
      if ($req.HttpMethod -ne "HEAD") {
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } catch {
      try { $res.StatusCode = 500 } catch { }
    } finally {
      try { $res.Close() } catch { }
    }
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
