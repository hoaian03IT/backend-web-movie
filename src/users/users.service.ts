import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

const saltRounds = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createNewUser(body: CreateUserDto): Promise<UserDocument> {
    // if the user is existed but was not verified
    const existedUser = await this.userModel.findOne({
      email: body.email,
      is_verified: false,
    });

    if (existedUser) {
      return existedUser;
    }

    // hash password
    const hashedPassword = await bcrypt.hash(body.password, saltRounds);

    const user = new this.userModel({
      email: body.email,
      password: hashedPassword,
      is_active: body.isActive,
    });

    return await user.save();
  }

  async updateVerifiedStatus(
    userId: string,
    verifiedStatus: boolean,
  ): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(userId, {
      is_verified: verifiedStatus,
    });

    // throw user not found exception
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // if the user information is existing on cache, update it
    let result = await this.cacheManager.get(`userinfo${user._id}`);
    if (result) {
      let resultParsed = JSON.parse(result + '');
      await this.cacheManager.set(`userinfo${user._id}`, {
        ...resultParsed,
        is_verified: verifiedStatus,
      });
    }

    return user;
  }

  async findUserUnVerifiedById(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findOneAndUpdate({
      _id: userId,
      is_verified: false,
    });

    // throw user not found exception
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findUserByEmail(
    email: string,
    verified: boolean = true,
  ): Promise<UserDocument> {
    const user = await this.userModel.findOneAndUpdate({
      email: email,
      is_verified: verified,
    });

    // throw user not found exception
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getUserInfoById(userId: string): Promise<User> {
    // check cache first
    let user: User | null;
    const result = await this.cacheManager.get(`userinfo:${userId}`);

    if (result) {
      user = JSON.parse(result + '');
    } else {
      user = await this.userModel.findOne(
        {
          _id: userId,
        },
        'email name is_active is_verified',
      );
      // store user information in cache
      await this.cacheManager.set(`userinfo:${userId}`, JSON.stringify(user));
    }

    // throw user not found exception
    if (!user) throw new NotFoundException('User not found');
    else if (!user.is_active) throw new ForbiddenException('User was disabled');
    else if (!user.is_verified)
      throw new ForbiddenException('User was not verified');

    return user;
  }
}
