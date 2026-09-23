import { IsNotEmpty, IsString } from 'class-validator';

export class AddSignatureDto {
  @IsString()
  @IsNotEmpty()
  signerType: string;

  @IsString()
  @IsNotEmpty()
  signerId: string;

  @IsString()
  @IsNotEmpty()
  signerName: string;

  @IsString()
  @IsNotEmpty()
  signatureData: string;
}
