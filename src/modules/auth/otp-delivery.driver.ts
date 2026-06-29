import { Injectable, Logger } from '@nestjs/common';

/**
 * Delivery abstraction. The console driver lets the whole auth flow run with
 * zero external credentials in development and CI. Swapping in Twilio/SES is a
 * matter of providing a different implementation bound to OTP_DRIVER, with no
 * change to calling code.
 */
export interface OtpDeliveryDriver {
  send(destination: string, code: string): Promise<void>;
}

@Injectable()
export class ConsoleOtpDriver implements OtpDeliveryDriver {
  private readonly logger = new Logger('OTP');

  async send(destination: string, code: string): Promise<void> {
    // In production this branch is never registered. Dev only.
    this.logger.warn(`OTP for ${destination}: ${code}`);
  }
}

export const OTP_DELIVERY_DRIVER = 'OTP_DELIVERY_DRIVER';
