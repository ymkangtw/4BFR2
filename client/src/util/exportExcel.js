import * as XLSX from 'xlsx-js-style';

const HEADER_STYLE = {
    font: { bold: true, sz: 12 },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { patternType: 'solid', fgColor: { rgb: 'F3F4F6' } },
    border: {
        top: { style: 'thin', color: { rgb: 'BFBFBF' } },
        bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
        left: { style: 'thin', color: { rgb: 'BFBFBF' } },
        right: { style: 'thin', color: { rgb: 'BFBFBF' } }
    }
};

const DATA_STYLE = {
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
        top: { style: 'thin', color: { rgb: 'E5E7EB' } },
        bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
        left: { style: 'thin', color: { rgb: 'E5E7EB' } },
        right: { style: 'thin', color: { rgb: 'E5E7EB' } }
    }
};

function visualLen(s) {
    if (s == null) return 0;
    let len = 0;
    for (const ch of String(s)) {
        if (/[　-鿿＀-￯]/.test(ch)) len += 2;
        else len += 1;
    }
    return len;
}

/**
 * 將陣列資料匯出為 Excel 檔，套用標題置中粗體 + 資料左對齊垂直置中、
 * 自動欄寬（依資料視覺長度）、自動列高（依 \r\n 換行數）。
 *
 * @param {Object} opts
 * @param {Array<Object>} opts.rows         資料列陣列
 * @param {Array<{key:string,label:string}>} opts.columns 欄位定義（順序即 Excel 欄位順序）
 * @param {string} opts.filename            下載檔名（含 .xlsx 副檔名）
 * @param {string} [opts.sheetName='Sheet1'] 工作表名稱
 */
export function exportExcel({ rows, columns, filename, sheetName = 'Sheet1' }) {
    const header = columns.map(c => c.label);
    const data = rows.map(r => columns.map(c => r[c.key] ?? ''));
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);

    for (let c = 0; c < columns.length; c++) {
        const headRef = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[headRef]) ws[headRef].s = HEADER_STYLE;
        for (let r = 1; r <= data.length; r++) {
            const ref = XLSX.utils.encode_cell({ r, c });
            if (ws[ref]) ws[ref].s = DATA_STYLE;
        }
    }

    ws['!cols'] = columns.map((col, idx) => {
        let max = visualLen(col.label);
        for (const row of data) {
            const cell = row[idx];
            if (cell == null) continue;
            for (const line of String(cell).split(/\r?\n/)) {
                const w = visualLen(line);
                if (w > max) max = w;
            }
        }
        return { wch: Math.min(Math.max(max + 2, 8), 60) };
    });

    const rowHeights = [{ hpt: 24 }];
    for (const row of data) {
        let maxLines = 1;
        for (const cell of row) {
            if (cell == null) continue;
            const n = String(cell).split(/\r?\n/).length;
            if (n > maxLines) maxLines = n;
        }
        rowHeights.push({ hpt: Math.max(maxLines * 18, 20) });
    }
    ws['!rows'] = rowHeights;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
}
