import * as XLSX from 'xlsx';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Expense } from '../types';
import { formatDate } from './dateFormat';
import i18n from '../i18n';

export const exportToExcel = async (expenses: Expense[]): Promise<void> => {
  const t = i18n.t.bind(i18n);

  const data = expenses.map(e => ({
    [t('expense.date')]: formatDate(e.receipt_date),
    [t('expense.supplier')]: e.supplier,
    [t('admin.employee')]: (e.profiles as any)?.full_name ?? e.user_id,
    [t('expense.amountHT')]: e.amount_ht,
    [t('expense.vat')]: e.vat_details.map(v => `${v.rate}%: ${v.amount}`).join(' | '),
    [t('expense.amountTTC')]: e.amount_ttc,
    [t('expense.category')]: t(`expense.${e.category}`),
    [t('expense.accountingCode')]: e.accounting_code ?? '',
    [t('expense.status')]: t(`expense.${e.status}`),
    [t('expense.receipt')]: e.receipt_image_url ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('admin.allExpenses'));

  const colWidths = Object.keys(data[0] ?? {}).map(key => ({
    wch: Math.max(key.length, 15),
  }));
  ws['!cols'] = colWidths;

  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileName = `expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const file = new File(Paths.cache, fileName);
  file.write(wbout);

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: t('admin.exportExcel'),
    UTI: 'com.microsoft.excel.xlsx',
  });
};
