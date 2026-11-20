import React, { useState, useMemo } from 'react';
import { Languages, Copy, Check, X, Sparkles, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ChurchMember, ChurchChild } from '../types';
import { transliterateAmharicToEnglish } from '../utils/amharicTransliterator';
import { copyTextSafely } from '../utils/clipboard';

interface NameTransliteratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchMembers?: ChurchMember[];
  churchChildren?: ChurchChild[];
}

export const NameTransliteratorModal: React.FC<NameTransliteratorModalProps> = ({
  isOpen,
  onClose,
  churchMembers = [],
  churchChildren = []
}) => {
  const [inputText, setInputText] = useState<string>(
    'ገላትያ ደስታ ዳና\nዘላለም ማዴቦ ዋዳ\nካይሮስ ገላትያ ደስታ'
  );
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const convertedLines = useMemo(() => {
    return inputText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((am) => ({
        amharic: am,
        english: transliterateAmharicToEnglish(am)
      }));
  }, [inputText]);

  if (!isOpen) return null;

  const handleCopyAll = () => {
    const output = convertedLines.map((l) => l.english).join('\n');
    if (!output) return;
    void copyTextSafely(output);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleExportConvertedExcel = () => {
    if (convertedLines.length === 0) return;
    const headers = ['ተ.ቁ', 'ስም (በአማርኛ)', 'ስም በእንግሊዝኛ (ቀጥታ ፊደል / English Phonetic)'];
    const rows = convertedLines.map((l, idx) => [idx + 1, l.amharic, l.english]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'ስም ወደ እንግሊዝኛ');
    XLSX.writeFile(wb, 'ስሞች_በአማርኛና_በእንግሊዝኛ.xlsx');
  };

  const handleLoadMembersSample = (source: 'members' | 'children') => {
    const list =
      source === 'members'
        ? churchMembers.map((m) => m.name).filter(Boolean)
        : churchChildren.map((c) => c.name).filter(Boolean);
    if (list.length === 0) {
      alert('በተመረጠው ቋት ውስጥ የተመዘገበ ስም የለም!');
      return;
    }
    setInputText(list.join('\n'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                ስሞችን ምንም ትርጉም ሳይሰጥ ቀጥታ ወደ እንግሊዝኛ መቀየሪያ
              </h3>
              <p className="text-xs text-slate-500">
                የአማርኛ ስሞችን በድምፃቸው (ምሳሌ፦ ተስፋዬ → Tesfaye፣ ገላትያ ደስታ → Gelatya Desta) በቀጥታ ወደ እንግሊዝኛ ፊደል ይቀይራል
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {churchMembers.length > 0 && (
              <button
                type="button"
                onClick={() => handleLoadMembersSample('members')}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                <span>ሁሉንም የቤተክርስቲያን አባላት አምጣ ({churchMembers.length})</span>
              </button>
            )}
            {churchChildren.length > 0 && (
              <button
                type="button"
                onClick={() => handleLoadMembersSample('children')}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>ሁሉንም የልጆች ቋት አምጣ ({churchChildren.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAll}
              disabled={convertedLines.length === 0}
              className="px-3 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAll ? 'ሁሉም ተቀድቷል!' : 'በእንግሊዝኛ ቅዳ'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportConvertedExcel}
              disabled={convertedLines.length === 0}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ኤክሴል አውርድ</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-800 mb-1.5">
              በአማርኛ ስሞች ያስገቡ (በየመስመሩ አንድ ስም)፦
            </label>
            <textarea
              rows={10}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="ስሞችን እዚህ ይጻፉ ወይም Paste ያድርጉ..."
              className="w-full p-3 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-slate-50 focus:bg-white font-bold text-slate-900 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-indigo-950 mb-1.5">
              ቀጥታ ወደ እንግሊዝኛ የተቀየሩ ስሞች ({convertedLines.length})፦
            </label>
            <div className="border border-indigo-200 rounded-xl bg-indigo-50/40 max-h-[270px] overflow-y-auto divide-y divide-indigo-100">
              {convertedLines.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  የሚቀየር ስም ያስገቡ...
                </div>
              ) : (
                convertedLines.map((item, idx) => (
                  <div
                    key={`conv_${idx}`}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-white transition"
                  >
                    <span className="text-slate-600 font-semibold truncate max-w-[45%]">
                      {idx + 1}. {item.amharic}
                    </span>
                    <span className="font-bold text-indigo-950 text-right truncate">
                      {item.english}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            ዝጋ
          </button>
        </div>
      </div>
    </div>
  );
};
