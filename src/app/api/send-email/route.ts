import { SESClient, SendRawEmailCommand, SendEmailCommand } from '@aws-sdk/client-ses'
import { NextResponse } from 'next/server'
import { generateIcs } from '@/utils/generateIcs'

const sesClient = new SESClient({ region: process.env.AWS_REGION ?? 'eu-central-1' })

export interface SendEmailPayload {
  type: 'approved' | 'denied'
  reservation: {
    id: string
    customerName: string
    customerEmail: string
    date: string
    time: string
    endTime?: string | null
    partySize: number
    notes?: string | null
  }
  tenantName: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(time: string) {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:${m} ${ampm}`
}

// ── BrutX email templates ──────────────────────────────────────────────────

function approvedHtml(
  customerName: string,
  tenantName: string,
  date: string,
  time: string,
  partySize: number,
  notes?: string | null
) {
  const notesRow = notes
    ? `<tr>
        <td colspan="3" style="padding:12px 0 0 0;border-top:2px solid #000;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555;margin-bottom:4px;">Special Requests</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:600;color:#000;">${notes}</div>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Reservation Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:#4ecdc4;border:3px solid #000;box-shadow:5px 5px 0 #000;padding:28px 32px;margin-bottom:24px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#000;margin-bottom:6px;">✓ RESERVATION CONFIRMED</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">${tenantName}</div>
        </td>
      </tr>

      <tr><td style="height:20px;"></td></tr>

      <!-- Greeting -->
      <tr>
        <td style="background:#fff;border:3px solid #000;box-shadow:4px 4px 0 #000;padding:24px 32px;">
          <p style="font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;color:#000;margin:0 0 8px 0;">Dear ${customerName},</p>
          <p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#333;margin:0;">Great news — your reservation has been <strong>confirmed</strong>. We look forward to welcoming you!</p>
        </td>
      </tr>

      <tr><td style="height:16px;"></td></tr>

      <!-- Details card -->
      <tr>
        <td style="background:#ffe66d;border:3px solid #000;box-shadow:4px 4px 0 #000;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="padding-bottom:16px;">
                <div style="font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:4px;">DATE</div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:800;color:#000;">${formatDate(date)}</div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding-right:16px;">
                <div style="font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:4px;">TIME</div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:900;color:#000;">${formatTime(time)}</div>
              </td>
              <td width="50%">
                <div style="font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:4px;">GUESTS</div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:900;color:#000;">${partySize}</div>
              </td>
            </tr>
            ${notesRow}
          </table>
        </td>
      </tr>

      <tr><td style="height:16px;"></td></tr>

      <!-- Calendar CTA -->
      <tr>
        <td style="background:#ff6b6b;border:3px solid #000;box-shadow:4px 4px 0 #000;padding:18px 32px;text-align:center;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:14px;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:1px;">
            📅 &nbsp;A calendar invite (.ics) is attached — tap to add it to your calendar!
          </div>
        </td>
      </tr>

      <tr><td style="height:16px;"></td></tr>

      <!-- Footer -->
      <tr>
        <td style="border-top:3px solid #000;padding-top:20px;">
          <p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666;margin:0 0 4px 0;">This email was sent by <strong>${tenantName}</strong>.</p>
          <p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666;margin:0;">If you have any questions, please contact the restaurant directly.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

function deniedHtml(
  customerName: string,
  tenantName: string,
  date: string,
  time: string,
  partySize: number
) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Reservation Update</title>
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Courier New',Courier,monospace;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:#ff6b6b;border:3px solid #000;box-shadow:5px 5px 0 #000;padding:28px 32px;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#000;margin-bottom:6px;">RESERVATION UPDATE</div>
          <div style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:1px;line-height:1.1;">${tenantName}</div>
        </td>
      </tr>

      <tr><td style="height:20px;"></td></tr>

      <!-- Message -->
      <tr>
        <td style="background:#fff;border:3px solid #000;box-shadow:4px 4px 0 #000;padding:24px 32px;">
          <p style="font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:700;color:#000;margin:0 0 12px 0;">Dear ${customerName},</p>
          <p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#333;margin:0 0 8px 0;">We regret to inform you that we are unable to accommodate your reservation request for the date and time below.</p>
          <p style="font-family:'Courier New',Courier,monospace;font-size:14px;color:#333;margin:0;">We apologise for any inconvenience and hope to welcome you another time.</p>
        </td>
      </tr>

      <tr><td style="height:16px;"></td></tr>

      <!-- Requested details -->
      <tr>
        <td style="background:#f5f5f5;border:3px solid #000;box-shadow:4px 4px 0 #000;padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="100%" style="padding-bottom:16px;">
                <div style="font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:4px;">REQUESTED DATE</div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:800;color:#000;">${formatDate(date)}</div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding-right:16px;">
                <div style="font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:4px;">REQUESTED TIME</div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:900;color:#000;">${formatTime(time)}</div>
              </td>
              <td width="50%">
                <div style="font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:4px;">GUESTS</div>
                <div style="font-family:'Courier New',Courier,monospace;font-size:22px;font-weight:900;color:#000;">${partySize}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr><td style="height:16px;"></td></tr>

      <!-- Footer -->
      <tr>
        <td style="border-top:3px solid #000;padding-top:20px;">
          <p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666;margin:0 0 4px 0;">This email was sent by <strong>${tenantName}</strong>.</p>
          <p style="font-family:'Courier New',Courier,monospace;font-size:12px;color:#666;margin:0;">Feel free to submit a new reservation request on our website.</p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ── MIME builder for raw email with optional ICS attachment ────────────────

function buildRawMime(params: {
  from: string
  to: string
  subject: string
  html: string
  ics?: string
}): Buffer {
  const boundary = `----=_Part_${Date.now()}`

  const parts: string[] = [
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    params.html,
  ]

  if (params.ics) {
    const icsB64 = Buffer.from(params.ics).toString('base64')
    // Split base64 into 76-char lines per RFC 2045
    const wrapped = icsB64.match(/.{1,76}/g)?.join('\r\n') ?? icsB64
    parts.push(
      `--${boundary}`,
      'Content-Type: text/calendar; method=REQUEST; name="reservation.ics"',
      'Content-Disposition: attachment; filename="reservation.ics"',
      'Content-Transfer-Encoding: base64',
      '',
      wrapped
    )
  }

  parts.push(`--${boundary}--`)

  return Buffer.from(parts.join('\r\n'))
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const payload: SendEmailPayload = await request.json()
    const { type, reservation, tenantName } = payload

    if (!reservation.customerEmail) {
      return NextResponse.json({ error: 'No email address provided' }, { status: 400 })
    }

    const from = process.env.SES_FROM_EMAIL ?? 'noreply@example.com'
    const to = reservation.customerEmail

    if (type === 'approved') {
      const html = approvedHtml(
        reservation.customerName,
        tenantName,
        reservation.date,
        reservation.time,
        reservation.partySize,
        reservation.notes
      )
      const ics = generateIcs({
        id: reservation.id,
        tenantName,
        date: reservation.date,
        time: reservation.time,
        endTime: reservation.endTime,
        partySize: reservation.partySize,
        notes: reservation.notes,
      })
      const raw = buildRawMime({
        from,
        to,
        subject: `✓ Your reservation at ${tenantName} is confirmed`,
        html,
        ics,
      })
      await sesClient.send(new SendRawEmailCommand({ RawMessage: { Data: raw } }))
    } else {
      const html = deniedHtml(
        reservation.customerName,
        tenantName,
        reservation.date,
        reservation.time,
        reservation.partySize
      )
      await sesClient.send(
        new SendEmailCommand({
          Source: from,
          Destination: { ToAddresses: [to] },
          Message: {
            Subject: {
              Data: `Regarding your reservation request at ${tenantName}`,
              Charset: 'UTF-8',
            },
            Body: {
              Html: { Data: html, Charset: 'UTF-8' },
            },
          },
        })
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('SES error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to send email' }, { status: 500 })
  }
}
