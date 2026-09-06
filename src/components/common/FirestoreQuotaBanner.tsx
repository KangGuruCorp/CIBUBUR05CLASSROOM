import React, { useState } from 'react';
import { AlertCircle, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const FirestoreQuotaBanner: React.FC = () => {
  const { isQuotaExceeded } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isQuotaExceeded || isDismissed) {
    return null;
  }

  const firestoreConsoleUrl =
    'https://console.firebase.google.com/project/smart-acronym-xxjsq/firestore/databases/ai-studio-gamiclass-f7e9d407-ee3c-4c82-83a4-4f566cc82f11/data?openUpgradeDialog=true';
  const pricingUrl = 'https://firebase.google.com/pricing#cloud-firestore';

  return (
    <div
      id="firestore-quota-warning-banner"
      className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-3 text-sm z-40 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-950">
                Batas Kuota Harian Firebase Tercapai (Spark Free Tier)
              </span>
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Mode Offline-First Aktif (Data Aman)
              </span>
            </div>
            <p className="text-amber-800 text-xs md:text-sm mt-1 leading-relaxed">
              Batas unit penulisan harian Firestore telah tercapai hari ini dan akan otomatis direset besok oleh Firebase.
              Aplikasi tetap beroperasi penuh secara lokal di perangkat Anda: pembuatan materi, tugas, nilai, dan papan ide tersimpan aman di peramban.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <a
            id="btn-open-firebase-console"
            href={firestoreConsoleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white font-medium text-xs hover:bg-amber-700 transition shadow-sm"
          >
            <span>Buka Firebase Console</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            id="btn-info-pricing"
            href={pricingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 font-medium text-xs hover:bg-amber-100 transition"
          >
            <span>Info Kuota Spark</span>
            <ExternalLink className="w-3 h-3 text-amber-600" />
          </a>
          <button
            id="btn-dismiss-quota-banner"
            onClick={() => setIsDismissed(true)}
            aria-label="Tutup pemberitahuan kuota"
            className="p-1.5 text-amber-600 hover:text-amber-900 rounded-lg hover:bg-amber-200/60 transition ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
