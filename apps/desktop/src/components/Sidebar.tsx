import { useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import {
  Activity,
  ShieldCheck,
  UploadCloud,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Info,
  Download,
} from "lucide-react";
import { api } from "../api";

const NAV = [
  { id: "timeline", label: "生命时间线", sub: "Medical Lifeline", icon: Activity },
  { id: "search", label: "搜索", sub: "Search", icon: Search },
  { id: "import", label: "导入病历", sub: "Import Records", icon: UploadCloud },
];

export default function Sidebar({
  activeTab,
  onNav,
  count,
}: {
  activeTab: string;
  onNav: (id: string) => void;
  count: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<
    { kind: "ok"; text: string; path: string } | { kind: "err"; text: string } | null
  >(null);

  // 导出 v1:选保存路径 → 生成自包含 HTML → 提示可打印/另存为 PDF 交给医生。
  const doExport = async () => {
    let path: string | null;
    try {
      path = await save({
        defaultPath: "MedMe导出.html",
        filters: [{ name: "HTML", extensions: ["html"] }],
      });
    } catch (e) {
      setExportMsg({ kind: "err", text: `选择保存位置失败:${String(e)}` });
      return;
    }
    if (!path) return; // 用户取消
    setExporting(true);
    setExportMsg(null);
    try {
      const summary = await api.exportTimelineHtml(path);
      setExportMsg({
        kind: "ok",
        text: `已导出 ${summary.file_count} 份记录到 ${path},可在浏览器打开后「打印 / 另存为 PDF」交给医生。`,
        path,
      });
    } catch (e) {
      setExportMsg({ kind: "err", text: `导出失败:${String(e)}` });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className={`${
        collapsed ? "w-16" : "w-60"
      } bg-white border-r border-slate-200 flex flex-col h-screen text-slate-600 select-none shrink-0 transition-[width] duration-200`}
    >
      {/* Brand */}
      <div className={`${collapsed ? "px-2 py-4" : "p-5"} border-b border-slate-200`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-blue-600 tracking-tight">MedMe</span>
                <span className="font-bold text-lg text-slate-950">医我</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase block mt-0.5">
                Health Vault
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">个人医疗数据保险箱</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                collapsed ? "justify-center p-2.5" : "justify-between p-3"
              } rounded-xl transition-all cursor-pointer text-left ${
                active
                  ? "bg-blue-50 text-blue-700 border border-blue-100/40"
                  : "border border-transparent hover:bg-slate-50"
              }`}
            >
              <div className={`flex items-center ${collapsed ? "" : "gap-3"} min-w-0`}>
                <Icon
                  className={`w-5 h-5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`}
                />
                {!collapsed && (
                  <div className="min-w-0">
                    <span
                      className={`text-sm font-medium block ${
                        active ? "text-blue-900" : "text-slate-700"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 block">{item.sub}</span>
                  </div>
                )}
              </div>
              {!collapsed && item.id === "timeline" && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle + footer */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={doExport}
          disabled={exporting}
          title={collapsed ? "导出为可打印 HTML" : undefined}
          className={`w-full flex items-center ${
            collapsed ? "justify-center" : "gap-2"
          } p-2.5 rounded-xl cursor-pointer transition-colors text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50 disabled:cursor-wait`}
        >
          <Download className="w-5 h-5 shrink-0" />
          {!collapsed && (
            <span className="text-xs font-medium">{exporting ? "导出中…" : "导出"}</span>
          )}
        </button>
        {!collapsed && exportMsg && (
          <div
            className={`mt-1 mb-1 rounded-xl px-2.5 py-2 text-[11px] leading-relaxed break-all ${
              exportMsg.kind === "ok"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            <div>{exportMsg.text}</div>
            {exportMsg.kind === "ok" && (
              <button
                onClick={() =>
                  api
                    .openPath(exportMsg.path)
                    .catch((e) => setExportMsg({ kind: "err", text: `打开失败:${String(e)}` }))
                }
                className="mt-1 font-medium text-blue-700 hover:underline cursor-pointer"
              >
                打开文件
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => onNav("about")}
          title={collapsed ? "关于 · 声明" : undefined}
          className={`w-full flex items-center ${
            collapsed ? "justify-center" : "gap-2"
          } p-2.5 rounded-xl cursor-pointer transition-colors ${
            activeTab === "about"
              ? "bg-blue-50 text-blue-700"
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          }`}
        >
          <Info className="w-5 h-5 shrink-0" />
          {!collapsed && <span className="text-xs font-medium">关于 · 声明</span>}
        </button>
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "展开" : "收起"}
          className={`w-full flex items-center ${
            collapsed ? "justify-center" : "gap-2"
          } p-2.5 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 cursor-pointer transition-colors`}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5" />
              <span className="text-xs font-mono">收起侧栏</span>
            </>
          )}
        </button>
        {!collapsed && (
          <div className="px-2 pt-2 text-[10px] font-mono text-slate-400 flex justify-between">
            <span>© MedMe 2026</span>
            <span>v0.1</span>
          </div>
        )}
      </div>
    </div>
  );
}
