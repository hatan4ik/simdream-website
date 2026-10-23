import sgMail from '@sendgrid/mail';
import { Booking } from '@/types';
import { formatDate } from './utils';

const apiKey = process.env.SENDGRID_API_KEY || '';
export const isSendgridConfigured = Boolean(
  apiKey && apiKey.startsWith('SG.') && !apiKey.includes('SG....')
);

if (isSendgridConfigured) {
  sgMail.setApiKey(apiKey);
}

const senderEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'info@simdream.co.il';

export async function sendBookingConfirmationEmail(booking: Booking): Promise<{ success: boolean; message: string }> {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #f8fafc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden; }
          .header { background: #0284c7; padding: 24px; text-align: center; }
          .content { padding: 32px 24px; }
          .badge { display: inline-block; background: #0284c7; color: #fff; padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 14px; }
          .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; background: #1e293b; border-radius: 8px; overflow: hidden; }
          .details-table td { padding: 12px 16px; border-bottom: 1px solid #334155; font-size: 14px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #1e293b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0; font-size: 24px; color: #ffffff; letter-spacing: 1px;">SIM DREAM LTD</h1>
            <p style="margin:4px 0 0 0; color: #e0f2fe; font-size: 13px;">Boeing 737 MAX Commercial Flight Simulation Center | Tel Aviv</p>
          </div>
          <div class="content">
            <span class="badge">FLIGHT RESERVATION CONFIRMED</span>
            <h2 style="color: #38bdf8; margin-top: 16px;">Flight Clearance: ${booking.bookingReference}</h2>
            <p style="color: #cbd5e1; line-height: 1.6;">
              Dear <strong>${booking.pilotName}</strong>,<br>
              Your flight deck reservation in our Boeing 737 MAX flight simulator has been confirmed. Please arrive 15 minutes before your scheduled departure time for pre-flight mission briefing.
            </p>

            <table class="details-table">
              <tr>
                <td style="color: #94a3b8;">Flight Mission</td>
                <td style="color: #ffffff; font-weight: bold;">${booking.packageTitle}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8;">Flight Date</td>
                <td style="color: #ffffff; font-weight: bold;">${formatDate(booking.bookingDate)}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8;">Cockpit Slot</td>
                <td style="color: #38bdf8; font-weight: bold;">${booking.startTime} - ${booking.endTime} (IST)</td>
              </tr>
              <tr>
                <td style="color: #94a3b8;">Center Location</td>
                <td style="color: #ffffff;">Gershon Shatz St 36, Tel Aviv-Yafo (Yehudit Light Rail / HaShalom Station)</td>
              </tr>
              <tr>
                <td style="color: #94a3b8;">Total Paid</td>
                <td style="color: #10b981; font-weight: bold;">₪${booking.totalIls}</td>
              </tr>
            </table>

            <p style="color: #94a3b8; font-size: 13px;">
              Observers / Guests: You may bring up to 2 companions to observe from the cockpit jumpseats free of charge. Comfortable casual clothes and flat-soled shoes are recommended.
            </p>
          </div>
          <div class="footer">
            Sim Dream LTD &bull; Tel Aviv, Israel &bull; www.simdream.co.il<br>
            For assistance, contact desk@simdream.co.il or +972-55-507-1307
          </div>
        </div>
      </body>
    </html>
  `;

  if (isSendgridConfigured) {
    try {
      await sgMail.send({
        to: booking.pilotEmail,
        from: senderEmail,
        subject: `Sim Dream Boeing 737 MAX Confirmation - [${booking.bookingReference}]`,
        html: emailHtml,
      });
      return { success: true, message: 'Confirmation email dispatched via SendGrid.' };
    } catch (err: any) {
      console.error('SendGrid error:', err);
      return { success: false, message: err?.message || 'Failed to dispatch email.' };
    }
  }

  // Simulation mode
  console.log(`[SIMULATION EMAIL] To: ${booking.pilotEmail} | Booking: ${booking.bookingReference}`);
  return { success: true, message: 'Email queued in local simulator mode.' };
}

