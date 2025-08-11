import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterWithTopicsDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password (minimum 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'User first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'User profile picture URL' })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({ description: 'User bio/description' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ description: 'User role (defaults to USER)' })
  @IsOptional()
  @IsEnum(['USER', 'LISTENER', 'ADMIN'])
  role?: 'USER' | 'LISTENER' | 'ADMIN';

  @ApiProperty({
    description: 'Array of topic IDs (minimum 3, maximum 5)',
    example: ['topic-id-1', 'topic-id-2', 'topic-id-3'],
    minItems: 3,
    maxItems: 5,
  })
  @IsArray({ message: 'Topic IDs must be an array' })
  @ArrayMinSize(3, { message: 'You must select at least 3 topics' })
  @ArrayMaxSize(5, { message: 'You can select at most 5 topics' })
  @IsUUID('4', { each: true, message: 'Each topic ID must be a valid UUID' })
  topicIds: string[];
}
