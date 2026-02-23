import ExcelJS from 'exceljs';

interface ProductForExport {
  id: string;
  childSku?: string;
  sku?: string;
  qty: number;
  size?: string;
  units_per_case?: number;
  brand?: string;
  product?: string;
  formula_name?: string;
  bottle_name?: string;
  closure_name?: string;
  label_location?: string;
}

interface ShipmentData {
  shipmentNumber?: string;
  shipmentDate?: string;
  shipmentType?: string;
  account?: string;
}

/**
 * Export shipment products to Amazon FBA or AWD bulk upload Excel format
 * Uses the actual Amazon template files and populates with product data
 * Preserves all original formatting (colors, fonts, styles)
 */
export const exportShipmentTemplate = async (
  templateType: 'fba' | 'awd' | 'production-order',
  products: ProductForExport[],
  shipmentData: ShipmentData
): Promise<void> => {
  // Filter products that have been added (qty > 0)
  const productsToExport = products.filter(p => p.qty > 0);
  
  if (productsToExport.length === 0) {
    throw new Error('No products to export. Please add quantities to products first.');
  }

  try {
    if (templateType === 'awd') {
      await exportFromTemplate('/templates/AWD_Template.xlsx', productsToExport, shipmentData, 'AWD');
    } else if (templateType === 'fba') {
      await exportFromTemplate('/templates/FBA_Template.xlsx', productsToExport, shipmentData, 'FBA');
    } else if (templateType === 'production-order') {
      await createProductionOrderExport(productsToExport, shipmentData);
    }
  } catch (error) {
    console.error('Error exporting template:', error);
    throw error;
  }
};

/**
 * Export by reading and modifying the actual template file
 * ExcelJS preserves all formatting, colors, fonts, and styles
 */
