import {
  ApiBody,
  ApiExcludeController,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetAuthenticatedAccount } from './queries/GetAuthedAccount.service';
import { Controller, Get, Headers, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TenantAgnosticRoute } from '../Tenancy/TenancyGlobal.guard';
import { AuthenticationApplication } from './AuthApplication.sevice';
import { IgnoreUserVerifiedRoute } from './guards/EnsureUserVerified.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClsService } from 'nestjs-cls';
import { events } from '@/common/events/events';

@Controller('/auth')
@ApiTags('Auth')
@TenantAgnosticRoute()
@IgnoreUserVerifiedRoute()
@Throttle({ auth: {} })
export class AuthedController {
  constructor(
    private readonly getAuthedAccountService: GetAuthenticatedAccount,
    private readonly authApp: AuthenticationApplication,
    private readonly eventPublisher: EventEmitter2,
    private readonly cls: ClsService,
  ) {}

  @Post('/signout')
  @ApiOperation({ summary: 'Sign out the authenticated user (audit logout)' })
  async signout(@Headers('organization-id') organizationId?: string) {
    // Stateless JWT has no server session to destroy; this records the logout
    // in the audit trail. The client still discards its token. This route is
    // tenant-agnostic, so set the tenant from the header for the audit write.
    if (organizationId) {
      this.cls.set('organizationId', organizationId);
    }
    const userId = this.cls.get<number>('userId') ?? null;
    await this.eventPublisher.emitAsync(events.auth.signOut, { userId });

    return { code: 200, message: 'Signed out successfully.' };
  }

  @Post('/signup/verify/resend')
  @ApiOperation({ summary: 'Resend the signup confirmation message' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: 'resent successfully.' },
      },
    },
  })
  async resendSignupConfirm() {
    await this.authApp.signUpConfirmResend();

    return {
      code: 200,
      message: 'The signup confirmation message has been resent successfully.',
    };
  }

  @Get('/account')
  @ApiOperation({ summary: 'Retrieve the authenticated account' })
  async getAuthedAcccount() {
    return this.getAuthedAccountService.getAccount();
  }
}
