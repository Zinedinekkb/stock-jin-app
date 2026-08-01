import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // จำลองสร้าง Error เพื่อส่งไปที่ Sentry
    throw new Error("Sentry Test Error from stock-jin-app API!");
  } catch (error) {
    // บันทึก Error เข้า Sentry
    Sentry.captureException(error);
    return NextResponse.json(
      { 
        status: "error",
        message: "Sentry test error triggered successfully!",
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}
