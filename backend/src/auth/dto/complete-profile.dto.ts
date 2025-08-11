import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteProfileDto {
  @ApiPropertyOptional({ description: 'User bio/description' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({
    description: 'User profile picture URL',
    example: 'https://example.com/profile.jpg',
  })
  @IsOptional()
  @IsString()
  profilePicture?: string;

  @ApiProperty({
    description: 'Array of topic IDs (minimum 3, maximum 5)',
    example: ['topic-id-1', 'topic-id-2', 'topic-id-3'],
    minItems: 3,
    maxItems: 5,
  })
  @IsArray()
  @ArrayMinSize(3, { message: 'You must select at least 3 topics' })
  @ArrayMaxSize(5, { message: 'You can select at most 5 topics' })
  @IsUUID('4', { each: true, message: 'Each topic ID must be a valid UUID' })
  topicIds: string[];
}
