import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreDto, UpdateStoreDto, StoreQueryDto } from './dto/store.dto';
;

@Injectable()
export class StoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: StoreQueryDto, currentUser: any) {
    const { page = 1, limit = 50, search, ownerId } = query;
    const skip = (page - 1) * Number(limit);

    const where: any = { isActive: true };

    // STORE_OWNER only sees their own stores
    if (currentUser.role === 'STORE_OWNER') {
      where.ownerId = currentUser.id;
    } else if (ownerId) {
      where.ownerId = ownerId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.store.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { code: 'asc' },
        include: {
          owner: {
            select: { id: true, fullName: true, phone: true, email: true },
          },
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async findOne(id: string, currentUser: any) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, fullName: true, phone: true, email: true },
        },
      },
    });

    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng');

    if (currentUser.role === 'STORE_OWNER' && store.ownerId !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền xem cửa hàng này');
    }

    return store;
  }

  async create(createStoreDto: CreateStoreDto) {
    const existing = await this.prisma.store.findUnique({
      where: { code: createStoreDto.code },
    });
    if (existing) {
      throw new ConflictException(`Mã cửa hàng ${createStoreDto.code} đã tồn tại`);
    }

    const owner = await this.prisma.user.findUnique({
      where: { id: createStoreDto.ownerId },
    });
    if (!owner) throw new NotFoundException('Không tìm thấy chủ cửa hàng');

    return this.prisma.store.create({
      data: createStoreDto,
      include: {
        owner: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });
  }

  async update(id: string, updateStoreDto: UpdateStoreDto) {
    const store = await this.prisma.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Không tìm thấy cửa hàng');

    return this.prisma.store.update({
      where: { id },
      data: updateStoreDto,
      include: {
        owner: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });
  }
}
