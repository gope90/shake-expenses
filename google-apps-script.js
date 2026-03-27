function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'update_status') {
      return updateStatus(sheet, data);
    }
    var items = data.items;
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Fecha envío','Enviado por','Fecha gasto','Proveedor','Monto','Moneda','División','Área','Cliente','Medio de pago','Descripción','Estado','Comprobantes']);
      sheet.getRange(1,1,1,13).setFontWeight('bold').setBackground('#f3f4f6');
    }
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var fileLinks = '';
      if (item.file_urls && item.file_urls.length > 0) {
        fileLinks = item.file_urls.join('\n');
      }
      sheet.appendRow([new Date(item.submitted_at).toLocaleDateString('es-AR'), item.submitted_by, item.expense_date, item.provider, item.amount, item.currency, item.division, item.area, item.client, item.payment_method, item.description, 'Pendiente', fileLinks]);
    }
    return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success:false,error:error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function updateStatus(sheet, data) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return ContentService.createTextOutput(JSON.stringify({success:true,updated:0})).setMimeType(ContentService.MimeType.JSON);
  }
  var values = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  var updated = 0;
  for (var i = 0; i < values.length; i++) {
    var rowName = String(values[i][1]).trim();
    var rowStatus = String(values[i][11]).trim();
    if (rowName === data.submitted_by && rowStatus === 'Pendiente') {
      sheet.getRange(i + 2, 12).setValue(data.new_status);
      updated++;
    }
  }
  return ContentService.createTextOutput(JSON.stringify({success:true,updated:updated})).setMimeType(ContentService.MimeType.JSON);
}
