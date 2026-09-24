import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { products } from "@/db/schema";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Creates a valid, uncompressed PKZIP binary archive containing an asset text file.
 * Opens natively in Windows Explorer, macOS Archive Utility, and Linux unzip.
 */
function createValidZipBuffer(fileNameInsideZip: string, content: string): Buffer {
    const fileData = Buffer.from(content, "utf-8");
    const fileNameBuffer = Buffer.from(fileNameInsideZip, "utf-8");

    // CRC-32 Checksum
    let crc = ~0;
    for (let i = 0; i < fileData.length; i++) {
        crc ^= fileData[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
        }
    }
    const fileCrc = ~crc >>> 0;

    const modTime = 0x5460; // 10:35:00
    const modDate = 0x5cc0; // Valid DOS date

    // Local File Header (30 bytes)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    localHeader.writeUInt16LE(20, 4);         // Version needed
    localHeader.writeUInt16LE(0, 6);          // Flags
    localHeader.writeUInt16LE(0, 8);          // Compression: Store (0)
    localHeader.writeUInt16LE(modTime, 10);
    localHeader.writeUInt16LE(modDate, 12);
    localHeader.writeUInt32LE(fileCrc, 14);
    localHeader.writeUInt32LE(fileData.length, 18);
    localHeader.writeUInt32LE(fileData.length, 22);
    localHeader.writeUInt16LE(fileNameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    // Central Directory Header (46 bytes)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(modTime, 12);
    centralHeader.writeUInt16LE(modDate, 14);
    centralHeader.writeUInt32LE(fileCrc, 16);
    centralHeader.writeUInt32LE(fileData.length, 20);
    centralHeader.writeUInt32LE(fileData.length, 24);
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(0, 42); // Offset of local header

    // End of Central Directory (22 bytes)
    const centralDirSize = 46 + fileNameBuffer.length;
    const centralDirOffset = 30 + fileNameBuffer.length + fileData.length;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(1, 8);
    eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(centralDirSize, 12);
    eocd.writeUInt32LE(centralDirOffset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([
        localHeader,
        fileNameBuffer,
        fileData,
        centralHeader,
        fileNameBuffer,
        eocd,
    ]);
}

/**
 * Creates a minimal, standard PDF document binary.
 */
function createValidPdfBuffer(title: string, content: string): Buffer {
    const stream = `BT /F1 16 Tf 50 720 Td (${title}) Tj ET\nBT /F1 11 Tf 50 680 Td (${content}) Tj ET`;
    const streamLen = Buffer.byteLength(stream);

    const pdfString = [
        "%PDF-1.4",
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
        `4 0 obj << /Length ${streamLen} >> stream\n${stream}\nendstream\nendobj`,
        "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
        "xref",
        "0 6",
        "0000000000 65535 f ",
        "0000000009 00000 n ",
        "0000000058 00000 n ",
        "0000000115 00000 n ",
        "0000000266 00000 n ",
        `0000000${(320 + streamLen).toString().padStart(3, "0")} 00000 n `,
        "trailer << /Size 6 /Root 1 0 R >>",
        "startxref",
        `${380 + streamLen}`,
        "%%EOF",
    ].join("\n");

    return Buffer.from(pdfString, "utf-8");
}

export async function GET(request: NextRequest) {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    const productParam = request.nextUrl.searchParams.get("product");

    if (!sessionId || !productParam) {
        return new NextResponse("Missing session_id or product", { status: 400 });
    }

    let session: Stripe.Checkout.Session;
    try {
        session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ["line_items.data.price.product"],
        });
    } catch {
        return new NextResponse("Session not found", { status: 404 });
    }

    if (session.payment_status !== "paid") {
        return new NextResponse("Payment not completed", { status: 403 });
    }

    const lineItems = session.line_items?.data ?? [];
    let dbProductId: string | null = null;

    for (const item of lineItems) {
        const product = item.price?.product;
        if (!product || typeof product === "string") continue;

        const stripeProduct = product as Stripe.Product;
        const metadataProductId = stripeProduct.metadata?.productId ?? null;

        if (metadataProductId === productParam) {
            dbProductId = metadataProductId;
            break;
        }
    }

    if (!dbProductId) {
        return new NextResponse("Product not found in this order", { status: 403 });
    }

    const [record] = await db
        .select({
            id: products.id,
            name: products.name,
            assetUrl: products.assetUrl,
            isDigital: products.isDigital,
        })
        .from(products)
        .where(eq(products.id, dbProductId))
        .limit(1);

    if (!record || !record.isDigital || !record.assetUrl) {
        return new NextResponse("Fulfillment not available", { status: 404 });
    }

    // Handle demo placeholder assets locally with valid binary structures
    if (record.assetUrl.includes("cdn.vesselengine.com/demo/")) {
        const rawFilename = record.assetUrl.split("/").pop() || "asset.zip";

        if (rawFilename.endsWith(".pdf")) {
            const pdfBuffer = createValidPdfBuffer(
                record.name,
                "Access Verified - Vessel Engine Demo Course/Document."
            );
            // Wrap in a plain Uint8Array — TS 5.7+ no longer accepts
            // Buffer<ArrayBufferLike> as BodyInit directly.
            return new NextResponse(new Uint8Array(pdfBuffer), {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${rawFilename}"`,
                },
            });
        }

        // Default to valid ZIP binary containing README and License files
        const zipManifest = [
            `=====================================================`,
            `Product: ${record.name}`,
            `Asset ID: ${record.id}`,
            `Order Verification: Validated via Stripe Session`,
            `=====================================================`,
            ``,
            `Thank you for purchasing from Vessel Engine!`,
            `In production, this file is pulled directly from your S3 or CloudFront bucket.`,
        ].join("\n");

        const zipBuffer = createValidZipBuffer("README.txt", zipManifest);

        // Same wrapper applied here.
        return new NextResponse(new Uint8Array(zipBuffer), {
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${rawFilename}"`,
            },
        });
    }

    return NextResponse.redirect(record.assetUrl);
}