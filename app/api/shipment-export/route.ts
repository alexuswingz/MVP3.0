import { NextRequest, NextResponse } from 'next/server';
import { exportShipmentTemplateServer } from '@/utils/shipmentExportServer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateType, products, shipmentData } = body as {
      templateType: 'fba' | 'awd' | 'production-order';
      products: Array<{
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
      }>;
      shipmentData?: {
        shipmentNumber?: string;
        shipmentDate?: string;
        shipmentType?: string;
        account?: string;
      };
    };

    if (!templateType || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Missing templateType or products' },
        { status: 400 }
      );
    }

    const { buffer, filename } = await exportShipmentTemplateServer(
      templateType,
      products,
      shipmentData || {}
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Shipment export error:', err);
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
