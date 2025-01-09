import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  createTokens(user: UserDocument): {
    accessToken: string;
    refreshToken: string;
    refreshTokenExpiredInSeconds: number;
  } {
    const accessToken = AuthService.createAccessToken(user);
    const { refreshToken, expiredInSeconds } =
      AuthService.createRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiredInSeconds: expiredInSeconds,
    };
  }

  private static createAccessToken(user: UserDocument) {
    const accessTokenSecret =
      process.env.ACCESS_TOKEN_SECRET || 'access_secret';
    const accessToken = jwt.sign(
      { id: user._id, isActive: user.is_active },
      accessTokenSecret,
      {
        algorithm: 'RS256',
        expiresIn: 1000 * 60, // 60 seconds
      },
    );
    return accessToken;
  }

  private static createRefreshToken(user: UserDocument) {
    const refreshTokenSecret =
      process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';

    const expiredInSeconds = 60 * 60 * 24 * 365; // 365 days in seconds
    const refreshToken = jwt.sign(
      { id: user._id, isActive: user.is_active },
      refreshTokenSecret,
      {
        algorithm: 'HS384',
        expiresIn: expiredInSeconds * 1000, // 365 days in milliseconds
      },
    );
    return { refreshToken, expiredInSeconds };
  }
}
