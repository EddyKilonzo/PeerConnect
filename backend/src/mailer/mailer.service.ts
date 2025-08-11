import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = this.configService.get<number>('MAIL_PORT', 587);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    this.logger.log(
      `Initializing SMTP transporter with host: ${host}, port: ${port}`,
    );
    this.logger.log(`SMTP User: ${user ? '✓ Set' : '✗ Missing'}`);
    this.logger.log(`SMTP Password: ${pass ? '✓ Set' : '✗ Missing'}`);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    this.logger.log('SMTP transporter initialized successfully');
  }

  private loadTemplate(
    templateName: string,
    data: Record<string, any>,
  ): string {
    try {
      const templatePath = path.join(
        __dirname,
        'templates',
        `${templateName}.ejs`,
      );

      if (!fs.existsSync(templatePath)) {
        this.logger.error(`Template not found: ${templatePath}`);
        throw new Error(`Email template not found: ${templateName}`);
      }

      const template = fs.readFileSync(templatePath, 'utf-8');
      return ejs.render(template, data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to load email template: ${templateName}`,
        errorMessage,
      );
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  async sendVerificationEmail(
    email: string,
    verificationCode: string,
    firstName: string,
  ): Promise<void> {
    try {
      const htmlContent = this.loadTemplate('verification-email', {
        firstName,
        verificationCode,
        appName: 'PeerConnect',
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'support@peerconnect.com',
        ),
      });

      const mailOptions = {
        from: `"PeerConnect" <${this.configService.get<string>('MAIL_USER')}>`,
        to: email,
        subject: 'Verify Your Email - PeerConnect',
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent successfully to: ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send verification email to: ${email}`,
        errorMessage,
      );
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    firstName: string,
  ): Promise<void> {
    try {
      const htmlContent = this.loadTemplate('password-reset', {
        firstName,
        resetToken,
        appName: 'PeerConnect',
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'support@peerconnect.com',
        ),
      });

      const mailOptions = {
        from: `"PeerConnect" <${this.configService.get<string>('MAIL_USER')}>`,
        to: email,
        subject: 'Reset Your Password - PeerConnect',
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent successfully to: ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send password reset email to: ${email}`,
        errorMessage,
      );
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      const htmlContent = this.loadTemplate('welcome-email', {
        firstName,
        appName: 'PeerConnect',
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'support@peerconnect.com',
        ),
      });

      const mailOptions = {
        from: `"PeerConnect" <${this.configService.get<string>('MAIL_USER')}>`,
        to: email,
        subject: 'Welcome to PeerConnect!',
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent successfully to: ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send welcome email to: ${email}`,
        errorMessage,
      );
      throw new Error('Failed to send welcome email');
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      this.logger.log('Testing SMTP connection...');
      await this.transporter.verify();
      this.logger.log('✓ SMTP connection verified successfully');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`✗ SMTP connection failed: ${errorMessage}`);
      return false;
    }
  }

  // Notification email methods
  async sendSessionReminderEmail(
    email: string,
    firstName: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      const htmlContent = this.loadTemplate('session-reminder', {
        firstName,
        title,
        message,
        appName: 'PeerConnect',
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'support@peerconnect.com',
        ),
      });

      const mailOptions = {
        from: `"PeerConnect" <${this.configService.get<string>('MAIL_USER')}>`,
        to: email,
        subject: title,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Session reminder email sent successfully to: ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send session reminder email to: ${email}`,
        errorMessage,
      );
      throw new Error('Failed to send session reminder email');
    }
  }

  async sendNewResourceEmail(
    email: string,
    firstName: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      const htmlContent = this.loadTemplate('new-resource', {
        firstName,
        title,
        message,
        appName: 'PeerConnect',
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'support@peerconnect.com',
        ),
      });

      const mailOptions = {
        from: `"PeerConnect" <${this.configService.get<string>('MAIL_USER')}>`,
        to: email,
        subject: title,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`New resource email sent successfully to: ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send new resource email to: ${email}`,
        errorMessage,
      );
      throw new Error('Failed to send new resource email');
    }
  }

  async sendGroupActivityEmail(
    email: string,
    firstName: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      const htmlContent = this.loadTemplate('group-activity', {
        firstName,
        title,
        message,
        appName: 'PeerConnect',
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'support@peerconnect.com',
        ),
      });

      const mailOptions = {
        from: `"PeerConnect" <${this.configService.get<string>('MAIL_USER')}>`,
        to: email,
        subject: title,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Group activity email sent successfully to: ${email}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send group activity email to: ${email}`,
        errorMessage,
      );
      throw new Error('Failed to send group activity email');
    }
  }

  async sendGeneralNotificationEmail(
    email: string,
    firstName: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      const htmlContent = this.loadTemplate('general-notification', {
        firstName,
        title,
        message,
        appName: 'PeerConnect',
        supportEmail: this.configService.get<string>(
          'SUPPORT_EMAIL',
          'support@peerconnect.com',
        ),
      });

      const mailOptions = {
        from: `"PeerConnect" <${this.configService.get<string>('MAIL_USER')}>`,
        to: email,
        subject: title,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `General notification email sent successfully to: ${email}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send general notification email to: ${email}`,
        errorMessage,
      );
      throw new Error('Failed to send general notification email');
    }
  }
}
