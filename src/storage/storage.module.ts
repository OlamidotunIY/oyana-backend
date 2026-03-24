import { Module } from '@nestjs/common';
import { GoogleStorageService } from './google-storage.service';

@Module({
  providers: [GoogleStorageService],
  exports: [GoogleStorageService],
})
export class StorageModule {}
