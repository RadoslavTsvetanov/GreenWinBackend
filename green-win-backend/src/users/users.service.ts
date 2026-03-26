import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async createWithPassword(userData: {
    email: string;
    password: string;
    name?: string;
    organization?: Organization | null;
  }): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    const user = this.usersRepository.create({
      email: userData.email,
      passwordHash: hashedPassword,
      name: userData.name,
      organization: userData.organization ?? null,
    });
    return this.usersRepository.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (dto.organizationId !== undefined) {
      if (dto.organizationId) {
        const organization = await this.organizationsRepository.findOne({
          where: { id: dto.organizationId },
        });
        if (!organization) {
          throw new NotFoundException(`Organization with ID ${dto.organizationId} not found`);
        }
        user.organization = organization;
      } else {
        user.organization = null;
      }
    }

    const { organizationId, ...rest } = dto;
    Object.assign(user, rest);

    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
