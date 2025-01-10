import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop()
  name: string;

  @Prop({ required: true, min: 5, max: 50, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: false, required: true })
  is_verified: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
