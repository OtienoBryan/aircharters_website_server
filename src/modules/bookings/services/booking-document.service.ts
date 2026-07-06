import { Injectable, Logger } from '@nestjs/common';
// pdfkit is a CommonJS module (`export =`) and this project has no
// esModuleInterop, so `import * as X` transforms inconsistently between
// ts-node and the webpack bundle Nest CLI produces. `import X = require(...)`
// always compiles to a plain `require()` call regardless of build tool.
import PDFDocument = require('pdfkit');
import * as fs from 'fs';
import * as path from 'path';
import { Booking } from '../../../common/entities/booking.entity';
import { Passenger } from '../../../common/entities/passenger.entity';

const BRAND_ORANGE = '#f97316';
const TEXT_DARK = '#111827';
const TEXT_GRAY = '#6b7280';
const BORDER_GRAY = '#e5e7eb';

const CARD_WIDTH = 555;
const CARD_HEIGHT = 200;
const STUB_WIDTH = 150;
const GAP = 14;
const MAIN_WIDTH = CARD_WIDTH - STUB_WIDTH - GAP;

const BOOKING_TYPE_LABELS: Record<string, string> = {
  direct: 'Private Charter',
  deal: 'Empty Leg Deal',
  experience: 'Experience',
  medivac: 'Medical Evacuation',
};

function bookingTypeLabel(type: string | null | undefined): string {
  return BOOKING_TYPE_LABELS[String(type || '').toLowerCase()] || 'Charter Booking';
}

/**
 * Charter locations rarely carry IATA codes, so derive a short uppercase code
 * for the big boarding-pass headline: prefer the part after a comma (region/
 * code), otherwise abbreviate the first meaningful word of the airport name.
 */
function deriveCode(name: string | null | undefined, fallback = '---'): string {
  if (!name) return fallback;
  const afterComma = name.split(',')[1]?.trim();
  if (afterComma) return afterComma.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || fallback;
  const cleaned = name
    .replace(/\b(airport|international|intl|airstrip|airfield|aerodrome|field)\b/gi, '')
    .trim();
  const firstWord = (cleaned.split(/\s+/)[0] || name).replace(/[^a-zA-Z0-9]/g, '');
  return (firstWord.slice(0, 3) || name.slice(0, 3)).toUpperCase() || fallback;
}

