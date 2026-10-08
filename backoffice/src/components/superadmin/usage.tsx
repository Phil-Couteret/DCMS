// Usage against a quota, as the original TenantManagement showed it: a bar
// with "used/authorized", red from 100%, amber from 80%.
function tone(ratio: number) {
  if (ratio >= 1) return "bg-red-600";
  if (ratio >= 0.8) return "bg-amber-500";
  return "bg-[#0077b6]";
}

function Bar({ ratio, text, title }: { ratio: number; text: string; title: string }) {
  return (
    <div className="min-w-24" title={title}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200" aria-hidden="true">
        <div className={`h-full ${tone(ratio)}`} style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }} />
      </div>
      <p className="mt-0.5 text-xs tabular-nums text-zinc-700">{text}</p>
    </div>
  );
}

export function UsageBar({ used, authorized, label }: { used: number; authorized: number; label: string }) {
  const ratio = authorized > 0 ? used / authorized : used > 0 ? 1 : 0;
  return <Bar ratio={ratio} text={`${used}/${authorized}`} title={`${label}: ${used} of ${authorized} authorized`} />;
}

// "1.25 GB", or "312 MB" / "12 kB" below that.
export function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3 / 1000) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

export function StorageBar({ usedBytes, authorizedBytes, pricePerGbMonth }: { usedBytes: number; authorizedBytes: number; pricePerGbMonth: number }) {
  const ratio = authorizedBytes > 0 ? usedBytes / authorizedBytes : usedBytes > 0 ? 1 : 0;
  const authorizedGb = Math.round(authorizedBytes / 1024 ** 3);
  return (
    <Bar
      ratio={ratio}
      text={`${formatBytes(usedBytes)} / ${authorizedGb} GB`}
      title={`Storage: ${formatBytes(usedBytes)} of ${authorizedGb} GB${pricePerGbMonth > 0 ? ` · ${pricePerGbMonth}/GB/month` : ""}`}
    />
  );
}