const exportFromTemplate = async (
  templatePath: string,
  products: ProductForExport[],
  shipmentData: ShipmentData,
  type: 'AWD' | 'FBA'
): Promise<void> => {
  try {
    // Fetch the template file
    const response = await fetch(templatePath);
    if (!response.ok) {
      throw new Error(`Template not found: ${templatePath}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Create workbook and load the template
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    // Find the template sheet
    let worksheet: ExcelJS.Worksheet | null = null;
    workbook.eachSheet((sheet) => {
      if (sheet.name.toLowerCase().includes('template')) {
        worksheet = sheet;
      }
    });
    
    if (!worksheet) {
      // If no 'template' sheet, use the first sheet
      worksheet = workbook.worksheets[0];
    }
    
    if (!worksheet) {
      throw new Error('No worksheet found in template');
    }
    
    // AWD Template Structure (verified from original):
    // Row 1: "Please review the Example tab..."
    // Row 2: (empty)
    // Row 3: "Default prep owner" | "Seller"
    // Row 4: "Default labeling owner" | "Seller"
    // Row 5: (empty)
    // Row 6: "Mandatory" | "" | "Optional" | ...
    // Row 7: Column headers (Merchant SKU, Quantity, etc.)
    // Row 8+: Data rows
    
    // FBA has similar structure
    const dataStartRow = type === 'AWD' ? 8 : 9;
    
    // Add product data rows - only modify data cells, preserve everything else
    products.forEach((product, index) => {
      const rowNum = dataStartRow + index;
      const unitsPerBox = product.units_per_case || getDefaultUnitsPerBox(product.size);
      const numberOfBoxes = Math.ceil(product.qty / unitsPerBox);
      const boxDimensions = getBoxDimensions(product.size);
      
      if (type === 'AWD') {
        // AWD columns: A-N (14 columns)
        const isPalletized = numberOfBoxes >= 10;
        const boxesPerPallet = 30;
        
        // Set cell values directly without getting the row object
        worksheet!.getCell(`A${rowNum}`).value = product.childSku || product.sku || '';
        worksheet!.getCell(`B${rowNum}`).value = product.qty;
        worksheet!.getCell(`C${rowNum}`).value = null;  // Prep owner - empty
        worksheet!.getCell(`D${rowNum}`).value = null;  // Labeling owner - empty
        worksheet!.getCell(`E${rowNum}`).value = null;  // Expiration date - empty
        worksheet!.getCell(`F${rowNum}`).value = unitsPerBox;
        worksheet!.getCell(`G${rowNum}`).value = numberOfBoxes;
        worksheet!.getCell(`H${rowNum}`).value = boxDimensions.length;
        worksheet!.getCell(`I${rowNum}`).value = boxDimensions.width;
        worksheet!.getCell(`J${rowNum}`).value = boxDimensions.height;
        worksheet!.getCell(`K${rowNum}`).value = boxDimensions.weight;
        worksheet!.getCell(`L${rowNum}`).value = isPalletized ? 'Yes' : null;
        worksheet!.getCell(`M${rowNum}`).value = isPalletized ? boxesPerPallet : null;
        worksheet!.getCell(`N${rowNum}`).value = isPalletized ? Math.ceil(numberOfBoxes / boxesPerPallet) : null;
      } else {
        // FBA columns: A-L (12 columns)
        worksheet!.getCell(`A${rowNum}`).value = product.childSku || product.sku || '';
        worksheet!.getCell(`B${rowNum}`).value = product.qty;
        worksheet!.getCell(`C${rowNum}`).value = null;  // Prep owner
        worksheet!.getCell(`D${rowNum}`).value = null;  // Labeling owner
        worksheet!.getCell(`E${rowNum}`).value = null;  // Expiration date
        worksheet!.getCell(`F${rowNum}`).value = null;  // Manufacturing lot code
        worksheet!.getCell(`G${rowNum}`).value = unitsPerBox;
        worksheet!.getCell(`H${rowNum}`).value = numberOfBoxes;
        worksheet!.getCell(`I${rowNum}`).value = boxDimensions.length;
        worksheet!.getCell(`J${rowNum}`).value = boxDimensions.width;
        worksheet!.getCell(`K${rowNum}`).value = boxDimensions.height;
        worksheet!.getCell(`L${rowNum}`).value = boxDimensions.weight;
      }
    });
    
    // Generate the file as a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Create blob and download
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `${type}_Shipment_${shipmentData?.shipmentNumber || date}.xlsx`;
    
    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error reading template:', error);
    throw error;
  }
};

/**
 * Create Production Order export
 */
const createProductionOrderExport = async (
  products: ProductForExport[],
  shipmentData: ShipmentData
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Production Order');
  
  // Title
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'PRODUCTION ORDER';
  titleCell.font = { bold: true, size: 18 };
  titleCell.alignment = { horizontal: 'center' };
  
  // Shipment info
  worksheet.getCell('A3').value = 'Shipment Number:';
  worksheet.getCell('B3').value = shipmentData?.shipmentNumber || 'N/A';
  worksheet.getCell('A4').value = 'Shipment Date:';
  worksheet.getCell('B4').value = shipmentData?.shipmentDate || new Date().toLocaleDateString();
  worksheet.getCell('A5').value = 'Shipment Type:';
  worksheet.getCell('B5').value = shipmentData?.shipmentType || 'N/A';
  worksheet.getCell('A6').value = 'Account:';
  worksheet.getCell('B6').value = shipmentData?.account || 'TPS Nutrients';
  
  // Column headers row
  const headerRow = worksheet.getRow(8);
  const headers = ['Brand', 'Product', 'Size', 'SKU', 'Quantity', 'Units/Case', 'Cases', 'Formula', 'Bottle', 'Closure', 'Label Location'];
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  headerRow.commit();
  
  // Data rows
  let totalUnits = 0;
  let totalCases = 0;
  
  products.forEach((product, index) => {
    const rowNum = 9 + index;
    const row = worksheet.getRow(rowNum);
    const unitsPerCase = product.units_per_case || getDefaultUnitsPerBox(product.size);
    const casesNeeded = Math.ceil(product.qty / unitsPerCase);
    
    totalUnits += product.qty;
    totalCases += casesNeeded;
    
    const values = [
      product.brand || '',
      product.product || '',
      product.size || '',
      product.childSku || product.sku || '',
      product.qty,
      unitsPerCase,
      casesNeeded,
      product.formula_name || '',
      product.bottle_name || '',
      product.closure_name || '',
      product.label_location || ''
    ];
    
    values.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.value = value;
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      // Alternate row coloring
      if (index % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    });
    row.commit();
  });
  
  // Totals row
  const totalsRowNum = 9 + products.length + 1;
  const totalsRow = worksheet.getRow(totalsRowNum);
  totalsRow.getCell(4).value = 'TOTALS:';
  totalsRow.getCell(4).font = { bold: true };
  totalsRow.getCell(5).value = totalUnits;
  totalsRow.getCell(5).font = { bold: true };
  totalsRow.getCell(7).value = totalCases;
  totalsRow.getCell(7).font = { bold: true };
  totalsRow.commit();
  
  // Set column widths
  worksheet.columns = [
    { width: 18 }, { width: 35 }, { width: 12 }, { width: 20 }, { width: 10 },
    { width: 12 }, { width: 10 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 18 }
  ];
  
  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `Production_Order_${shipmentData?.shipmentNumber || date}.xlsx`;
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Get default units per box based on product size
 */
const getDefaultUnitsPerBox = (size?: string): number => {
  if (!size) return 12;
  const sizeLower = size.toLowerCase();
  
  if (sizeLower.includes('8oz') || sizeLower.includes('8 oz')) return 60;
  if (sizeLower.includes('quart') || sizeLower.includes('32oz') || sizeLower.includes('32 oz')) return 12;
  if (sizeLower.includes('gallon') || sizeLower.includes('128oz') || sizeLower.includes('128 oz')) return 4;
  if (sizeLower.includes('pint') || sizeLower.includes('16oz') || sizeLower.includes('16 oz')) return 24;
  if (sizeLower.includes('2.5') || sizeLower.includes('2.5 gal')) return 2;
  if (sizeLower.includes('5 gal') || sizeLower.includes('5gal')) return 1;
  
  return 12;
};

/**
 * Get box dimensions based on product size
 */
const getBoxDimensions = (size?: string): { length: number; width: number; height: number; weight: number } => {
  if (!size) return { length: 15, width: 12, height: 12, weight: 25 };
  const sizeLower = size.toLowerCase();
  
  if (sizeLower.includes('8oz') || sizeLower.includes('8 oz')) {
    return { length: 18, width: 12, height: 10, weight: 35 };
  }
  if (sizeLower.includes('quart') || sizeLower.includes('32oz') || sizeLower.includes('32 oz')) {
    return { length: 13, width: 10, height: 10, weight: 34 };
  }
  if (sizeLower.includes('gallon') || sizeLower.includes('128oz') || sizeLower.includes('128 oz')) {
    return { length: 14, width: 14, height: 12, weight: 40 };
  }
  if (sizeLower.includes('pint') || sizeLower.includes('16oz') || sizeLower.includes('16 oz')) {
    return { length: 16, width: 12, height: 10, weight: 30 };
  }
  
  return { length: 15, width: 12, height: 12, weight: 25 };
};

export default exportShipmentTemplate;
