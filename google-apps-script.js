// ===================================================
// Google Apps Script para Shake Expenses v2
// Pegá este código en tu Google Sheet > Extensiones > Apps Script
// Soporta: agregar gastos nuevos Y actualizar estados
// ===================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    // Si es una actualización de estado
    if (data.action === 'update_status') {
      return updateStatus(sheet, data);
    }

    // Si es una carga nueva de gastos
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

function updateStatus(sheet, data) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: true, updated: 0 })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var dataRange = sheet.getRange(2, 1, lastRow - 1, 12);
  var values = dataRange.getValues();
  var updated = 0;

  // Buscar filas que coincidan por nombre y fecha de envío
  var targetDate = new Date(data.submitted_at).toLocaleDateString('es-AR');

  for (var i = 0; i < values.length; i++) {
    var rowDate = values[i][0]; // Fecha envío (col A)
    var rowName = values[i][1]; // Enviado por (col B)

    if (rowName === data.submitted_by && String(rowDate) === targetDate) {
      // Actualizar columna L (Estado) = columna 12
      sheet.getRange(i + 2, 12).setValue(data.new_status);
      updated++;
    }
  }

  return ContentService.createTextOutput(
    JSON.stringify({ success: true, updated: updated })
  ).setMimeType(ContentService.MimeType.JSON);
}
