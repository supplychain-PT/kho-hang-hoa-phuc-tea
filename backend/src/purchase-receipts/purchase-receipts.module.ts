import { Module } from '@nestjs/common';
import { PurchaseReceiptsService } from './purchase-receipts.service';
import { PurchaseReceiptsController } from './purchase-receipts.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PurchaseReceiptsController],
  providers: [PurchaseReceiptsService],
})
export class PurchaseReceiptsModule {}
