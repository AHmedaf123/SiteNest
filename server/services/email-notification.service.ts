import nodemailer from 'nodemailer';
import { EMAIL_CONFIG, BUSINESS_CONFIG } from '../config/index.js';

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount: number;
  bookingId?: string;
  specialRequests?: string;
}

interface AvailabilityEmailData {
  customerName: string;
  customerEmail: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  availableRooms?: Array<{
    roomNumber: string;
    title: string;
    price: number;
  }>;
}

export class EmailNotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = this.createEmailTransporter();
  }

  private createEmailTransporter() {
    const emailUser = process.env.EMAIL_USER || EMAIL_CONFIG.user;
    const emailPassword = process.env.EMAIL_PASSWORD || EMAIL_CONFIG.password;

    if (emailUser?.includes('@gmail.com')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });
    }

    // Fallback SMTP configuration
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  }

  /**
   * Send availability confirmation email to customer
   */
  async sendAvailabilityConfirmation(data: AvailabilityEmailData): Promise<boolean> {
    try {
      const { customerName, customerEmail, checkIn, checkOut, guests, availableRooms, roomNumber } = data;
      
      const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));

      let availabilityContent = '';
      if (availableRooms && availableRooms.length > 0) {
        availabilityContent = `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-bottom: 15px;">✅ Available Rooms for Your Dates:</h3>
            ${availableRooms.map(room => `
              <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #1e40af;">
                <h4 style="margin: 0 0 5px 0; color: #1f2937;">Room ${room.roomNumber} - ${room.title}</h4>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">PKR ${room.price.toLocaleString()}/night</p>
              </div>
            `).join('')}
          </div>
        `;
      } else if (roomNumber) {
        availabilityContent = `
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <h3 style="color: #16a34a; margin-bottom: 10px;">✅ Room ${roomNumber} is Available!</h3>
            <p style="color: #15803d; margin: 0;">Your requested room is confirmed available for the selected dates.</p>
          </div>
        `;
      }

      const mailOptions = {
        from: `${BUSINESS_CONFIG.name} <${EMAIL_CONFIG.from}>`,
        to: customerEmail,
        subject: `🏨 Room Availability Confirmed - ${BUSINESS_CONFIG.name}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">${BUSINESS_CONFIG.name}</h1>
              <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">${BUSINESS_CONFIG.tagline}</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px 20px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Hello ${customerName}! 👋</h2>
              
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Great news! We've checked availability for your requested dates and have excellent options for you.
              </p>

              <!-- Booking Details -->
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin-bottom: 15px;">📅 Your Booking Request:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Check-in:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${checkInDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Check-out:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${checkOutDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Duration:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${nights} night${nights > 1 ? 's' : ''}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Guests:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${guests} guest${guests > 1 ? 's' : ''}</td>
                  </tr>
                </table>
              </div>

              ${availabilityContent}

              <!-- Next Steps -->
              <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1e40af; margin-bottom: 15px;">🚀 Next Steps to Confirm Your Booking:</h3>
                <ol style="color: #1f2937; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li><strong>Send Advance Payment:</strong> PKR 500-2000 via EasyPaisa to <strong>0311-5197087</strong> (Abdullah Sultan)</li>
                  <li><strong>Take Screenshot:</strong> Capture your payment confirmation</li>
                  <li><strong>WhatsApp Confirmation:</strong> Send the screenshot to <strong>+92-311-5197087</strong></li>
                  <li><strong>Receive Confirmation:</strong> Get your booking confirmation within 2-4 hours</li>
                </ol>
              </div>

              <!-- Contact Information -->
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-bottom: 15px;">📞 Contact Information:</h3>
                <p style="margin: 5px 0; color: #4b5563;"><strong>WhatsApp/Phone:</strong> +92-311-5197087</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${BUSINESS_CONFIG.contact.email}</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Location:</strong> ${BUSINESS_CONFIG.location.address}</p>
              </div>

              <p style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
                Thank you for choosing ${BUSINESS_CONFIG.name}! We look forward to hosting you and providing an exceptional experience.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                ${BUSINESS_CONFIG.name} - ${BUSINESS_CONFIG.tagline}
              </p>
              <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
                ${BUSINESS_CONFIG.location.address}
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Availability confirmation email sent to: ${customerEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send availability confirmation email:', error);
      return false;
    }
  }

  /**
   * Send booking confirmation email when admin confirms payment
   */
  async sendBookingConfirmation(data: BookingEmailData): Promise<boolean> {
    try {
      const { customerName, customerEmail, roomNumber, checkIn, checkOut, guests, totalAmount, bookingId, specialRequests } = data;
      
      const checkInDate = new Date(checkIn).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const checkOutDate = new Date(checkOut).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));

      const mailOptions = {
        from: `${BUSINESS_CONFIG.name} <${EMAIL_CONFIG.from}>`,
        to: customerEmail,
        subject: `🎉 Booking Confirmed - ${BUSINESS_CONFIG.name} Room ${roomNumber}`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Booking Confirmed!</h1>
              <p style="color: #dcfce7; margin: 8px 0 0 0; font-size: 16px;">${BUSINESS_CONFIG.name} - ${BUSINESS_CONFIG.tagline}</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px 20px;">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Congratulations ${customerName}! 🎊</h2>
              
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
                Your payment has been verified and your booking is now <strong style="color: #16a34a;">CONFIRMED</strong>! 
                We're excited to welcome you to ${BUSINESS_CONFIG.name}.
              </p>

              <!-- Booking Confirmation -->
              <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                <h3 style="color: #16a34a; margin-bottom: 15px;">✅ Confirmed Booking Details:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${bookingId ? `
                  <tr>
                    <td style="padding: 8px 0; color: #15803d; font-weight: 500;">Booking ID:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${bookingId}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0; color: #15803d; font-weight: 500;">Room:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">Room ${roomNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #15803d; font-weight: 500;">Check-in:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${checkInDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #15803d; font-weight: 500;">Check-out:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${checkOutDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #15803d; font-weight: 500;">Duration:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${nights} night${nights > 1 ? 's' : ''}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #15803d; font-weight: 500;">Guests:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${guests} guest${guests > 1 ? 's' : ''}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #15803d; font-weight: 500;">Total Amount:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">PKR ${totalAmount.toLocaleString()}</td>
                  </tr>
                </table>
                ${specialRequests ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #bbf7d0;">
                  <p style="color: #15803d; font-weight: 500; margin: 0 0 5px 0;">Special Requests:</p>
                  <p style="color: #1f2937; margin: 0; font-style: italic;">${specialRequests}</p>
                </div>
                ` : ''}
              </div>

              <!-- Check-in Instructions -->
              <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1e40af; margin-bottom: 15px;">🏨 Check-in Instructions:</h3>
                <ul style="color: #1f2937; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Check-in time: 2:00 PM onwards</li>
                  <li>Check-out time: 12:00 PM</li>
                  <li>Contact us on WhatsApp <strong>+92-311-5197087</strong> when you arrive</li>
                  <li>Bring a valid ID for verification</li>
                  <li>Our team will meet you at the apartment for key handover</li>
                </ul>
              </div>

              <!-- Contact Information -->
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-bottom: 15px;">📞 24/7 Support:</h3>
                <p style="margin: 5px 0; color: #4b5563;"><strong>WhatsApp/Phone:</strong> +92-311-5197087</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${BUSINESS_CONFIG.contact.email}</p>
                <p style="margin: 5px 0; color: #4b5563;"><strong>Address:</strong> ${BUSINESS_CONFIG.location.address}</p>
              </div>

              <p style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
                Thank you for choosing ${BUSINESS_CONFIG.name}! We can't wait to provide you with an exceptional stay experience.
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                ${BUSINESS_CONFIG.name} - Where Luxury Meets Comfort
              </p>
              <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 12px;">
                ${BUSINESS_CONFIG.location.address}
              </p>
            </div>
          </div>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Booking confirmation email sent to: ${customerEmail}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send booking confirmation email:', error);
      return false;
    }
  }
}

export const emailNotificationService = new EmailNotificationService();
