import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateToppingDto } from './create-topping.dto';


export class UpdateToppingDto extends PartialType(
  OmitType(CreateToppingDto, ['isAvailable'] as const),
) {}
