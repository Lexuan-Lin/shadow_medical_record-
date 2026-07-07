import { ShieldCheck } from "lucide-react";

// 软件声明(中文优先 + 英文翻译)。本项目优先中文使用者。
export default function AboutView() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">关于 · 软件声明</h1>
            <span className="text-[11px] font-mono text-slate-400 tracking-widest uppercase">
              MedMe 医我 · Statement
            </span>
          </div>
        </div>

        {/* 中文(优先) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-slate-800 font-semibold mb-3">本软件的宗旨</div>
          <ol className="space-y-3 text-[15px] leading-relaxed text-slate-700 list-decimal pl-5">
            <li>收集个人零散的医疗数据,聚合成可随身携带的电子数据保险箱。</li>
            <li>数据的调用,须经本人或其相关法定责任人同意。</li>
            <li>本软件<b className="text-slate-900">不提供任何医疗建议</b>,仅帮助整理与保存数据。</li>
            <li>所有数据存储于账号所有者自行设置的可信本地或云端位置。</li>
            <li>
              若怀疑数据遗失,请联系开发者寻求帮助;但因本软件采用去中心化存储,我们不一定能够协助找回。
            </li>
          </ol>
        </div>

        {/* English translation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="text-slate-800 font-semibold mb-3">Purpose of this software</div>
          <ol className="space-y-3 text-[15px] leading-relaxed text-slate-600 list-decimal pl-5">
            <li>
              Collect scattered personal medical data and aggregate it into a portable personal data
              vault.
            </li>
            <li>
              Access to the data requires the consent of the individual or their legal
              representative.
            </li>
            <li>
              This software <b className="text-slate-800">provides no medical advice</b>; it only
              helps organize and preserve data.
            </li>
            <li>
              All data is stored in a trusted local or cloud location configured by the account
              owner.
            </li>
            <li>
              If you suspect data loss, contact the developer for help; however, because storage is
              decentralized, we may not be able to recover it.
            </li>
          </ol>
        </div>

        <div className="text-xs font-mono text-slate-400 text-center">© MedMe Team 2026 · v0.1</div>
      </div>
    </div>
  );
}
