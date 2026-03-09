import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      'excel',
      'Seasonality Data Template.xlsx',
    );

    const fileBuffer = await fs.promises.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition':
          'attachment; filename="Seasonality Data Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error reading Seasonality Data Template.xlsx', error);
    return new NextResponse('Template not found', { status: 404 });
  }
}

