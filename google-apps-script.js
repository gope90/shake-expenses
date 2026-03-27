// ===================================================
// Google Apps Script para Shake Expenses
// Pegá este código en tu Google Sheet > Extensiones > Apps Script
// ===================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    var items = data.items;

    // Si la hoja está vacía, agregar encabezados
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Fecha envío',
        'Enviado por',
        'Fecha gasto',
        'Proveedor',
        'Monto',
        'Moneda',
        'División',
        'Área',
        'Cliente',
        'Medio de pago',
        'Descripción',
        'Estado'
      ]);
      // Formato de encabezados
      var headerRange = sheet.getRange(1, 1, 1, 12);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#f3f4f6');
    }

    // Agregar cada gasto como una fila
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      sheet.appendRow([
        new Date(item.submitted_at).toLocaleDateString('es-AR'),
        item.submitted_by,
        item.expense_date,
        item.provider,
        item.amount,
        item.currency,
        item.division,
        item.area,
        item.client,
        item.payment_method,
        item.description,
        'Pendiente'
      ]);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
