import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import * as jwt from 'jsonwebtoken';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createTokens(user: UserDocument): Promise<{
    accessToken: string;
    refreshToken: string;
    refreshTokenExpiredInSeconds: number;
  }> {
    const accessToken = this.createAccessToken(user);
    const { refreshToken, expiredInMilliseconds } =
      this.createRefreshToken(user);

    await this.storeRefreshTokenOnCache(
      user,
      refreshToken,
      expiredInMilliseconds,
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiredInSeconds: expiredInMilliseconds,
    };
  }

  private createAccessToken(user: UserDocument) {
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const accessToken = jwt.sign(
      { id: user._id, isActive: user.is_active },
      accessTokenSecret || 'access_secret',
      {
        expiresIn: 1000 * 60, // 60 seconds
      },
    );
    return accessToken;
  }

  private createRefreshToken(user: UserDocument) {
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
    const expiredInMilliseconds = 1000 * 60 * 60 * 24 * 365; // 365 days in milliseconds
    const refreshToken = jwt.sign(
      { id: user._id, isActive: user.is_active },
      refreshTokenSecret || 'refresh_secret',
      {
        expiresIn: expiredInMilliseconds, // 365 days in milliseconds
      },
    );
    return { refreshToken, expiredInMilliseconds };
  }

  private async storeRefreshTokenOnCache(
    user: UserDocument,
    refreshToken: string,
    ttl: number,
  ) {
    await this.cacheManager.set(
      `refreshtoken:${user._id}:${refreshToken}`,
      1,
      ttl,
    );
  }
}
