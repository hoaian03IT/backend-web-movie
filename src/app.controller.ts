import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  UseFilters,
} from '@nestjs/common';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './http-exception';

@UseFilters(new HttpExceptionFilter())
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
}
