import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): void {
    try {
      throw new HttpException('Not allowed', HttpStatus.METHOD_NOT_ALLOWED);
    } catch (error) {
      if (!(error instanceof InternalServerErrorException)) throw error;
      else
        throw new HttpException(
          'Internal Server Error',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
  }
}
