import React, { useState, useMemo, useRef } from 'react';
import {
  Printer,
  X,
  Users,
  LayoutGrid,
  FileText,
  Sparkles,
  Download,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../../../context/AppContext';
import { PaperCardStudentInfo } from '../../../../types/paperMode';
import { getArucoSvgString } from '../../../../utils/aruco';

interface PaperCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClassId?: string;
}

export const PaperCardGeneratorModal: React.FC<PaperCardGeneratorModalProps> = ({
  isOpen,
  onClose,
  defaultClassId,
}) => {
  const { classes = [], users = [], currentClassId } = useApp();
  const [selectedClassId, setSelectedClassId] = useState<string>(
    defaultClassId || currentClassId || (classes[0]?.id ?? '')
  );
  const [cardsPerPage, setCardsPerPage] = useState<1 | 2>(2);
  const [cardType, setCardType] = useState<'students' | 'generic'>('students');
  const [genericCount, setGenericCount] = useState<number>(36);

  const activeClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Students in selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return users
      .filter((u) => u.role === 'student' && u.classIds?.includes(selectedClassId))
      .sort((a, b) => {
        const numA = a.absentNumber ?? 999;
        const numB = b.absentNumber ?? 999;
        if (numA !== numB) return numA - numB;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [users, selectedClassId]);

  // List of card data to generate
  const cardDataList = useMemo<PaperCardStudentInfo[]>(() => {
    if (cardType === 'generic') {
      return Array.from({ length: genericCount }, (_, i) => ({
        studentId: `generic_${i + 1}`,
        markerId: i + 1,
        studentName: `Siswa #${i + 1}`,
        absentNumber: i + 1,
        className: activeClass?.name || 'Semua Kelas',
      }));
    }

    return classStudents.map((st, index) => {
      // Map markerId to absentNumber if available, or 1-based index
      const markerId = st.absentNumber && st.absentNumber > 0 ? st.absentNumber : index + 1;
      return {
        studentId: st.uid,
        markerId,
        studentName: st.displayName,
        absentNumber: st.absentNumber ?? index + 1,
        studentNumber: st.studentNumber,
        className: activeClass?.name || 'Kelas Siswa',
      };
    });
  }, [cardType, genericCount, classStudents, activeClass]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-paper-cards, #printable-paper-cards * {
            visibility: visible;
          }
          #printable-paper-cards {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-after {
            page-break-after: always;
            break-after: page;
          }
          .print-card-wrapper {
            box-shadow: none !important;
            border-color: #000000 !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col no-print">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Generator Kartu Marker Siswa
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900">
                  Paper Mode
                </span>
              </h2>
              <p className="text-xs text-indigo-100">
                Cetak kartu jawaban ArUco dengan pilihan A, B, C, D untuk seluruh siswa
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Toolbar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 text-xs">
          {/* Class Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Pilih Rombel / Kelas:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-indigo-500"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({users.filter((u) => u.role === 'student' && u.classIds?.includes(c.id)).length} Siswa)
                </option>
              ))}
            </select>
          </div>

          {/* Mode: Siswa Rombel vs Generic */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Format Kartu:
            </label>
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl font-bold">
              <button
                type="button"
                onClick={() => setCardType('students')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  cardType === 'students'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nama Siswa ({classStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setCardType('generic')}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  cardType === 'generic'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Generik (#1-{genericCount})
              </button>
            </div>
          </div>

          {/* Layout per Halaman */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Ukuran Kertas:
            </label>
            <div className="flex bg-slate-200/80 p-0.5 rounded-xl font-bold">
              <button
                type="button"
                onClick={() => setCardsPerPage(2)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 2
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2 Kartu / Lembar A4 (Standar)
              </button>
              <button
                type="button"
                onClick={() => setCardsPerPage(1)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  cardsPerPage === 1
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 Kartu / A4 (Besar)
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Total <strong>{cardDataList.length} kartu</strong> siap cetak (
              {Math.ceil(cardDataList.length / cardsPerPage)} lembar kertas A4).
              Kartu dapat dilaminasi agar awet digunakan sepanjang semester.
            </span>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Sekarang (PDF)</span>
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-100 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cardDataList.map((card, idx) => (
              <div
                key={card.studentId || idx}
                className="bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-sm relative flex flex-col justify-between"
              >
                {/* Header info */}
                <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                      GAMI-CLASS • MODUS KERTAS
                    </span>
                    <h4 className="text-base font-black text-slate-900 leading-tight">
                      {card.studentName}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500">
                      {card.className} • No. Absen:{' '}
                      <strong className="text-slate-800 font-extrabold">{card.absentNumber}</strong>
                    </p>
                  </div>
                  <div className="text-right bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase block">ID MARKER</span>
                    <span className="text-lg font-black text-indigo-900 leading-none">#{card.markerId}</span>
                  </div>
                </div>

                {/* ArUco Marker with 4 Sides Labels */}
                <div className="relative w-64 h-64 mx-auto my-2 flex items-center justify-center">
                  {/* Top side (A) */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-white font-black text-xl flex items-center justify-center text-slate-900 shadow-xs">
                      A
                    </div>
                    <span className="text-[9px] font-black text-slate-700 mt-0.5">▲ SISI ATAS</span>
                  </div>

                  {/* Right side (B) */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-white font-black text-xl flex items-center justify-center text-slate-900 shadow-xs">
                        B
                      </div>
                      <span className="text-[9px] font-black text-slate-700 mt-0.5">SISI B ▶</span>
                    </div>
                  </div>

                  {/* Bottom side (C) */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-700 mb-0.5">▼ SISI C</span>
                    <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-white font-black text-xl flex items-center justify-center text-slate-900 shadow-xs">
                      C
                    </div>
                  </div>

                  {/* Left side (D) */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-xl border-2 border-slate-900 bg-white font-black text-xl flex items-center justify-center text-slate-900 shadow-xs">
                        D
                      </div>
                      <span className="text-[9px] font-black text-slate-700 mt-0.5">◀ SISI D</span>
                    </div>
                  </div>

                  {/* Central ArUco SVG */}
                  <div
                    className="w-36 h-36 border border-dashed border-slate-300 rounded-lg p-1.5 bg-white flex items-center justify-center"
                    dangerouslySetInnerHTML={{
                      __html: getArucoSvgString(card.markerId, '130px'),
                    }}
                  />
                </div>

                {/* Footer instructions */}
                <div className="border-t border-slate-200 pt-2.5 mt-2 text-[10px] text-center text-slate-600">
                  <strong className="text-slate-900">Petunjuk:</strong> Putar kartu agar huruf jawabanmu (A, B, C, atau D) berada di sisi <strong>PALING ATAS</strong>, lalu angkat menghadap guru.
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Semua Kartu ({cardDataList.length})</span>
          </button>
        </div>
      </div>

      {/* Hidden container specifically for Window.print() */}
      <div id="printable-paper-cards" className="hidden print:block">
        {cardDataList.map((card, idx) => {
          const isPageBreak = cardsPerPage === 1 || idx % 2 === 1;
          return (
            <div
              key={`print_${card.studentId || idx}`}
              className={`print-card-wrapper border-3 border-black p-4 mb-4 bg-white ${
                isPageBreak ? 'page-break-after' : ''
              }`}
              style={{
                boxSizing: 'border-box',
                height: cardsPerPage === 1 ? '94vh' : '46vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-black">
                    GAMI-CLASS • PAPER MODE
                  </div>
                  <div className="text-lg font-black text-black">{card.studentName}</div>
                  <div className="text-xs font-bold text-black">
                    {card.className} • No. Absen: {card.absentNumber}
                  </div>
                </div>
                <div className="text-right border-2 border-black rounded-lg px-3 py-1">
                  <div className="text-[10px] font-black uppercase text-black">MARKER ID</div>
                  <div className="text-xl font-black text-black">#{card.markerId}</div>
                </div>
              </div>

              {/* Marker with 4 Sides Labels */}
              <div className="relative w-64 h-64 mx-auto my-auto flex items-center justify-center">
                {/* Top side (A) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-lg border-3 border-black bg-white font-black text-2xl flex items-center justify-center text-black">
                    A
                  </div>
                  <span className="text-[10px] font-black text-black mt-0.5">▲ SISI ATAS</span>
                </div>

                {/* Right side (B) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-lg border-3 border-black bg-white font-black text-2xl flex items-center justify-center text-black">
                      B
                    </div>
                    <span className="text-[10px] font-black text-black mt-0.5">SISI B ▶</span>
                  </div>
                </div>

                {/* Bottom side (C) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <span className="text-[10px] font-black text-black mb-0.5">▼ SISI C</span>
                  <div className="w-12 h-12 rounded-lg border-3 border-black bg-white font-black text-2xl flex items-center justify-center text-black">
                    C
                  </div>
                </div>

                {/* Left side (D) */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-lg border-3 border-black bg-white font-black text-2xl flex items-center justify-center text-black">
                      D
                    </div>
                    <span className="text-[10px] font-black text-black mt-0.5">◀ SISI D</span>
                  </div>
                </div>

                {/* Central ArUco SVG */}
                <div
                  className="w-40 h-40 flex items-center justify-center"
                  dangerouslySetInnerHTML={{
                    __html: getArucoSvgString(card.markerId, cardsPerPage === 1 ? '180px' : '150px'),
                  }}
                />
              </div>

              {/* Footer */}
              <div className="border-t-2 border-black pt-2 text-center text-xs font-bold text-black">
                Petunjuk: Putar kartu agar huruf jawaban (A, B, C, atau D) berada di sisi PALING ATAS, lalu angkat kartu menghadap ke arah guru.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
