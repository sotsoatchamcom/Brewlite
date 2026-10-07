import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// Mọi trường đều optional, vẫn giữ nguyên validate + transform (kể cả sizes) của CreateProductDto
export class UpdateProductDto extends PartialType(CreateProductDto) {}
