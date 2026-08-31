import { deviceOsInfo } from "@/lib/customer-device-os";

export function DeviceOsBadge({
  deviceOs,
  showEmpty = true,
}: {
  deviceOs?: string | null;
  showEmpty?: boolean;
}) {
  const os = deviceOsInfo(deviceOs);
  if (!os) {
    if (!showEmpty) return null;
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500">
        OS 없음
      </span>
    );
  }

  return (
    <span
      title={os.detail}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
        os.label === "iOS"
          ? "bg-black text-white"
          : os.label === "Android"
          ? "bg-[#3DDC84] text-gray-900"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {os.label}
    </span>
  );
}
