import dayjs from "dayjs";
import zlib from "node:zlib";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapePdfText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function getSafeString(value) {
  return String(value ?? "").trim();
}

export function sanitizeAttendanceFilename(eventName) {
  const slug = getSafeString(eventName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "event";
}

export function formatAttendanceDateTime(value) {
  if (!value) {
    return "";
  }

  const date = dayjs(value);

  if (!date.isValid()) {
    return "";
  }

  return date.toDate().toISOString().replace("T", " ").slice(0, 19);
}

export function buildAttendanceReportSummary(event, totalAttendees) {
  return {
    eventName: event?.eventName || "",
    eventDate: formatAttendanceDateTime(event?.startAt),
    venue: event?.venue?.name || getSafeString(event?.venue?.address?.line1) || "",
    status: event?.status || "",
    totalAttendees: Number(totalAttendees || 0),
    capacity: event?.capacity ?? null,
    attendancePercentage:
      Number.isFinite(Number(event?.capacity)) && Number(event.capacity) > 0
        ? Math.round((Number(totalAttendees || 0) / Number(event.capacity)) * 100)
        : null,
  };
}

export function buildAttendanceReportRows(attendanceRecords = []) {
  return attendanceRecords.map((attendance, index) => {
    const checkedInBy = attendance.checkedInBy || {};
    const ticket = attendance.ticket && typeof attendance.ticket === "object" ? attendance.ticket : {};
    const ticketType = ticket.ticketType && typeof ticket.ticketType === "object" ? ticket.ticketType : {};
    const order = attendance.order && typeof attendance.order === "object"
      ? attendance.order
      : ticket.order && typeof ticket.order === "object"
        ? ticket.order
        : {};

    return {
      no: index + 1,
      name: attendance.attendeeName || "",
      phone: attendance.attendeePhone || "",
      email: attendance.attendeeEmail || "",
      checkedInAt: formatAttendanceDateTime(attendance.checkedInAt),
      checkedInBy: [checkedInBy.firstName, checkedInBy.lastName].filter(Boolean).join(" ").trim()
        || checkedInBy.email
        || "",
      ticketReference: ticket.reference || "",
      ticketType: ticketType.name || "",
      ticketStatus: ticket.status || "",
      orderReference: order.reference || "",
    };
  });
}

function wrapText(text, maxLength = 96) {
  const value = getSafeString(text);

  if (!value) {
    return [""];
  }

  const words = value.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (candidate.length <= maxLength) {
      current = candidate;
    } else {
      if (current) {
        lines.push(current);
      }

      if (word.length > maxLength) {
        let chunk = "";

        for (const char of word) {
          if ((chunk + char).length > maxLength) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }

        current = chunk;
      } else {
        current = word;
      }
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

function buildPdfContentLines(event, rows, totalAttendees) {
  const summary = buildAttendanceReportSummary(event, totalAttendees);
  const lines = [
    "EVENT ATTENDANCE REPORT",
    `Event: ${summary.eventName}`,
    `Date: ${summary.eventDate}`,
    `Venue: ${summary.venue}`,
    `Status: ${summary.status}`,
    `Total Attendees: ${summary.totalAttendees}`,
    "",
    "No.  Attendee Name  Phone  Email  Check-in Time  Checked In By  Ticket Type  Ticket Reference  Ticket Status  Order Reference",
    "",
  ];

  for (const row of rows) {
    const rowText = `${row.no}. ${row.name} | ${row.phone} | ${row.email} | ${row.checkedInAt} | ${row.checkedInBy} | ${row.ticketType} | ${row.ticketReference} | ${row.ticketStatus} | ${row.orderReference}`;
    lines.push(...wrapText(rowText, 88));
  }

  return lines;
}

function buildPdfPages(lines) {
  const pageHeight = 792;
  const pageWidth = 612;
  const marginTop = 50;
  const marginLeft = 48;
  const lineHeight = 14;
  const usableLinesPerPage = 46;
  const pages = [];

  for (let index = 0; index < lines.length; index += usableLinesPerPage) {
    pages.push(lines.slice(index, index + usableLinesPerPage));
  }

  const fontName = "/F1";
  const objects = [];
  const pageObjectNumbers = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  const pagesKids = [];
  let nextObjectNumber = 4;

  for (const pageLines of pages.length > 0 ? pages : [[]]) {
    const pageObjectNumber = nextObjectNumber++;
    const contentObjectNumber = nextObjectNumber++;
    pageObjectNumbers.push(pageObjectNumber);
    pagesKids.push(`${pageObjectNumber} 0 R`);

    const content = [
      "BT",
      `${fontName} 12 Tf`,
      `1 0 0 1 ${marginLeft} ${pageHeight - marginTop} Tm`,
    ];

    pageLines.forEach((line, lineIndex) => {
      if (lineIndex === 0) {
        content.push(`(${escapePdfText(line)}) Tj`);
      } else {
        content.push(`T* (${escapePdfText(line)}) Tj`);
      }
    });
    content.push("ET");

    const contentStream = content.join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /Resources << /Font << ${fontName} 3 0 R >> >> /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjectNumber} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`);
  }

  const kids = pagesKids.join(" ");
  objects.splice(1, 0, `<< /Type /Pages /Kids [ ${kids} ] /Count ${pageObjectNumbers.length} >>`);
  objects.splice(2, 0, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  return buildPdfDocument(objects);
}

function buildPdfDocument(objects) {
  const header = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const chunks = [Buffer.from(header, "latin1")];
  const offsets = [0];
  let byteOffset = Buffer.byteLength(header, "latin1");

  objects.forEach((body, index) => {
    const objectNumber = index + 1;
    const objectText = `${objectNumber} 0 obj\n${body}\nendobj\n`;
    offsets.push(byteOffset);
    chunks.push(Buffer.from(objectText, "utf8"));
    byteOffset += Buffer.byteLength(objectText, "utf8");
  });

  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, "utf8"));
  chunks.push(Buffer.from(trailer, "utf8"));

  return Buffer.concat(chunks);
}

function getCellRef(columnIndex, rowIndex) {
  let column = columnIndex + 1;
  let letters = "";

  while (column > 0) {
    const remainder = (column - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    column = Math.floor((column - 1) / 26);
  }

  return `${letters}${rowIndex}`;
}

function buildInlineStringCell(value, cellRef) {
  return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function buildSheetXml(event, rows, totalAttendees) {
  const summary = buildAttendanceReportSummary(event, totalAttendees);
  const xmlRows = [];
  let rowIndex = 1;

  function addRow(values) {
    const cells = values
      .map((value, columnIndex) => buildInlineStringCell(value, getCellRef(columnIndex, rowIndex)))
      .join("");

    xmlRows.push(`<row r="${rowIndex}">${cells}</row>`);
    rowIndex += 1;
  }

  addRow(["EVENT ATTENDANCE REPORT"]);
  addRow([`Event: ${summary.eventName}`]);
  addRow([`Date: ${summary.eventDate}`]);
  addRow([`Venue: ${summary.venue}`]);
  addRow([`Status: ${summary.status}`]);
  addRow([`Total Attendees: ${summary.totalAttendees}`]);
  addRow([""]);
  addRow([
    "No.",
    "Attendee Name",
    "Phone Number",
    "Email",
    "Check-in Time",
    "Checked In By",
    "Ticket Type",
    "Ticket Reference",
    "Ticket Status",
    "Order Reference",
  ]);

  rows.forEach((row) => {
    addRow([
      String(row.no),
      row.name,
      row.phone,
      row.email,
      row.checkedInAt,
      row.checkedInBy,
      row.ticketType,
      row.ticketReference,
      row.ticketStatus,
      row.orderReference,
    ]);
  });

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows.join("")}</sheetData></worksheet>`;
}

function buildWorkbookXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Attendance" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

function buildWorkbookRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
}

function buildRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
}

function buildContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`;
}

function crc32(buffer) {
  const table = crc32.table || (crc32.table = (() => {
    const generated = new Uint32Array(256);

    for (let i = 0; i < 256; i += 1) {
      let c = i;

      for (let k = 0; k < 8; k += 1) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }

      generated[i] = c >>> 0;
    }

    return generated;
  })());

  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc = table[(crc ^ buffer[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;

  return { dosTime, dosDate };
}

function buildZip(entries) {
  const parts = [];
  const centralDirectory = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuffer = Buffer.from(entry.name, "utf8");
    const uncompressed = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const compressed = entry.compress === false ? uncompressed : zlib.deflateRawSync(uncompressed);
    const checksum = crc32(uncompressed);
    const { dosTime, dosDate } = dosDateTime(entry.date || new Date());

    const localHeader = Buffer.alloc(30 + fileNameBuffer.length);
    let pos = 0;
    localHeader.writeUInt32LE(0x04034b50, pos); pos += 4;
    localHeader.writeUInt16LE(20, pos); pos += 2;
    localHeader.writeUInt16LE(0, pos); pos += 2;
    localHeader.writeUInt16LE(entry.compress === false ? 0 : 8, pos); pos += 2;
    localHeader.writeUInt16LE(dosTime, pos); pos += 2;
    localHeader.writeUInt16LE(dosDate, pos); pos += 2;
    localHeader.writeUInt32LE(checksum, pos); pos += 4;
    localHeader.writeUInt32LE(compressed.length, pos); pos += 4;
    localHeader.writeUInt32LE(uncompressed.length, pos); pos += 4;
    localHeader.writeUInt16LE(fileNameBuffer.length, pos); pos += 2;
    localHeader.writeUInt16LE(0, pos); pos += 2;
    fileNameBuffer.copy(localHeader, pos);

    parts.push(localHeader, compressed);

    const centralHeader = Buffer.alloc(46 + fileNameBuffer.length);
    pos = 0;
    centralHeader.writeUInt32LE(0x02014b50, pos); pos += 4;
    centralHeader.writeUInt16LE(20, pos); pos += 2;
    centralHeader.writeUInt16LE(20, pos); pos += 2;
    centralHeader.writeUInt16LE(0, pos); pos += 2;
    centralHeader.writeUInt16LE(entry.compress === false ? 0 : 8, pos); pos += 2;
    centralHeader.writeUInt16LE(dosTime, pos); pos += 2;
    centralHeader.writeUInt16LE(dosDate, pos); pos += 2;
    centralHeader.writeUInt32LE(checksum, pos); pos += 4;
    centralHeader.writeUInt32LE(compressed.length, pos); pos += 4;
    centralHeader.writeUInt32LE(uncompressed.length, pos); pos += 4;
    centralHeader.writeUInt16LE(fileNameBuffer.length, pos); pos += 2;
    centralHeader.writeUInt16LE(0, pos); pos += 2;
    centralHeader.writeUInt16LE(0, pos); pos += 2;
    centralHeader.writeUInt16LE(0, pos); pos += 2;
    centralHeader.writeUInt16LE(0, pos); pos += 2;
    centralHeader.writeUInt32LE(0, pos); pos += 4;
    centralHeader.writeUInt32LE(offset, pos); pos += 4;
    fileNameBuffer.copy(centralHeader, pos);

    centralDirectory.push(centralHeader);

    offset += localHeader.length + compressed.length;
  }

  const centralDirectoryBuffer = Buffer.concat(centralDirectory);
  const eocd = Buffer.alloc(22);
  let pos = 0;
  eocd.writeUInt32LE(0x06054b50, pos); pos += 4;
  eocd.writeUInt16LE(0, pos); pos += 2;
  eocd.writeUInt16LE(0, pos); pos += 2;
  eocd.writeUInt16LE(entries.length, pos); pos += 2;
  eocd.writeUInt16LE(entries.length, pos); pos += 2;
  eocd.writeUInt32LE(centralDirectoryBuffer.length, pos); pos += 4;
  eocd.writeUInt32LE(offset, pos); pos += 4;
  eocd.writeUInt16LE(0, pos);

  return Buffer.concat([...parts, centralDirectoryBuffer, eocd]);
}

export function buildAttendancePdfBuffer(event, attendanceRecords, totalAttendees) {
  const rows = buildAttendanceReportRows(attendanceRecords);
  const lines = buildPdfContentLines(event, rows, totalAttendees).flatMap((line) => wrapText(line, 96));
  return buildPdfPages(lines);
}

export function buildAttendanceExcelBuffer(event, attendanceRecords, totalAttendees) {
  const rows = buildAttendanceReportRows(attendanceRecords);
  const sheetXml = buildSheetXml(event, rows, totalAttendees);

  return buildZip([
    {
      name: "[Content_Types].xml",
      data: buildContentTypesXml(),
    },
    {
      name: "_rels/.rels",
      data: buildRelsXml(),
    },
    {
      name: "xl/workbook.xml",
      data: buildWorkbookXml(),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: buildWorkbookRelsXml(),
    },
    {
      name: "xl/styles.xml",
      data: buildStylesXml(),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: sheetXml,
    },
  ]);
}
