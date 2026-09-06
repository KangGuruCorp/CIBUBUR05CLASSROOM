import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  absentNumber?: number;
  displayName: string;
  studentNumber: string;
  username?: string;
  password?: string;
  email?: string;
  isValid: boolean;
  errorMessage?: string;
}

export interface ExcelColumnOption {
  index: number;
  letter: string;
  headerLabel: string;
  sampleValue?: string;
}

export interface DetectedColumnMapping {
  headerRowIndex: number;
  dataStartRowIndex: number;
  nameColIdx: number;
  absentColIdx: number;
  nisColIdx: number;
  usernameColIdx: number;
  passwordColIdx: number;
  emailColIdx: number;
}

export interface ExcelWorkbookAnalysis {
  sheetNames: string[];
  selectedSheet: string;
  rawMatrix: any[][];
  columnOptions: ExcelColumnOption[];
  detectedMapping: DetectedColumnMapping;
  parsedStudents: ParsedStudentRow[];
}

/**
 * Converts zero-based column index to Excel column letter (0 -> A, 1 -> B, 26 -> AA)
 */
export function colIndexToLetter(idx: number): string {
  let letter = '';
  let temp = idx;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Cleans student name from leading numbers like "1. Budi", extra spaces, quotes, etc.
 */
export function cleanStudentName(raw: string): string {
  if (!raw) return '';
  let cleaned = String(raw).trim();
  // Remove leading numbers like "1. ", "01. ", "1 - ", "1) ", "[1] "
  cleaned = cleaned.replace(/^\s*\[?\d+[\.\-\)\:\s\]]+\s*/, '');
  // Remove quotes or stray brackets at edges
  cleaned = cleaned.replace(/^["'\[\(]+|["'\]\)]+$/g, '');
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}

/**
 * Checks if a string looks like a summary/footer row in Indonesian school documents
 */
const FOOTER_KEYWORDS = [
  'jumlah',
  'total',
  'laki-laki',
  'perempuan',
  'rata-rata',
  'mengetahui',
  'kepala sekolah',
  'guru kelas',
  'wali kelas',
  'nip.',
  'nip :',
  'catatan:',
  'keterangan',
  'dicetak pada',
  'halaman',
];

export function isFooterOrSummaryRow(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return FOOTER_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Downloads a sample formatted Excel file (.xlsx) template for student data import
 */
export function downloadStudentExcelTemplate(className: string = 'Kelas'): void {
  const headers = ['No. Absen', 'Nama Lengkap Siswa', 'NIS / No Induk', 'Username (Opsional)', 'Kata Sandi (Opsional)', 'Email (Opsional)'];
  const sampleData = [
    [1, 'Ahmad Fauzi Pratama', '2024001', 'ahmad2024', '123456', 'ahmad.fauzi@sekolah.id'],
    [2, 'Bella Anindita Putri', '2024002', 'bella2024', '123456', 'bella.anindita@sekolah.id'],
    [3, 'Candra Kurniawan', '2024003', 'candra2024', '123456', 'candra.kurnia@sekolah.id'],
    [4, 'Dinda Aulia Rahma', '2024004', 'dinda2024', '123456', 'dinda.aulia@sekolah.id'],
    [5, 'Eko Wahyudi', '2024005', 'eko2024', '123456', 'eko.wahyudi@sekolah.id'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  ws['!cols'] = [
    { wch: 10 }, // No. Absen
    { wch: 28 }, // Nama Siswa
    { wch: 16 }, // NIS
    { wch: 18 }, // Username
    { wch: 18 }, // Kata Sandi
    { wch: 28 }, // Email
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');

  const fileName = `Template_Import_Siswa_${className.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Downloads a CSV formatted template
 */
export function downloadStudentCsvTemplate(): void {
  const csvContent =
    'No. Absen,Nama Lengkap Siswa,NIS / No Induk,Username (Opsional),Kata Sandi (Opsional),Email (Opsional)\n' +
    '1,Ahmad Fauzi Pratama,2024001,ahmad2024,123456,ahmad.fauzi@sekolah.id\n' +
    '2,Bella Anindita Putri,2024002,bella2024,123456,bella.anindita@sekolah.id\n' +
    '3,Candra Kurniawan,2024003,candra2024,123456,candra.kurnia@sekolah.id\n';

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Template_Import_Siswa.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export current list of students to Excel
 */
export function exportStudentsToExcel(
  students: Array<{
    absentNumber?: number;
    displayName: string;
    studentNumber?: string;
    username?: string;
    password?: string;
    email?: string;
    points?: number;
    level?: number;
  }>,
  className: string = 'Kelas'
): void {
  const headers = ['No. Absen', 'Nama Lengkap', 'NIS', 'Username Login', 'Kata Sandi', 'Email', 'Level', 'Total Poin'];
  const rows = students.map((s) => [
    s.absentNumber || '-',
    s.displayName,
    s.studentNumber || '-',
    s.username || (s.studentNumber ? `siswa_${s.studentNumber}` : '-'),
    s.password || '123456',
    s.email || '-',
    s.level || 1,
    s.points || 0,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
    { wch: 10 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa');

  const fileName = `Daftar_Akun_Siswa_${className.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Intelligently analyzes raw sheet matrix to detect header row and column mappings.
 */
export function detectColumnsFromMatrix(rawMatrix: any[][]): DetectedColumnMapping {
  if (!rawMatrix || rawMatrix.length === 0) {
    return {
      headerRowIndex: 0,
      dataStartRowIndex: 1,
      nameColIdx: -1,
      absentColIdx: -1,
      nisColIdx: -1,
      usernameColIdx: -1,
      passwordColIdx: -1,
      emailColIdx: -1,
    };
  }

  const maxScanRows = Math.min(rawMatrix.length, 30);
  let bestHeaderRow = -1;
  let highestScore = -100;
  let bestMapping: DetectedColumnMapping = {
    headerRowIndex: 0,
    dataStartRowIndex: 1,
    nameColIdx: -1,
    absentColIdx: -1,
    nisColIdx: -1,
    usernameColIdx: -1,
    passwordColIdx: -1,
    emailColIdx: -1,
  };

  // Score candidate header rows
  for (let r = 0; r < maxScanRows; r++) {
    const row = rawMatrix[r] as any[];
    if (!row || row.length === 0) continue;

    // Next row could be subheaders (common in merged header rows)
    const nextRow = (rawMatrix[r + 1] as any[]) || [];

    let nameCol = -1;
    let absentCol = -1;
    let nisCol = -1;
    let usernameCol = -1;
    let passwordCol = -1;
    let emailCol = -1;
    let headerKeywordsFound = 0;
    let nonBlankCells = 0;
    let totalChars = 0;

    const maxCols = Math.max(row.length, nextRow.length);

    for (let c = 0; c < maxCols; c++) {
      const cellVal = String(row[c] || '').trim();
      const nextCellVal = String(nextRow[c] || '').trim();
      if (cellVal) {
        nonBlankCells++;
        totalChars += cellVal.length;
      }

      const combinedLower = (cellVal + ' ' + nextCellVal).toLowerCase().trim();
      const cellLower = cellVal.toLowerCase();

      // Negative keywords for name: e.g. nama ayah, nama ibu, nama wali, nama guru, nama sekolah
      const isParentOrSchool =
        combinedLower.includes('ayah') ||
        combinedLower.includes('ibu') ||
        combinedLower.includes('wali') ||
        combinedLower.includes('ortu') ||
        combinedLower.includes('orang tua') ||
        combinedLower.includes('guru') ||
        combinedLower.includes('sekolah') ||
        combinedLower.includes('kelas') ||
        combinedLower.includes('mapel') ||
        combinedLower.includes('pelajaran');

      // 1. NAME DETECTION
      if (!isParentOrSchool) {
        if (
          combinedLower.includes('nama lengkap') ||
          combinedLower.includes('nama peserta didik') ||
          combinedLower.includes('nama siswa') ||
          combinedLower.includes('nama murid') ||
          combinedLower.includes('nama anak') ||
          combinedLower.includes('student name') ||
          combinedLower.includes('full name')
        ) {
          nameCol = c;
          headerKeywordsFound += 4;
        } else if (nameCol === -1 && (cellLower === 'nama' || cellLower.startsWith('nama ') || cellLower.includes('peserta didik'))) {
          nameCol = c;
          headerKeywordsFound += 3;
        } else if (nameCol === -1 && (cellLower === 'siswa' || cellLower === 'murid')) {
          nameCol = c;
          headerKeywordsFound += 2;
        }
      }

      // 2. NO / ABSEN DETECTION
      const isPhoneOrOtherNo =
        combinedLower.includes('telp') ||
        combinedLower.includes('hp') ||
        combinedLower.includes('handphone') ||
        combinedLower.includes('induk') ||
        combinedLower.includes('peserta') ||
        combinedLower.includes('ujian') ||
        combinedLower.includes('rekening') ||
        combinedLower.includes('ijazah');

      if (!isPhoneOrOtherNo) {
        if (
          combinedLower.includes('no. absen') ||
          combinedLower.includes('nomor absen') ||
          combinedLower.includes('no absen') ||
          combinedLower.includes('no. urut') ||
          combinedLower.includes('nomor urut') ||
          combinedLower.includes('no urut')
        ) {
          absentCol = c;
          headerKeywordsFound += 3;
        } else if (
          absentCol === -1 &&
          (cellLower === 'no' || cellLower === 'no.' || cellLower === 'nomor' || cellLower === 'absen')
        ) {
          absentCol = c;
          headerKeywordsFound += 2;
        }
      }

      // 3. NIS / NISN DETECTION
      if (
        combinedLower.includes('nisn') ||
        combinedLower.includes('nis/nisn') ||
        combinedLower.includes('nisn/nis') ||
        combinedLower.includes('no. induk') ||
        combinedLower.includes('nomor induk') ||
        combinedLower.includes('no induk') ||
        combinedLower.includes('nipd') ||
        combinedLower.includes('nik') ||
        cellLower === 'nis' ||
        cellLower.startsWith('nis ')
      ) {
        nisCol = c;
        headerKeywordsFound += 3;
      }

      // 4. EMAIL
      if (combinedLower.includes('email') || combinedLower.includes('e-mail') || combinedLower.includes('surel')) {
        emailCol = c;
        headerKeywordsFound += 2;
      }

      // 5. USERNAME
      if (combinedLower.includes('username') || combinedLower.includes('nama pengguna') || combinedLower.includes('akun')) {
        usernameCol = c;
        headerKeywordsFound += 2;
      }

      // 6. PASSWORD
      if (combinedLower.includes('password') || combinedLower.includes('kata sandi') || combinedLower.includes('pin')) {
        passwordCol = c;
        headerKeywordsFound += 2;
      }

      // Other school table indicators (JK, Tempat Lahir, Agama)
      if (
        combinedLower.includes('jk') ||
        combinedLower.includes('l/p') ||
        combinedLower.includes('jenis kelamin') ||
        combinedLower.includes('tempat lahir') ||
        combinedLower.includes('tanggal lahir') ||
        combinedLower.includes('agama')
      ) {
        headerKeywordsFound += 1;
      }
    }

    // Penalize if it's a banner title (only 1 cell, or cell has > 40 chars)
    if (nonBlankCells <= 1 && totalChars > 25) {
      headerKeywordsFound -= 5;
    }

    let rowScore = headerKeywordsFound * 10;
    if (nameCol !== -1) rowScore += 30;
    if (nisCol !== -1) rowScore += 15;
    if (absentCol !== -1) rowScore += 15;

    // Check if the following row has student-like data
    const dataCheckRow = (rawMatrix[r + 1] as any[]) || [];
    if (nameCol !== -1 && dataCheckRow[nameCol]) {
      const testVal = String(dataCheckRow[nameCol]).trim();
      if (testVal.length >= 3 && /[a-zA-Z]/.test(testVal) && !testVal.toLowerCase().includes('nama')) {
        rowScore += 25; // Confirmed data row follows!
      }
    }

    if (rowScore > highestScore && (nameCol !== -1 || headerKeywordsFound >= 3)) {
      highestScore = rowScore;
      bestHeaderRow = r;

      // Determine if r+1 is a sub-header row (e.g. NISN under Nomor Induk)
      let dataStart = r + 1;
      const rPlus1Text = ((rawMatrix[r + 1] as any[]) || []).map((x) => String(x || '').toLowerCase()).join(' ');
      if (rPlus1Text.includes('nisn') || rPlus1Text.includes('l/p') || rPlus1Text.includes('nis')) {
        dataStart = r + 2;
      }

      bestMapping = {
        headerRowIndex: r,
        dataStartRowIndex: dataStart,
        nameColIdx: nameCol,
        absentColIdx: absentCol,
        nisColIdx: nisCol,
        usernameColIdx: usernameCol,
        passwordColIdx: passwordCol,
        emailColIdx: emailCol,
      };
    }
  }

  // FALLBACK HEURISTIC: If name column wasn't detected by header text, profile column values!
  if (bestMapping.nameColIdx === -1 && rawMatrix.length > 0) {
    const colStats: Record<number, { nameLike: number; numberLike: number; total: number }> = {};
    const maxScan = Math.min(rawMatrix.length, 40);

    for (let r = 0; r < maxScan; r++) {
      const row = rawMatrix[r] as any[];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim();
        if (!val) continue;

        if (!colStats[c]) colStats[c] = { nameLike: 0, numberLike: 0, total: 0 };
        colStats[c].total++;

        // Is it purely numeric?
        if (/^\d+$/.test(val)) {
          colStats[c].numberLike++;
        } else if (
          val.length >= 3 &&
          val.length <= 50 &&
          /[a-zA-Z]/.test(val) &&
          !isFooterOrSummaryRow(val) &&
          !val.toLowerCase().includes('kelas') &&
          !val.toLowerCase().includes('sd negeri') &&
          !val.toLowerCase().includes('daftar')
        ) {
          colStats[c].nameLike++;
        }
      }
    }

    // Pick column with highest nameLike count
    let maxNameCol = -1;
    let maxNameCount = 0;
    Object.entries(colStats).forEach(([cStr, stat]) => {
      const c = Number(cStr);
      if (stat.nameLike > maxNameCount) {
        maxNameCount = stat.nameLike;
        maxNameCol = c;
      }
    });

    if (maxNameCol !== -1) {
      bestMapping.nameColIdx = maxNameCol;

      // Find first data row where this column has a name
      for (let r = 0; r < maxScan; r++) {
        const row = rawMatrix[r] as any[];
        const val = String(row?.[maxNameCol] || '').trim();
        if (val.length >= 3 && /[a-zA-Z]/.test(val) && !isFooterOrSummaryRow(val)) {
          bestMapping.dataStartRowIndex = r;
          bestMapping.headerRowIndex = Math.max(0, r - 1);
          break;
        }
      }

      // If absent column is unknown, pick a column with sequential small numbers
      if (bestMapping.absentColIdx === -1) {
        for (let c = 0; c < maxNameCol; c++) {
          if (colStats[c] && colStats[c].numberLike >= 2) {
            bestMapping.absentColIdx = c;
            break;
          }
        }
      }

      // If NIS column is unknown, pick another numeric column with digits
      if (bestMapping.nisColIdx === -1) {
        Object.entries(colStats).forEach(([cStr, stat]) => {
          const c = Number(cStr);
          if (c !== bestMapping.nameColIdx && c !== bestMapping.absentColIdx && stat.numberLike >= 2) {
            bestMapping.nisColIdx = c;
          }
        });
      }
    }
  }

  return bestMapping;
}

/**
 * Generates parsed student rows from matrix given a specific column mapping.
 * Pure function so it can be re-run instantly when user adjusts mapping dropdowns.
 */
export function generateStudentsFromMatrix(
  rawMatrix: any[][],
  mapping: {
    dataStartRowIndex: number;
    nameColIdx: number;
    absentColIdx: number;
    nisColIdx: number;
    usernameColIdx: number;
    passwordColIdx: number;
    emailColIdx: number;
  }
): ParsedStudentRow[] {
  if (!rawMatrix || rawMatrix.length === 0 || mapping.nameColIdx === -1) {
    return [];
  }

  const parsedRows: ParsedStudentRow[] = [];
  const startIndex = Math.max(0, mapping.dataStartRowIndex);

  for (let r = startIndex; r < rawMatrix.length; r++) {
    const row = rawMatrix[r] as any[];
    if (!row || row.length === 0) continue;

    const rawNameCell = String(row[mapping.nameColIdx] || '').trim();
    const rawNis = mapping.nisColIdx !== -1 ? String(row[mapping.nisColIdx] || '').trim() : '';
    const rawAbsent = mapping.absentColIdx !== -1 ? String(row[mapping.absentColIdx] || '').trim() : '';
    const rawUsername = mapping.usernameColIdx !== -1 ? String(row[mapping.usernameColIdx] || '').trim() : '';
    const rawPassword = mapping.passwordColIdx !== -1 ? String(row[mapping.passwordColIdx] || '').trim() : '';
    const rawEmail = mapping.emailColIdx !== -1 ? String(row[mapping.emailColIdx] || '').trim() : '';

    // Check if entire row is empty
    const rowConcat = row.map((x) => String(x || '').trim()).join('');
    if (!rowConcat) continue;

    // Check if this row is a footer, metadata, or summary row (e.g. Jumlah, Laki-laki, Mengetahui Kepala Sekolah)
    if (isFooterOrSummaryRow(rawNameCell) || isFooterOrSummaryRow(rowConcat)) {
      continue;
    }

    // Clean student name
    const cleanedName = cleanStudentName(rawNameCell);

    // If cleaned name is empty or just punctuation/numbers, check if another column had the name
    if (!cleanedName || !/[a-zA-Z]/.test(cleanedName)) {
      continue;
    }

    // Determine absent number
    let absentNumber = parseInt(rawAbsent, 10);
    if (isNaN(absentNumber) || absentNumber <= 0) {
      // Check if rawNameCell had leading number e.g. "1. Budi"
      const matchLeadingNo = String(rawNameCell).match(/^\s*(\d+)[\.\-\)\s]/);
      if (matchLeadingNo && matchLeadingNo[1]) {
        absentNumber = parseInt(matchLeadingNo[1], 10);
      } else {
        absentNumber = parsedRows.length + 1;
      }
    }

    // Determine NIS / Student Number
    let studentNumber = rawNis;
    if (!studentNumber) {
      studentNumber = `2024${String(absentNumber).padStart(3, '0')}`;
    }

    let isValid = true;
    let errorMessage: string | undefined;

    if (cleanedName.length < 2) {
      isValid = false;
      errorMessage = 'Nama siswa terlalu pendek';
    }

    parsedRows.push({
      absentNumber,
      displayName: cleanedName,
      studentNumber,
      username: rawUsername || undefined,
      password: rawPassword || undefined,
      email: rawEmail || undefined,
      isValid,
      errorMessage,
    });
  }

  return parsedRows;
}

/**
 * Builds list of column options (index, column letter, header text, and sample value)
 * for the UI dropdowns.
 */
export function extractColumnOptions(rawMatrix: any[][], headerRowIndex: number, dataStartRowIndex: number): ExcelColumnOption[] {
  if (!rawMatrix || rawMatrix.length === 0) return [];

  const headerRow = (rawMatrix[headerRowIndex] as any[]) || [];
  const sampleRow = (rawMatrix[dataStartRowIndex] as any[]) || (rawMatrix[headerRowIndex + 1] as any[]) || [];

  // Determine maximum column count across first 15 rows
  let maxCols = headerRow.length;
  for (let r = 0; r < Math.min(rawMatrix.length, 15); r++) {
    if (rawMatrix[r] && rawMatrix[r].length > maxCols) {
      maxCols = rawMatrix[r].length;
    }
  }

  const options: ExcelColumnOption[] = [];
  for (let c = 0; c < maxCols; c++) {
    const letter = colIndexToLetter(c);
    const headerText = String(headerRow[c] || '').trim();
    const sampleVal = String(sampleRow[c] || '').trim();

    let label = `Kolom ${letter}`;
    if (headerText) {
      label += `: ${headerText}`;
    } else if (sampleVal) {
      label += ` (Contoh: ${sampleVal.slice(0, 15)})`;
    }

    options.push({
      index: c,
      letter,
      headerLabel: label,
      sampleValue: sampleVal,
    });
  }

  return options;
}

/**
 * Reads workbook, chooses best sheet, detects columns, and returns rich analysis.
 */
export async function analyzeExcelFile(file: File, preferredSheet?: string): Promise<ExcelWorkbookAnalysis> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames || [];

        if (sheetNames.length === 0) {
          throw new Error('Berkas Excel tidak memiliki sheet yang dapat dibaca.');
        }

        // Determine best sheet
        let targetSheetName = preferredSheet || sheetNames[0];
        if (!preferredSheet) {
          let highestSheetScore = -100;
          for (const sName of sheetNames) {
            const sheet = workbook.Sheets[sName];
            const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (!raw || raw.length === 0) continue;

            let sScore = raw.length;
            const lowerName = sName.toLowerCase();
            if (lowerName.includes('cover') || lowerName.includes('petunjuk') || lowerName.includes('rekap')) {
              sScore -= 100;
            }
            if (lowerName.includes('siswa') || lowerName.includes('murid') || lowerName.includes('kelas') || lowerName.includes('data')) {
              sScore += 50;
            }

            // Quick check first 10 rows for "nama"
            const sampleText = raw.slice(0, 10).map((r) => r.join(' ')).join(' ').toLowerCase();
            if (sampleText.includes('nama')) sScore += 40;

            if (sScore > highestSheetScore) {
              highestSheetScore = sScore;
              targetSheetName = sName;
            }
          }
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const rawMatrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        const detectedMapping = detectColumnsFromMatrix(rawMatrix);
        const columnOptions = extractColumnOptions(rawMatrix, detectedMapping.headerRowIndex, detectedMapping.dataStartRowIndex);
        const parsedStudents = generateStudentsFromMatrix(rawMatrix, detectedMapping);

        resolve({
          sheetNames,
          selectedSheet: targetSheetName,
          rawMatrix,
          columnOptions,
          detectedMapping,
          parsedStudents,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Backward-compatible helper that parses an uploaded file and returns student rows.
 */
export async function parseExcelOrCsvFile(file: File): Promise<ParsedStudentRow[]> {
  const analysis = await analyzeExcelFile(file);
  return analysis.parsedStudents;
}
