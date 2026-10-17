import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;
}
