import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.payment.findMany();
  }

  findOne(id: number) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  create(createPaymentDto: any) {
    return 'This action adds a new payment';
  }
  update(id: number, updatePaymentDto: any) {
    return `This action updates a #${id} payment`;
  }
  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
