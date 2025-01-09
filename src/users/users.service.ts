import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

const saltRounds = 10;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}
  async createNewUser(body: CreateUserDto): Promise<User> {
    const existedUser = await this.userModel.exists({ email: body.email });

    if (existedUser) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(body.password, saltRounds);

    const user = new this.userModel({
      email: body.email,
      password: hashedPassword,
      is_active: body.isActive,
    });

    return await user.save();
  }
}
