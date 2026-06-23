import * as XLSX from 'xlsx';
import { Platform } from 'react-native';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Expense } from '../types';
import { formatDate } from './dateFormat';
import i18n from '../i18n';

function appendTotalsRow(
  ws: XLSX.WorkSheet,
  rowCount: number,
  htColIdx: number,
  ttcColIdx: number,
  totalLabel: string,
  countLabel: string
): void {
  if (rowCount === 0) return;

  const firstDataRow = 2;
  const lastDataRow = rowCount + 1;
  const totalRowIdx = lastDataRow;

  const htCol = XLSX.utils.encode_col(htColIdx);
  const ttcCol = XLSX.utils.encode_col(ttcColIdx);
  const countColIdx = Math.max(1, htColIdx - 1);

  ws[XLSX.utils.encode_cell({ r: totalRowIdx, c: 0 })] = { t: 's', v: totalLabel };
  ws[XLSX.utils.encode_cell({ r: totalRowIdx, c: countColIdx })] = { t: 's', v: countLabel };
  ws[XLSX.utils.encode_cell({ r: totalRowIdx, c: htColIdx })] = {
    t: 'n',
    f: `SUM(${htCol}${firstDataRow}:${htCol}${lastDataRow})`,
  };
  ws[XLSX.utils.encode_cell({ r: totalRowIdx, c: ttcColIdx })] = {
    t: 'n',
    f: `SUM(${ttcCol}${firstDataRow}:${ttcCol}${lastDataRow})`,
  };

  const ref = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
  ref.e.r = Math.max(ref.e.r, totalRowIdx);
  ws['!ref'] = XLSX.utils.encode_range(ref);
}

function vatSummary(vatDetails: Expense['vat_details']): {
  base: number;
  amount: number;
  ratesLabel: string;
  fullLabel: string;
} {
  const rows = vatDetails ?? [];
  const base = rows.reduce((s, v) => s + (Number(v.base) || 0), 0);
  const amount = rows.reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const ratesLabel = rows.map(v => `${Number(v.rate) || 0}%`).join(' | ');
  const fullLabel = rows
    .map(v => `${Number(v.rate) || 0}%: base ${Number(v.base) || 0} → ${Number(v.amount) || 0}`)
    .join(' | ');
  return { base, amount, ratesLabel, fullLabel };
}

function yesNo(value: boolean, t: (key: string) => string): string {
  return value ? t('common.yes') : t('common.no');
}

function expenseToExportRow(e: Expense, t: (key: string) => string): Record<string, string | number> {
  const vat = vatSummary(e.vat_details);
  const employee = e.profiles as { full_name?: string; email?: string } | undefined;

  return {
    [t('admin.exportExpenseRef')]: e.id,
    [t('expense.receiptDate')]: formatDate(e.receipt_date),
    [t('expense.requestCreatedAt')]: e.created_at ? formatDate(e.created_at) : '',
    [t('roles.employee')]: employee?.full_name?.trim() ?? e.user_id,
    [t('expense.employeeEmail')]: employee?.email?.trim() ?? '',
    [t('expense.supplier')]: e.supplier,
    [t('expense.city')]: e.city?.trim() ?? '',
    [t('expense.amountHT')]: e.amount_ht,
    [t('expense.vatBase')]: vat.base,
    [t('expense.vatAmount')]: vat.amount,
    [t('expense.vatEquivalentRate')]: vat.ratesLabel,
    [t('admin.exportVatBreakdown')]: vat.fullLabel,
    [t('expense.amountTTC')]: e.amount_ttc,
    [t('expense.paymentMethod')]: e.payment_method
      ? t(`expense.paymentMethod_${e.payment_method}`)
      : '',
    [t('expense.category')]: t(`expense.${e.category}`),
    [t('expense.accountingCode')]: e.accounting_code ?? '',
    [t('expense.project')]: e.projects?.name?.trim()
      ? e.projects.name
      : t('expense.projectDaily'),
    [t('expense.description')]: e.description?.trim() ?? '',
    [t('expense.status')]: t(`expense.${e.status}`),
    [t('expense.reviewedBy')]: e.reviewer?.full_name?.trim() ?? '',
    [t('expense.reviewedAt')]: e.reviewed_at ? formatDate(e.reviewed_at) : '',
    [t('admin.rejectionReason')]: e.rejection_reason?.trim() ?? '',
    [t('admin.exportDuplicateFlag')]: yesNo(!!e.is_flagged_duplicate, t),
    [t('admin.exportFiscalAlert')]: yesNo(!!e.is_fiscal_alert, t),
    [t('expense.receipt')]: e.receipt_image_url ?? '',
  };
}

export const exportToExcel = async (expenses: Expense[]): Promise<void> => {
  const t = i18n.t.bind(i18n);

  const data = expenses.map(e => expenseToExportRow(e, t));

  const ws = XLSX.utils.json_to_sheet(data);
  const headers = Object.keys(data[0] ?? {});
  const htColIdx = headers.indexOf(t('expense.amountHT'));
  const ttcColIdx = headers.indexOf(t('expense.amountTTC'));

  if (data.length > 0 && htColIdx >= 0 && ttcColIdx >= 0) {
    appendTotalsRow(
      ws,
      data.length,
      htColIdx,
      ttcColIdx,
      t('admin.exportTotalLabel'),
      t('admin.exportTotalCount', { count: data.length })
    );
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('admin.allExpenses'));

  ws['!cols'] = headers.map((key, ci) => {
    const maxCell = data.reduce((max, row) => {
      const val = String(Object.values(row)[ci] ?? '');
      return Math.max(max, val.length);
    }, key.length);
    return { wch: Math.min(Math.max(maxCell + 2, 12), 52) };
  });

  const fileName = `expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const file = new File(Paths.cache, fileName);
  file.write(wbout);

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(t('admin.exportShareUnavailable'));
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: t('admin.exportExcel'),
    UTI: 'com.microsoft.excel.xlsx',
  });
};