/** Title-cases a lowercase location name for the small subtitle line. */
function titleCase(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback;
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date: any): string {
  if (!date) return 'TBA';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(time: any): string {
  if (!time) return '--:--';
  // CharterDeal.time is a SQL TIME string like "13:00:00"
  return String(time).slice(0, 5);
}

@Injectable()
export class BookingDocumentService {
  private readonly logger = new Logger(BookingDocumentService.name);
  private logoBuffer: Buffer | null | undefined; // undefined = not loaded, null = tried & unavailable

  /** Load the AirCharters logo from disk once and cache it (best-effort). */
  private getLogoBuffer(): Buffer | null {
    if (this.logoBuffer !== undefined) return this.logoBuffer;
    try {
      const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
      this.logoBuffer = fs.readFileSync(logoPath);
    } catch (err) {
      this.logger.warn(`E-ticket logo not found, falling back to text-only header: ${err.message}`);
      this.logoBuffer = null;
    }
    return this.logoBuffer;
  }

  /**
   * Renders the e-ticket PDF into a Buffer, for attaching to emails.
   */
  generateETicketBuffer(booking: Booking): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = this.generateETicketPdf(booking);
        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Renders one boarding-pass-style card per passenger, stacked down the page.
   */
  generateETicketPdf(booking: Booking): PDFKit.PDFDocument {
    const doc = new PDFDocument({ size: 'A4', margin: 20 });

    const deal = (booking as any).deal;
    // Ticket is always AirCharters-branded, never the underlying operator's name.
    const companyName = 'AirCharters';
    const tailNumber = deal?.aircraft?.registrationNumber || (booking as any).aircraft?.registrationNumber || 'TBA';
    const originName = booking.originName || deal?.originName;
    const destName = booking.destinationName || deal?.destinationName;
    const originCode = deriveCode(originName);
    const originCity = titleCase(originName, 'Origin');
    const destCode = deriveCode(destName);
    const destCity = titleCase(destName, 'Destination');
    const date = formatDate(deal?.date || booking.departureDateTime);
    const std = formatTime(deal?.time);
    const sta = booking.estimatedArrivalTime ? formatTime(new Date(booking.estimatedArrivalTime).toTimeString()) : 'TBA';
    const status = booking.paymentStatus === 'paid' ? 'CONFIRMED' : booking.paymentStatus === 'failed' ? 'FAILED' : 'PENDING';
    const bookingType = bookingTypeLabel(booking.bookingType);
    const logo = this.getLogoBuffer();

    const passengers: Passenger[] = (booking.passengers && booking.passengers.length > 0)
      ? booking.passengers
      : [{ first_name: 'Guest', last_name: '', nationality: '', id_passport_number: '', id_type: undefined } as any];

    const pageHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
    let y = doc.page.margins.top;

    passengers.forEach((passenger, index) => {
      if (y + CARD_HEIGHT > doc.page.margins.top + pageHeight) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      this.drawBoardingPass(doc, doc.page.margins.left, y, {
        companyName,
        bookingType,
        logo,
        tailNumber,
        referenceNumber: booking.referenceNumber,
        originCode,
        originCity,
        destCode,
        destCity,
        date,
        std,
        sta,
        status,
        passengerName: `${passenger.first_name} ${passenger.last_name}`.trim() || `Passenger ${index + 1}`,
        passengerType: passenger.is_user ? 'Lead Passenger' : 'Passenger',
        nationality: passenger.nationality || 'N/A',
        idLabel: passenger.id_type === 'national_id' ? 'NATIONAL ID' : 'PASSPORT',
        idNumber: passenger.id_passport_number || 'N/A',
      });

      y += CARD_HEIGHT + 20;
    });

    doc.end();
    return doc;
  }

  private drawBoardingPass(doc: PDFKit.PDFDocument, x: number, y: number, data: {
    companyName: string;
    bookingType: string;
    logo: Buffer | null;
    tailNumber: string;
    referenceNumber: string;
    originCode: string;
    originCity: string;
    destCode: string;
    destCity: string;
    date: string;
    std: string;
    sta: string;
    status: string;
    passengerName: string;
    passengerType: string;
    nationality: string;
    idLabel: string;
    idNumber: string;
  }) {
    const stubX = x + MAIN_WIDTH + GAP;
    const PAD = 16;
    const HEADER_H = 42;

    // --- Outer card outlines ---
    doc.roundedRect(x, y, MAIN_WIDTH, CARD_HEIGHT, 10).fillAndStroke('#ffffff', BORDER_GRAY);
    doc.roundedRect(stubX, y, STUB_WIDTH, CARD_HEIGHT, 10).fillAndStroke('#ffffff', BORDER_GRAY);

    // ============ MAIN CARD HEADER ============
    doc.save();
    doc.roundedRect(x, y, MAIN_WIDTH, HEADER_H, 10).clip();
    doc.rect(x, y, MAIN_WIDTH, HEADER_H).fill(BRAND_ORANGE);
    doc.restore();

    // Right block (FLIGHT / tail) - reserve fixed space so title can't collide
    const rightBlockW = 96;
    doc.font('Helvetica').fontSize(6.5).fillColor('#ffffff')
      .text('FLIGHT', x + MAIN_WIDTH - PAD - rightBlockW, y + 10, { width: rightBlockW, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#ffffff')
      .text(data.tailNumber, x + MAIN_WIDTH - PAD - rightBlockW, y + 21, { width: rightBlockW, align: 'right', lineBreak: false, ellipsis: true });

    // Left block: logo chip + company name + boarding-pass/booking-type line
    let textX = x + PAD;
    if (data.logo) {
      doc.save();
      doc.roundedRect(x + 12, y + 8, 26, 26, 6).fill('#ffffff');
      try { doc.image(data.logo, x + 14, y + 10, { fit: [22, 22] }); } catch { /* ignore */ }
      doc.restore();
      textX = x + 46;
    }
    const titleW = MAIN_WIDTH - (textX - x) - rightBlockW - PAD - 8;
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
      .text(data.companyName.toUpperCase(), textX, y + 9, { width: titleW, lineBreak: false, ellipsis: true });
    doc.font('Helvetica').fontSize(6.5).fillColor('#ffffff')
      .text(`BOARDING PASS  ·  ${data.bookingType.toUpperCase()}`, textX, y + 25, { width: titleW, lineBreak: false, ellipsis: true });

    // ============ STUB HEADER ============
    doc.save();
    doc.roundedRect(stubX, y, STUB_WIDTH, 30, 10).clip();
    doc.rect(stubX, y, STUB_WIDTH, 30).fill(BRAND_ORANGE);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff')
      .text(data.companyName.toUpperCase(), stubX + 12, y + 10, { width: STUB_WIDTH - 24, lineBreak: false, ellipsis: true });

    // ============ MAIN BODY: route row ============
    const routeTop = y + HEADER_H + 14;
    const codeW = 130;
    // Origin (left)
    doc.font('Helvetica-Bold').fontSize(22).fillColor(TEXT_DARK)
      .text(data.originCode, x + PAD, routeTop, { width: codeW, lineBreak: false });
    doc.font('Helvetica').fontSize(7).fillColor(TEXT_GRAY)
      .text(data.originCity, x + PAD, routeTop + 26, { width: codeW, lineBreak: false, ellipsis: true });
    // Destination (right)
    doc.font('Helvetica-Bold').fontSize(22).fillColor(TEXT_DARK)
      .text(data.destCode, x + MAIN_WIDTH - PAD - codeW, routeTop, { width: codeW, align: 'right', lineBreak: false });
    doc.font('Helvetica').fontSize(7).fillColor(TEXT_GRAY)
      .text(data.destCity, x + MAIN_WIDTH - PAD - codeW, routeTop + 26, { width: codeW, align: 'right', lineBreak: false, ellipsis: true });

    // Dashed connector + plane, centered in the gap between the two code columns
    const lineY = routeTop + 12;
    const lineStart = x + PAD + codeW + 6;
    const lineEnd = x + MAIN_WIDTH - PAD - codeW - 6;
    const lineMid = (lineStart + lineEnd) / 2;
    doc.save().dash(3, { space: 2.5 }).moveTo(lineStart, lineY).lineTo(lineMid - 8, lineY)
      .strokeColor(BORDER_GRAY).stroke().undash().restore();
    doc.save().dash(3, { space: 2.5 }).moveTo(lineMid + 8, lineY).lineTo(lineEnd, lineY)
      .strokeColor(BORDER_GRAY).stroke().undash().restore();
    this.drawPlaneIcon(doc, lineMid, lineY, 6, BRAND_ORANGE);

    // ============ MAIN BODY: detail rows ============
    const colWidth = (MAIN_WIDTH - PAD * 2) / 3;
    const row1Y = routeTop + 56;
    this.detailCell(doc, x + PAD, row1Y, colWidth - 8, 'PASSENGER', data.passengerName);
    this.detailCell(doc, x + PAD + colWidth, row1Y, colWidth - 8, 'PNR', data.referenceNumber);
    this.detailCell(doc, x + PAD + colWidth * 2, row1Y, colWidth - 8, 'TYPE', data.passengerType);

    const row2Y = row1Y + 34;
    this.detailCell(doc, x + PAD, row2Y, colWidth - 8, 'DATE / STD', `${data.date}  ${data.std}`);
    this.detailCell(doc, x + PAD + colWidth, row2Y, colWidth - 8, 'STA', data.sta);
    this.detailCell(doc, x + PAD + colWidth * 2, row2Y, colWidth - 8, 'NATIONALITY', data.nationality);

    const row3Y = row2Y + 34;
    this.detailCell(doc, x + PAD, row3Y, MAIN_WIDTH - PAD * 2, data.idLabel, data.idNumber);

    // ============ Perforation ============
    doc.save().dash(3, { space: 3 })
      .moveTo(x + MAIN_WIDTH + GAP / 2, y + 6)
      .lineTo(x + MAIN_WIDTH + GAP / 2, y + CARD_HEIGHT - 6)
      .strokeColor(BORDER_GRAY).stroke().undash().restore();

    // ============ STUB BODY ============
    const sPad = 12;
    const sInner = STUB_WIDTH - sPad * 2;
    let sy = y + 42;

    // FROM / TO codes row
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(TEXT_GRAY).text('FROM', stubX + sPad, sy);
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(TEXT_GRAY).text('TO', stubX + sPad, sy, { width: sInner, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK)
      .text(data.originCode, stubX + sPad, sy + 9, { width: sInner * 0.42, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(14).fillColor(TEXT_DARK)
      .text(data.destCode, stubX + sPad + sInner * 0.5, sy + 9, { width: sInner * 0.5, align: 'right', lineBreak: false });
    this.drawPlaneIcon(doc, stubX + STUB_WIDTH / 2, sy + 16, 4, BRAND_ORANGE);

    // STATUS
    sy += 34;
    const statusColor = data.status === 'CONFIRMED' ? '#16a34a' : data.status === 'FAILED' ? '#e11d48' : '#f59e0b';
    doc.font('Helvetica').fontSize(6.5).fillColor(TEXT_GRAY).text('STATUS', stubX + sPad, sy);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(statusColor)
      .text(data.status, stubX + sPad, sy + 9, { width: sInner, lineBreak: false });

    // FLIGHT
    sy += 26;
    doc.font('Helvetica').fontSize(6.5).fillColor(TEXT_GRAY).text('FLIGHT', stubX + sPad, sy);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(TEXT_DARK)
      .text(data.tailNumber, stubX + sPad, sy + 9, { width: sInner, lineBreak: false, ellipsis: true });

    // BOOKING REF
    sy += 26;
    doc.font('Helvetica').fontSize(6.5).fillColor(TEXT_GRAY).text('BOOKING REF', stubX + sPad, sy);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(TEXT_DARK)
      .text(data.referenceNumber, stubX + sPad, sy + 9, { width: sInner, lineBreak: false, ellipsis: true });

    // Barcode pinned to the bottom of the stub
    this.drawBarcode(doc, stubX + sPad, y + CARD_HEIGHT - 34, sInner, 20, data.referenceNumber);
    doc.font('Helvetica').fontSize(5.5).fillColor(TEXT_GRAY)
      .text(data.referenceNumber, stubX + sPad, y + CARD_HEIGHT - 11, { width: sInner, align: 'center', lineBreak: false });
  }

  private detailCell(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string) {
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(TEXT_GRAY)
      .text(label, x, y, { width, lineBreak: false, ellipsis: true });
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(TEXT_DARK)
      .text(value, x, y + 11, { width, lineBreak: false, ellipsis: true });
  }

  /**
   * pdfkit's standard fonts don't include the unicode plane glyph, so it
   * renders as a missing-character box. Draw a tiny vector silhouette instead.
   */
  private drawPlaneIcon(doc: PDFKit.PDFDocument, cx: number, cy: number, size: number, color: string) {
    doc.save();
    doc.fillColor(color);
    doc.moveTo(cx - size, cy - size * 0.5)
      .lineTo(cx + size, cy)
      .lineTo(cx - size, cy + size * 0.5)
      .lineTo(cx - size * 0.5, cy)
      .closePath()
      .fill();
    doc.restore();
  }

  /** Deterministic pseudo-barcode - purely decorative, not a real scannable symbology. */
  private drawBarcode(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number, seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const barCount = 28;
    const barWidth = width / barCount;
    doc.fillColor(TEXT_DARK);
    for (let i = 0; i < barCount; i++) {
      hash = (hash * 1103515245 + 12345) >>> 0;
      const tall = (hash >> 3) % 3 !== 0;
      const w = Math.max(1, barWidth * 0.5);
      doc.rect(x + i * barWidth, y + (tall ? 0 : height * 0.3), w, tall ? height : height * 0.7).fill();
    }
  }
}
