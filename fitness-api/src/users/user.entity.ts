import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../access/access.entities';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  name: string;

  @Column({ type: 'float', nullable: true })
  heightCm: number | null;

  @Column({ type: 'float', nullable: true })
  goalWeightKg: number | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @ManyToMany(() => Role, (r) => r.users)
  @JoinTable({ name: 'user_roles', joinColumn: { name: 'userId' }, inverseJoinColumn: { name: 'roleId' } })
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;
}
