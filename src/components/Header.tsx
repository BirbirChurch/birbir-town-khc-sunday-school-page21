import React from 'react';
import { LogOut, Database, Shield, User, Menu } from 'lucide-react';
import { OrgUnitId, Role } from '../types';
import { getOrgUnitById } from '../constants/churchStructure';

interface HeaderProps {
  currentUserRole: Role | null;
  loggedInTeacherName?: string;
  loggedInChapel?: string | null;
  loggedInUnit?: OrgUnitId | null;
  onLogout: () => void;
  syncStatus: 'connected' | 'saving' | 'offline' | 'error';
  onOpenSyncModal?: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUserRole,
  loggedInTeacherName,
  loggedInChapel,
  loggedInUnit,
  onLogout,
  syncStatus,
  onOpenSyncModal,
  onToggleSidebar
}) => {
  const getRoleLabel = () => {
    if (currentUserRole === 'admin') return 'ዋና አዲሚን (Super Admin)';
    if (currentUserRole === 'leader') {
      if (loggedInChapel) return loggedInChapel;
      if (loggedInUnit) {
        const unit = getOrgUnitById(loggedInUnit);
        if (unit) return unit.name;
      }
      return 'የቤተክርስቲያን መሪ (Leader)';
    }
    if (currentUserRole === 'teacher') return `የልጆች አገልግሎት › መምህር ${loggedInTeacherName || ''}`;
    return 'ያልገቡ';
  };

  return (
    <header className="bg-slate-900 text-white print:hidden border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                aria-label="መዋቅር ማውጫ ክፈት"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-amber-300">✝</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                የብርብር ከተማ ቃለ ሕይወት ቤተ ክርስቲያን
              </h1>
              <p className="text-slate-300 text-xs font-medium mt-0.5">
                የአጥቢያ ቤተ ክርስቲያን መዋቅር እና የተቀናጀ የአገልግሎት መረጃ ሥርዓት
              </p>
            </div>
          </div>

          {/* Status & Sync Badge */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <button
              type="button"
              onClick={onOpenSyncModal}
              disabled={!onOpenSyncModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-sm ${
                onOpenSyncModal ? 'hover:scale-105 cursor-pointer' : 'cursor-default opacity-90'
              } ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : syncStatus === 'saving'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
              title={onOpenSyncModal ? 'የዳታቤዝ ሁኔታን ለማየትና ባክአፕ ለማውረድ ይጫኑ' : 'የአዲሱ Firebase ግንኙነት ሁኔታ'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : syncStatus === 'saving'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-rose-400'
                }`}
              />
              <Database className="w-3.5 h-3.5" />
              <span>
                {syncStatus === 'connected'
                  ? 'ኦንላይን ዳታቤዝ ተገናኝቷል'
                  : syncStatus === 'saving'
                  ? 'በመመዝገብ ላይ...'
                  : 'ከመስመር ውጭ (የተቀመጠ)'}
              </span>
            </button>

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={onOpenSyncModal}
                className="bg-blue-800/80 hover:bg-blue-700 text-amber-300 border border-blue-700/60 text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                title="የJSON ማስገቢያ፣ ባክአፕ ማውረጃና የFirebase ማስተካከያ"
              >
                <span>💾 ዳታቤዝ & JSON</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-bar with active user account control */}
      <div className="bg-slate-900/80 backdrop-blur border-t border-blue-900/50 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
            {currentUserRole ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-900/60 border border-blue-700/60 text-slate-200 text-xs font-medium">
                {currentUserRole === 'admin' ? (
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <span>{getRoleLabel()}</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">እባክዎ መግቢያዎን ይምረጡ</span>
            )}
          </div>

          {currentUserRole && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 bg-rose-600/90 hover:bg-rose-500 text-white text-xs px-3 py-1.5 rounded-md font-semibold transition shadow cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              ውጣ
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
