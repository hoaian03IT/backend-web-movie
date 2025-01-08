import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/schemas/user.schema';
import { CreateAuthDto } from './dto/create-auth.dto';

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async createNewUser(body: CreateAuthDto): Promise<User> {
    const existedUser = await this.userModel.exists({ email: body.email });

    if (existedUser) {
      throw new HttpException('User already exists', HttpStatus.NOT_ACCEPTABLE);
    }

    const user = new this.userModel({
      email: body.email,
      password: body.password,
      is_active: body.isActive,
    });

    return await user.save();
  }
}
